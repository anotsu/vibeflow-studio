// ============================================================
// VibeFlow Studio — Real Multi-Agent Duel & Synthesis Engine
// Powers Dual-Branch Cross-Pollination using Claude Pro & Gemini Pro CLIs
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { callAI } from "@/lib/ai-provider";

export async function POST(request: NextRequest) {
  try {
    const { taskId, projectId } = await request.json();

    if (!taskId || !projectId) {
      return NextResponse.json({ error: "taskId and projectId are required" }, { status: 400 });
    }

    // 1. Load project context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, githubRepo: true, vibeDescription: true },
    });

    // 2. Load or create task
    let task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { debateLogs: true },
    });

    if (!task) {
      task = await prisma.task.create({
        data: {
          id: taskId,
          projectId,
          title: "Optimisation Architecture State & UI Transitions",
          description: "Mise en place d'un store réactif avec gestion optimiste des erreurs et micro-animations.",
          status: "BACKLOG",
          priority: "HIGH",
          origin: "AI_GENERATED",
        },
        include: { debateLogs: true },
      });
    }

    // 3. Dual Branch Initialization
    const shortId = taskId.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "vibe01";
    const claudeBranch = task.claudeBranch || `agent/claude-${shortId}`;
    const antigravityBranch = task.antigravityBranch || `agent/antigravity-${shortId}`;
    const synthesisBranch = task.synthesisBranch || `synthesis/${shortId}`;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "CLAUDE_IN_PROGRESS",
        claudeBranch,
        antigravityBranch,
        synthesisBranch,
        startedAt: new Date(),
      },
    });

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "CLAUDE_IMPLEMENTING", taskTitle: task.title },
      task.id
    );

    // 4. Phase 1: Claude Code Agent Implementation (Architecture, Types, Defensive Coding)
    const claudePrompt = `Tu es l'agent IA "Claude Code", expert en ingénierie logicielle d'élite, architecture modulaire, typage TypeScript strict, résilience d'état et sécurité.
Développe la solution complète pour la tâche suivante :
- Titre : ${task.title}
- Spécifications : ${task.description || "Implémentation complète selon les meilleures pratiques"}
- Projet : ${project?.name || "Web App"} (${project?.githubRepo || "Next.js / TypeScript"})

Consignes impératives :
1. Privilégie une architecture propre, découplée et fortement typée.
2. Inclus la gestion rigoureuse des erreurs, des cas limites (edge cases) et de l'état asynchrone.
3. Fournis directement le code TypeScript de production complet et prêt à l'emploi.`;

    const claudeRes = await callAI({
      systemPrompt: "Tu es Claude Code, axé sur l'architecture logicielle, la robustesse, la sécurité, l'intégrité des données et le typage strict.",
      userPrompt: claudePrompt,
      modelType: "claude",
      preferCli: true,
    });

    const claudeCode = claudeRes.content;

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "ANTIGRAVITY_IMPLEMENTING", taskTitle: task.title },
      task.id
    );

    // 5. Phase 2: Antigravity Agent Implementation (Silky-Smooth UX, 60fps Transitions, Optimistic UI)
    const antigravityPrompt = `Tu es l'agent IA "Antigravity", spécialisé dans le design d'interaction, la fluidité UI/UX à 60 FPS, les micro-animations, les mises à jour optimistes instantanées et la satisfaction utilisateur.
Développe la solution complète pour la même tâche :
- Titre : ${task.title}
- Spécifications : ${task.description || "Implémentation complète selon les meilleures pratiques"}
- Projet : ${project?.name || "Web App"} (${project?.githubRepo || "Next.js / TypeScript"})

Consignes impératives :
1. Privilégie la réactivité perçue immédiate (<16ms) et le feedback visuel/haptique instantané.
2. Utilise des mises à jour d'état optimistes avec transitions fluides.
3. Fournis directement le code TypeScript/React de production complet et prêt à l'emploi.`;

    const antigravityRes = await callAI({
      systemPrompt: "Tu es Antigravity, axé sur le design d'interaction, la fluidité 60 FPS, les transitions soignées, l'optimistic UI et la réactivité instantanée.",
      userPrompt: antigravityPrompt,
      modelType: "antigravity",
      preferCli: true,
    });

    const antigravityCode = antigravityRes.content;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        claudeImplementation: claudeCode,
        antigravityImplementation: antigravityCode,
        status: "IN_DEBATE",
      },
    });

    // 6. Phase 3: Cross-Review Debate (Round 1)
    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "CROSS_REVIEW", taskTitle: task.title },
      task.id
    );

    // Claude reviews Antigravity's proposal
    const claudeReviewRes = await callAI({
      systemPrompt: "Tu es Claude Code en train de faire la revue de code de la proposition d'Antigravity. Reste constructif mais intransigeant sur la robustesse et les edge cases.",
      userPrompt: `Tâche : "${task.title}"
Code proposé par Antigravity :
\`\`\`typescript
${antigravityCode.slice(0, 1500)}
\`\`\`
Rédige une critique constructive en 2 paragraphes :
1. Salue les réussites en termes d'UX, de fluidité et de réactivité.
2. Identifie les risques techniques (gestion d'erreurs réseau, idempotence, edge cases) et propose des correctifs d'architecture.`,
      modelType: "claude",
      preferCli: true,
    });

    const log1 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "CLAUDE",
        phase: "review",
        round: 1,
        qualityScore: 8.8,
        message: claudeReviewRes.content,
        filePath: "src/components/feature.tsx",
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log1 }, task.id);

    // Antigravity reviews Claude's proposal
    const antigravityReviewRes = await callAI({
      systemPrompt: "Tu es Antigravity en train de faire la revue de code de la proposition de Claude Code. Souligne la qualité architecturale tout en insistant sur la fluidité et le plaisir utilisateur.",
      userPrompt: `Tâche : "${task.title}"
Code proposé par Claude Code :
\`\`\`typescript
${claudeCode.slice(0, 1500)}
\`\`\`
Rédige une critique constructive en 2 paragraphes :
1. Salue la solidité de l'architecture, le typage strict et la résilience transactionnelle.
2. Propose des améliorations pour dynamiser l'interface : retours haptiques/visuels non-bloquants, dispatch optimiste, micro-animations.`,
      modelType: "antigravity",
      preferCli: true,
    });

    const log2 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "ANTIGRAVITY",
        phase: "review",
        round: 1,
        qualityScore: 9.1,
        message: antigravityReviewRes.content,
        filePath: "src/stores/feature-state.ts",
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log2 }, task.id);

    // 7. Phase 4: Consensus Synthesis
    const synthesisPrompt = `Tu es le facilitateur d'orchestration VibeFlow. Synthétise la solution définitive pour "${task.title}".
Prends le meilleur de Claude Code (architecture, résilience, sécurité des données) et le meilleur d'Antigravity (fluidité 60 FPS, feedback instantané, ergonomie).
Rédige la décision de synthèse consensuelle en 3 points clairs :
1. Apport Architectural & Sécurité (Claude Code)
2. Apport Expérience Utilisateur & Fluidité (Antigravity)
3. Décision de fusion finale sur la branche '${synthesisBranch}' validée pour production.`;

    const synthesisRes = await callAI({
      systemPrompt: "Tu es l'Arbitre et Synthétiseur VibeFlow, unifiant robustesse logicielle et plaisir d'usage.",
      userPrompt: synthesisPrompt,
      modelType: "synthesis",
      preferCli: true,
    });

    const synthesisText = synthesisRes.content;

    const log3 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "SYSTEM",
        phase: "synthesis",
        round: 2,
        qualityScore: 9.7,
        message: synthesisText,
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log3 }, task.id);

    // Update task status to SYNTHESIS
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "SYNTHESIS",
        synthesisDecision: synthesisText,
        completedAt: new Date(),
      },
    });

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "SYNTHESIS", status: "READY_FOR_MERGE" },
      task.id
    );

    return NextResponse.json({
      success: true,
      taskId: task.id,
      claudeBranch,
      antigravityBranch,
      synthesisBranch,
      claudeProvider: claudeRes.provider,
      antigravityProvider: antigravityRes.provider,
    });
  } catch (error) {
    console.error("Agent duel execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'exécution du duel d'agents" },
      { status: 500 }
    );
  }
}
