// ============================================================
// VibeFlow Studio — Daemon Trigger Route: /api/daemon/tick
// Heartbeat endpoint for continuous 24/7 autonomous optimization
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runAutonomousDaemonTick } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let projectId: string | undefined;
    try {
      const body = await request.json();
      projectId = body?.projectId;
    } catch {
      // Body is optional
    }

    const result = await runAutonomousDaemonTick(projectId);

    return NextResponse.json({
      success: true,
      message: `Daemon tick executed for ${result.projectsChecked} project(s)`,
      result,
    });
  } catch (error: any) {
    console.error("[POST /api/daemon/tick] Error:", error);
    return NextResponse.json(
      { error: "Daemon tick execution failed", details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await runAutonomousDaemonTick();
    return NextResponse.json({
      success: true,
      message: `Daemon tick executed for ${result.projectsChecked} project(s)`,
      result,
    });
  } catch (error: any) {
    console.error("[GET /api/daemon/tick] Error:", error);
    return NextResponse.json(
      { error: "Daemon tick execution failed", details: error?.message },
      { status: 500 }
    );
  }
}
