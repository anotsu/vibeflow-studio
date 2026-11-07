// ============================================================
// VibeFlow Studio — API Route: Mobile Preview Tunnel
// POST /api/preview/[taskId]/tunnel -> Generate instant mobile QR code link
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateMobileTunnel } from "@/lib/tunnel-manager";
import { AgentWorktreeRole } from "@/lib/preview-orchestrator";

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const role = (body?.role || "claude") as AgentWorktreeRole;

    const tunnel = await getOrCreateMobileTunnel(taskId, role);

    return NextResponse.json({
      success: true,
      tunnel,
    });
  } catch (error: any) {
    console.error("[POST /api/preview/[taskId]/tunnel] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Échec de génération du tunnel mobile" },
      { status: 500 }
    );
  }
}
