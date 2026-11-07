// ============================================================
// VibeFlow Studio — Project Docs & Architecture Generator API
// POST /api/projects/[id]/generate-docs
// Compiles OpenAPI specifications and Mermaid ER diagrams,
// then pushes them live into Obsidian (07_API_Specs/).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateProjectTechnicalDocumentation } from "@/lib/api-docs-generator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await generateProjectTechnicalDocumentation(id);

    return NextResponse.json({
      success: true,
      message: `Documentation technique et diagrammes générés (${result.endpointsCount} endpoints, ${result.modelsCount} modèles).`,
      result,
    });
  } catch (error: any) {
    console.error("Documentation generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate technical documentation" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await generateProjectTechnicalDocumentation(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to inspect documentation" },
      { status: 500 }
    );
  }
}
