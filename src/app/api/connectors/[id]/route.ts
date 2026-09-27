import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const connector = await prisma.apiConnector.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!connector) {
      return NextResponse.json(
        { success: false, error: "Connector not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: connector });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch connector" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const existing = await prisma.apiConnector.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Connector not found" },
        { status: 404 }
      );
    }

    const {
      name,
      slug,
      description,
      provider,
      model,
      systemPrompt,
      inputParameters,
      outputSchema,
      apiKey,
      isActive,
    } = body;

    let cleanSlug = existing.slug;
    if (slug && slug !== existing.slug) {
      cleanSlug = String(slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-");

      const slugInUse = await prisma.apiConnector.findFirst({
        where: { slug: cleanSlug, NOT: { id } },
      });
      if (slugInUse) {
        return NextResponse.json(
          { success: false, error: `Slug "${cleanSlug}" is already in use by another connector.` },
          { status: 409 }
        );
      }
    }

    let serializedParams = existing.inputParameters;
    if (inputParameters !== undefined) {
      if (typeof inputParameters === "string") {
        serializedParams = inputParameters;
      } else {
        serializedParams = JSON.stringify(inputParameters);
      }
    }

    let serializedSchema = existing.outputSchema;
    if (outputSchema !== undefined) {
      if (typeof outputSchema === "string") {
        serializedSchema = outputSchema;
      } else {
        serializedSchema = JSON.stringify(outputSchema);
      }
    }

    const updated = await prisma.apiConnector.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: cleanSlug,
        description: description !== undefined ? description : existing.description,
        provider: provider !== undefined ? String(provider).toLowerCase() : existing.provider,
        model: model !== undefined ? model : existing.model,
        systemPrompt: systemPrompt !== undefined ? systemPrompt : existing.systemPrompt,
        inputParameters: serializedParams,
        outputSchema: serializedSchema,
        apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update connector" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const existing = await prisma.apiConnector.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Connector not found" },
        { status: 404 }
      );
    }

    await prisma.apiConnector.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Connector deleted successfully" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete connector" },
      { status: 500 }
    );
  }
}
