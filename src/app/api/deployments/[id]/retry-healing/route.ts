// ============================================================
// VibeFlow Studio — API Route: Trigger Self-Healing on Deployment
// POST /api/deployments/[id]/retry-healing
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { triggerSelfHealing } from "@/lib/self-healing";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await triggerSelfHealing(id);

    return NextResponse.json({
      success: true,
      selfHealing: result,
    });
  } catch (error: any) {
    console.error("[POST /api/deployments/[id]/retry-healing] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur déclenchement self-healing" },
      { status: 500 }
    );
  }
}
