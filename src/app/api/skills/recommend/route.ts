// ============================================================
// VibeFlow Studio — Project Skills Recommendation API
// POST /api/skills/recommend
// Analyzes project framing context and recommends tailored skills
// from the SkillsMP marketplace (skillsmp.com).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { recommendSkillsForProject } from "@/lib/skillsmp-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const recommendations = recommendSkillsForProject(body);

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to recommend skills" },
      { status: 500 }
    );
  }
}
