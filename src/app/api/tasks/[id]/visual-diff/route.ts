// ============================================================
// VibeFlow Studio — API Route: /api/tasks/[id]/visual-diff
// Executes Multimodal AI Vision Review & Pixel Diff
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { executeMultimodalVisualReview } from "@/lib/vision-reviewer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await executeMultimodalVisualReview(id);
    return NextResponse.json(review);
  } catch (err: any) {
    console.error("[VisualDiff API] Error running visual review:", err);
    return NextResponse.json(
      { error: err.message || "Échec de l'analyse visuelle multimodale" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await executeMultimodalVisualReview(id);
    return NextResponse.json({
      success: true,
      message: "Analyse visuelle et Pixel Diff calculés avec succès.",
      review,
    });
  } catch (err: any) {
    console.error("[VisualDiff API] Error triggering visual review:", err);
    return NextResponse.json(
      { error: err.message || "Échec du calcul du Pixel Diff" },
      { status: 500 }
    );
  }
}
