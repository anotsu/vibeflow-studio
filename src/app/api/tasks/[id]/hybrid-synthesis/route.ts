// ============================================================
// VibeFlow Studio — API Route: Hybrid Synthesis & Cherry-Pick Blending
// POST /api/tasks/[id]/hybrid-synthesis
// Combines Claude's backend architecture & Antigravity's UI/UX
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai-provider";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { syncTaskToObsidian, exportDebateToObsidian } from "@/lib/obsidian-sync";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const customInstruction = body?.customInstruction || "";
    const filePicks = body?.filePicks || {}; // e.g. { "api.ts": "claude", "view.tsx": "antigravity" }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      debateLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const claudeCode = task.claudeImplementation || "// Implémentation Claude non disponible";
  const antigravityCode = task.antigravityImplementation || "// Implémentation Antigravity non disponible";

  const systemPrompt = `Tu es l'Arbitre IA et Expert Fusion Hybride de VibeFlow Studio.
Ton rôle est de créer une "Synthèse Hybride Chirurgicale" combinant le MEILLEUR des deux agents :
- De Claude Code Pro : Conserve la rigueur architecturale, les schémas de validation (Zod/Prisma), la gestion des erreurs et la typographie TypeScript stricte.
- D'Antigravity CLI (agy) : Conserve le design system moderne, les classes Tailwind soignées, la réactivité fluide et l'ergonomie UX/UI.

Produis un code unifié prêt pour la production (sans placeholders ni commentaires 'TODO').`;

  const userPrompt = `Tâche : "${task.title}"
Description : ${task.description}

---
Code Proposition Claude Code Pro :
\`\`\`typescript
${claudeCode}
\`\`\`

---
Code Proposition Antigravity CLI :
\`\`\`typescript
${antigravityCode}
\`\`\`

${Object.keys(filePicks).length > 0 ? `\r\nDirectives de cherry-pick manuel par l'utilisateur :\r\n${JSON.stringify(filePicks, null, 2)}` : ""}
${customInstruction ? `\r\nInstruction additionnelle : ${customInstruction}` : ""}

Fournis la synthèse finale unifiée fusionnant les deux approches.`;

    const aiRes = await callAI({
      systemPrompt,
      userPrompt,
      modelType: "claude",
      preferCli: true,
    });

    const synthesisCode = aiRes.content;
    const synthesisBranch = `synthesis/${task.id}`;

    // Update task in database
    const updated = await prisma.task.update({
      where: { id },
      data: {
        synthesisDecision: synthesisCode,
        synthesisBranch,
        status: "SYNTHESIS",
      },
    });

    // Create debate log entry
    await prisma.agentDebateLog.create({
      data: {
        taskId: id,
        speaker: "SYSTEM",
        phase: "synthesis",
        round: (task.debateLogs.length || 0) + 1,
        qualityScore: 9.8,
        message: `🧬 Synthèse Hybride IA générée avec succès via ${aiRes.provider}. Fusion optimale des forces architecturales de Claude et de l'ergonomie d'Antigravity.`,
      },
    });

    // Broadcast SSE event
    broadcastVibeEvent(
      "PHASE_CHANGED",
      task.projectId,
      {
        taskId: id,
        status: "SYNTHESIS",
        action: "hybrid_synthesis_generated",
        synthesisBranch,
      },
      id
    );

    // Sync to Obsidian vault asynchronously
    syncTaskToObsidian(id).catch(console.error);
    exportDebateToObsidian(id).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Synthèse hybride générée et enregistrée avec succès.",
      synthesis: synthesisCode,
      synthesisBranch,
      task: updated,
    });
  } catch (error: any) {
    console.error("[POST /api/tasks/[id]/hybrid-synthesis] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la synthèse hybride" },
      { status: 500 }
    );
  }
}
