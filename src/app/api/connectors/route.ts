import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  try {
    const connectors = await prisma.apiConnector.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { logs: true },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const data = connectors.map((c) => ({
      ...c,
      totalRequests: c._count.logs,
      lastUsedAt: c.logs[0]?.createdAt || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch connectors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      description = "",
      provider,
      model,
      systemPrompt,
      inputParameters,
      outputSchema,
      apiKey,
      isActive = true,
    } = body;

    if (!name || !slug || !provider || !model || !systemPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, slug, provider, model, systemPrompt are required.",
        },
        { status: 400 }
      );
    }

    // Clean and validate slug
    const cleanSlug = String(slug)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-");

    // Check unique slug
    const existing = await prisma.apiConnector.findUnique({
      where: { slug: cleanSlug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Slug "${cleanSlug}" is already in use.` },
        { status: 409 }
      );
    }

    // Serialize parameters and schema
    let serializedParams = "[]";
    if (typeof inputParameters === "string") {
      try {
        JSON.parse(inputParameters);
        serializedParams = inputParameters;
      } catch {
        serializedParams = JSON.stringify([]);
      }
    } else if (Array.isArray(inputParameters)) {
      serializedParams = JSON.stringify(inputParameters);
    }

    let serializedSchema = "{}";
    if (typeof outputSchema === "string") {
      try {
        JSON.parse(outputSchema);
        serializedSchema = outputSchema;
      } catch {
        serializedSchema = JSON.stringify({ response: "string" });
      }
    } else if (typeof outputSchema === "object" && outputSchema !== null) {
      serializedSchema = JSON.stringify(outputSchema);
    }

    // Generate API key if not provided
    const key =
      apiKey && String(apiKey).trim().length > 0
        ? String(apiKey).trim()
        : `uapi_${crypto.randomUUID().replace(/-/g, "")}`;

    const newConnector = await prisma.apiConnector.create({
      data: {
        name,
        slug: cleanSlug,
        description,
        provider: String(provider).toLowerCase(),
        model,
        systemPrompt,
        inputParameters: serializedParams,
        outputSchema: serializedSchema,
        apiKey: key,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({ success: true, data: newConnector }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create connector" },
      { status: 500 }
    );
  }
}
