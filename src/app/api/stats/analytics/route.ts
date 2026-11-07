// ============================================================
// VibeFlow Studio — API Route: Team Velocity & ROI Analytics
// GET /api/stats/analytics?projectId=...
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getTeamAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const data = await getTeamAnalytics(projectId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[GET /api/stats/analytics] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Échec du calcul des métriques de vélocité" },
      { status: 500 }
    );
  }
}
