import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AdapterFactory } from "@/lib/adapters";
import { calculateEstimatedCost } from "@/lib/pricing";
import { InputParameter } from "@/lib/types";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const startTime = performance.now();
  const { slug } = await props.params;

  // 1. Fetch connector by slug
  const connector = await prisma.apiConnector.findUnique({
    where: { slug },
  });

  if (!connector) {
    return NextResponse.json(
      { success: false, data: null, error: `Connector with slug "${slug}" not found` },
      { status: 404 }
    );
  }

  // Check if disabled
  if (!connector.isActive) {
    return NextResponse.json(
      { success: false, data: null, error: `Connector "${connector.name}" is currently disabled` },
      { status: 403 }
    );
  }

  // 2. Validate Authorization header
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;

  if (!bearerToken || bearerToken !== connector.apiKey) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized: Invalid or missing Bearer API key" },
      { status: 401 }
    );
  }

  // 3. Parse request body
  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  // 4. Parse input parameters and validate required fields
  let inputParameters: InputParameter[] = [];
  try {
    inputParameters = JSON.parse(connector.inputParameters || "[]");
  } catch {
    inputParameters = [];
  }

  const missingRequired = inputParameters
    .filter((param) => param.required)
    .filter((param) => {
      const val = body[param.name];
      return val === undefined || val === null || val === "";
    })
    .map((p) => p.name);

  if (missingRequired.length > 0) {
    const errorMsg = `Missing required parameter(s): ${missingRequired.join(", ")}`;
    const responseTimeMs = Math.round(performance.now() - startTime);

    await prisma.apiRequestLog.create({
      data: {
        connectorId: connector.id,
        status: "FAILED",
        statusCode: 400,
        responseTimeMs,
        errorMessage: errorMsg,
        requestPayload: JSON.stringify(body),
        responsePayload: null,
      },
    });

    return NextResponse.json(
      { success: false, data: null, error: errorMsg },
      { status: 400 }
    );
  }

  // 5. Parse output schema
  let outputSchema: any;
  try {
    outputSchema =
      typeof connector.outputSchema === "string"
        ? JSON.parse(connector.outputSchema)
        : connector.outputSchema;
  } catch {
    outputSchema = connector.outputSchema;
  }

  // 6. Execute AI Adapter call
  try {
    const adapter = AdapterFactory.getAdapter(connector.provider);
    const result = await adapter.execute(
      {
        systemPrompt: connector.systemPrompt,
        inputParameters,
        outputSchema,
        userValues: body,
        modelName: connector.model,
      },
      connector.model
    );

    const responseTimeMs = Math.round(performance.now() - startTime);
    const estimatedCost = calculateEstimatedCost(
      connector.model,
      result.promptTokens,
      result.completionTokens
    );

    // Save success log
    await prisma.apiRequestLog.create({
      data: {
        connectorId: connector.id,
        status: "SUCCESS",
        statusCode: 200,
        responseTimeMs,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        estimatedCost,
        errorMessage: null,
        requestPayload: JSON.stringify(body),
        responsePayload: JSON.stringify(result.data),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    const errorMessage = err?.message || "Execution error encountered";

    // Save failed log
    await prisma.apiRequestLog.create({
      data: {
        connectorId: connector.id,
        status: "FAILED",
        statusCode: 500,
        responseTimeMs,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        estimatedCost: null,
        errorMessage,
        requestPayload: JSON.stringify(body),
        responsePayload: null,
      },
    });

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
