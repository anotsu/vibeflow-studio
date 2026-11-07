// ============================================================
// VibeFlow Studio — SkillsMP API Route
// GET /api/skills/skillsmp -> Search & list marketplace skills
// POST /api/skills/skillsmp -> Install a skill for a project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { searchSkillsMp, installSkillMpToProject } from "@/lib/skillsmp-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await searchSkillsMp({ query, category, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to search SkillsMP" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillId, projectId } = body;

    if (!skillId) {
      return NextResponse.json({ error: "skillId is required" }, { status: 400 });
    }

    const result = await installSkillMpToProject(skillId, projectId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to install skill" },
      { status: 500 }
    );
  }
}
