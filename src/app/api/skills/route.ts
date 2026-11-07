// ============================================================
// VibeFlow Studio — Custom Skills & Personas API
// GET /api/skills -> lists skills & personas
// POST /api/skills -> toggles a skill or updates an agent's persona
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getAllSkills,
  toggleSkill,
  getCurrentPersonas,
  setAgentPersona,
  AVAILABLE_PERSONAS,
} from "@/lib/agent-skills";

export async function GET() {
  const skills = getAllSkills();
  const currentPersonas = getCurrentPersonas();

  return NextResponse.json({
    skills,
    currentPersonas,
    availablePersonas: AVAILABLE_PERSONAS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, skillId, enabled, agent, personaId } = body;

    if (action === "toggle_skill" && skillId) {
      const updated = toggleSkill(skillId, Boolean(enabled));
      return NextResponse.json({ success: true, skill: updated });
    }

    if (action === "set_persona" && agent && personaId) {
      const updated = setAgentPersona(agent, personaId);
      return NextResponse.json({ success: true, persona: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update skills/personas" },
      { status: 500 }
    );
  }
}
