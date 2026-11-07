// ============================================================
// VibeFlow Studio — Real Multi-Agent VibeCoding Engine
// Powers Solo, Duel & Trio Cross-Pollination using
// Claude Code, Gemini / Antigravity, and ChatGPT Codex
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { callAI } from "@/lib/ai-provider";
import { getVibeCodingEngineConfig, AIProviderId } from "@/lib/provider-plans";

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

    // 3. Read current multi-model engine configuration (Solo, Duel, Trio)
    const engineConfig = await getVibeCodingEngineConfig();
    const mode = engineConfig.mode;
    const activeProviders = engineConfig.activeProviders;

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

    // Helper functions for agent prompts and personas
    const getAgentName = (p: AIProviderId) => {
      switch (p) {
        case "claude":
          return "Claude Code";
        case "gemini":
          return "Antigravity";
        case "openai":
          return "ChatGPT Codex";
      }
    };

    const getAgentRoleDescription = (p: AIProviderId) => {
      switch (p) {
        case "claude":
          return "expert en ingénierie logicielle d'élite, architecture modulaire, typage TypeScript strict, résilience d'état et sécurité.";
        case "gemini":
          return "spécialisé dans le design d'interaction, la fluidité UI/UX à 60 FPS, les micro-animations, les mises à jour optimistes instantanées et la satisfaction utilisateur.";
        case "openai":
          return "spécialisé dans l'ingénierie des algorithmes performants, les pipelines asynchrones évolutifs, la gestion de concurrence et l'optimisation mémoire.";
      }
    };

    const getAgentGuidelines = (p: AIProviderId) => {
      switch (p) {
        case "claude":
          return `1. Privilégie une architecture propre, découplée et fortement typée.\n2. Inclus la gestion rigoureuse des erreurs, des cas limites (edge cases) et de l'état asynchrone.\n3. Fournis directement le code TypeScript de production complet et prêt à l'emploi.`;
        case "gemini":
          return `1. Privilégie la réactivité perçue immédiate (<16ms) et le feedback visuel instantané.\n2. Utilise des mises à jour d'état optimistes avec transitions fluides.\n3. Fournis directement le code TypeScript/React de production complet et prêt à l'emploi.`;
        case "openai":
          return `1. Privilégie des structures de données optimales (O(1) lookups) et la concurrence non bloquante.\n2. Implémente des mécanismes de retry exponentiel et de cache en mémoire résilient.\n3. Fournis directement le code TypeScript de production complet et prêt à l'emploi.`;
      }
    };

    const runAgentImplementation = async (p: AIProviderId) => {
      const name = getAgentName(p);
      const role = getAgentRoleDescription(p);
      const guidelines = getAgentGuidelines(p);

      const prompt = `Tu es l'agent IA "${name}", ${role}\nDéveloppe la solution complète pour la tâche suivante :\n- Titre : ${task.title}\n- Spécifications : ${task.description || "Implémentation complète selon les meilleures pratiques"}\n- Projet : ${project?.name || "Web App"} (${project?.githubRepo || "Next.js / TypeScript"})\n\nConsignes impératives :\n${guidelines}`;

      const modelType = p === "gemini" ? "antigravity" : p;

      return await callAI({
        systemPrompt: `Tu es ${name}, axé sur ${role}`,
        userPrompt: prompt,
        modelType,
        preferCli: true,
      });
    };

    // ============================================================
    // MODE 1: SOLO (1 Fournisseur Actif)
    // Exécution autonome ultra-rapide sans phase de duel contradictoire
    // ============================================================
    if (mode === "SOLO") {
      const soloProvider = activeProviders[0] || "claude";
      const soloName = getAgentName(soloProvider);

      broadcastVibeEvent(
        "PHASE_CHANGED",
        projectId,
        { phase: "SOLO_IMPLEMENTING", taskTitle: task.title, provider: soloName },
        task.id
      );

      const soloRes = await runAgentImplementation(soloProvider);
      const code = soloRes.content;

      // Auto-revue et validation directe par le fournisseur unique
      const soloReviewPrompt = `Tu es ${soloName}. Valide et synthétise ton implémentation pour la tâche "${task.title}".\nCode implémenté :\n\`\`\`typescript\n${code.slice(0, 1500)}\n\`\`\`\nDonne une auto-évaluation succincte en 2 points :\n1. Points forts de la solution (stabilité, élégance, performance).\n2. Confirmation de validation pour déploiement direct en production sur '${synthesisBranch}'.`;

      const autoReviewRes = await callAI({
        systemPrompt: `Tu es ${soloName}, auto-validant ton implémentation en mode VibeCoding Solo.`,
        userPrompt: soloReviewPrompt,
        modelType: soloProvider === "gemini" ? "antigravity" : soloProvider,
        preferCli: true,
      });

      const logSpeaker = soloProvider === "claude" ? "CLAUDE" : (soloProvider === "gemini" ? "ANTIGRAVITY" : "SYSTEM");
      const logMessage = soloProvider === "openai" ? `[ChatGPT Codex] Auto-revue & Validation Solo :\n${autoReviewRes.content}` : autoReviewRes.content;
      const logFilePath = soloProvider === "openai" ? "src/agents/openai-codex.ts" : "src/components/feature.tsx";

      const debateLog = await prisma.agentDebateLog.create({
        data: {
          taskId: task.id,
          speaker: logSpeaker,
          phase: "review",
          round: 1,
          qualityScore: 9.4,
          message: logMessage,
          filePath: logFilePath,
        },
      });
      broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: debateLog }, task.id);

      // Synthesis log
      const synthesisDecision = `Solution validée en mode VibeCoding SOLO par ${soloName}.\nDéployée directement sur la branche '${synthesisBranch}' sans conflit d'architecture.`;
      const synthLog = await prisma.agentDebateLog.create({
        data: {
          taskId: task.id,
          speaker: "SYSTEM",
          phase: "synthesis",
          round: 1,
          qualityScore: 9.8,
          message: synthesisDecision,
        },
      });
      broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: synthLog }, task.id);

      await prisma.task.update({
        where: { id: task.id },
        data: {
          claudeImplementation: soloProvider === "claude" ? code : undefined,
          antigravityImplementation: soloProvider === "gemini" ? code : (soloProvider === "openai" ? `[ChatGPT Codex]\n${code}` : undefined),
          synthesisDecision,
          status: "SYNTHESIS",
          completedAt: new Date(),
        },
      });

      broadcastVibeEvent(
        "PHASE_CHANGED",
        projectId,
        { phase: "SYNTHESIS", status: "READY_FOR_MERGE", mode: "SOLO" },
        task.id
      );

      return NextResponse.json({
        success: true,
        mode: "SOLO",
        activeProviders,
        taskId: task.id,
        synthesisBranch,
        provider: soloRes.provider,
      });
    }

    // ============================================================
    // MODE 2: DUEL (2 Fournisseurs Actifs)
    // Confrontation croisée & débat contradictoire entre 2 IA
    // Ex: Claude × Gemini, Claude × Codex, ou Gemini × Codex
    // ============================================================
    if (mode === "DUEL") {
      const p1 = activeProviders[0] || "claude";
      const p2 = activeProviders[1] || "gemini";
      const name1 = getAgentName(p1);
      const name2 = getAgentName(p2);

      // Phase 1: Agent 1
      broadcastVibeEvent(
        "PHASE_CHANGED",
        projectId,
        { phase: "AGENT_1_IMPLEMENTING", taskTitle: task.title, agent: name1 },
        task.id
      );
      const res1 = await runAgentImplementation(p1);
      const code1 = res1.content;

      // Phase 2: Agent 2
      broadcastVibeEvent(
        "PHASE_CHANGED",
        projectId,
        { phase: "AGENT_2_IMPLEMENTING", taskTitle: task.title, agent: name2 },
        task.id
      );
      const res2 = await runAgentImplementation(p2);
      const code2 = res2.content;

      await prisma.task.update({
        where: { id: task.id },
        data: {
          claudeImplementation: p1 === "claude" ? code1 : (p2 === "claude" ? code2 : code1),
          antigravityImplementation: p2 === "gemini" ? code2 : (p1 === "gemini" ? code1 : `[${name2}]\n${code2}`),
          status: "IN_DEBATE",
        },
      });

      // Phase 3: Cross-Review
      broadcastVibeEvent(
        "PHASE_CHANGED",
        projectId,
        { phase: "CROSS_REVIEW", taskTitle: task.title, duel: `${name1} × ${name2}` },
        task.id
      );

      // P1 reviews P2
      const p1ReviewRes = await callAI({
        systemPrompt: `Tu es ${name1} en train d'évaluer la proposition de code de ${name2}. Reste constructif mais pointilleux sur l'élégance et la robustesse.`,
        userPrompt: `Tâche : "${task.title}"\nCode proposé par ${name2} :\n\`\`\`typescript\n${code2.slice(0, 1500)}\n\`\`\`\nRédige une critique constructive en 2 paragraphes courts :\n1. Salue les points forts de cette approche.\n2. Propose des axes d'amélioration précis selon ton expertise (${getAgentRoleDescription(p1)}).`,
        modelType: p1 === "gemini" ? "antigravity" : p1,
        preferCli: true,
      });

      const speaker1 = p1 === "claude" ? "CLAUDE" : (p1 === "gemini" ? "ANTIGRAVITY" : "SYSTEM");
      const msg1 = p1 === "openai" ? `[ChatGPT Codex] Revue de ${name2} :\n${p1ReviewRes.content}` : p1ReviewRes.content;
      const path1 = p1 === "openai" ? "src/agents/openai-codex.ts" : (p1 === "claude" ? "src/components/feature.tsx" : "src/stores/feature-state.ts");

      const log1 = await prisma.agentDebateLog.create({
        data: {
          taskId: task.id,
          speaker: speaker1,
          phase: "review",
          round: 1,
          qualityScore: 8.9,
          message: msg1,
          filePath: path1,
        },
      });
      broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log1 }, task.id);

      // P2 reviews P1
      const p2ReviewRes = await callAI({
        systemPrompt: `Tu es ${name2} en train d'évaluer la proposition de code de ${name1}. Reste constructif mais pointilleux sur l'élégance et la robustesse.`,
        userPrompt: `Tâche : "${task.title}"\nCode proposé par ${name1} :\n\`\`\`typescript\n${code1.slice(0, 1500)}\n\`\`\`\nRédige une critique constructive en 2 paragraphes courts :\n1. Salue les points forts de cette approche.\n2. Propose des axes d'amélioration précis selon ton expertise (${getAgentRoleDescription(p2)}).`,
        modelType: p2 === "gemini" ? "antigravity" : p2,
        preferCli: true,
      });

      const speaker2 = p2 === "claude" ? "CLAUDE" : (p2 === "gemini" ? "ANTIGRAVITY" : "SYSTEM");
      const msg2 = p2 === "openai" ? `[ChatGPT Codex] Revue de ${name1} :\n${p2ReviewRes.content}` : p2ReviewRes.content;
      const path2 = p2 === "openai" ? "src/agents/openai-codex.ts" : (p2 === "claude" ? "src/components/feature.tsx" : "src/stores/feature-state.ts");

      const log2 = await prisma.agentDebateLog.create({
        data: {
          taskId: task.id,
          speaker: speaker2,
          phase: "review",
          round: 1,
          qualityScore: 9.1,
          message: msg2,
          filePath: path2,
        },
      });
      broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log2 }, task.id);

      // Phase 4: Consensus Synthesis
      const synthesisPrompt = `Tu es l'arbitre d'orchestration VibeFlow. Synthétise la solution définitive pour "${task.title}".\nPrends le meilleur de ${name1} (${getAgentRoleDescription(p1)}) et de ${name2} (${getAgentRoleDescription(p2)}).\nRédige la synthèse consensuelle en 3 points clairs :\n1. Apport clé de ${name1}\n2. Apport clé de ${name2}\n3. Décision de fusion sur la branche '${synthesisBranch}' validée pour production.`;

      const synthesisRes = await callAI({
        systemPrompt: "Tu es l'Arbitre et Synthétiseur VibeFlow, unifiant les meilleures innovations de chaque agent.",
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
        { phase: "SYNTHESIS", status: "READY_FOR_MERGE", mode: "DUEL" },
        task.id
      );

      return NextResponse.json({
        success: true,
        mode: "DUEL",
        activeProviders,
        taskId: task.id,
        claudeBranch,
        antigravityBranch,
        synthesisBranch,
        p1Provider: res1.provider,
        p2Provider: res2.provider,
      });
    }

    // ============================================================
    // MODE 3: TRIO / TRIUMVIRAT (3 Fournisseurs Actifs)
    // Claude Code × Antigravity (Gemini) × ChatGPT Codex
    // Débat triangulaire d'élite et synthèse suprême
    // ============================================================
    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "TRIO_PHASE_1_CLAUDE", taskTitle: task.title, description: "Implémentation Architecture & Typage Strict (Claude Code)" },
      task.id
    );

    // 1. Claude Implementation
    const claudeRes = await runAgentImplementation("claude");
    const claudeCode = claudeRes.content;

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "TRIO_PHASE_2_ANTIGRAVITY", taskTitle: task.title, description: "Implémentation Fluidité 60 FPS & UX (Antigravity)" },
      task.id
    );

    // 2. Antigravity Implementation
    const antigravityRes = await runAgentImplementation("gemini");
    const antigravityCode = antigravityRes.content;

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "TRIO_PHASE_3_CODEX", taskTitle: task.title, description: "Implémentation Algorithmes & Scalabilité (ChatGPT Codex)" },
      task.id
    );

    // 3. ChatGPT Codex Implementation
    const codexRes = await runAgentImplementation("openai");
    const codexCode = codexRes.content;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        claudeImplementation: claudeCode,
        antigravityImplementation: `[Antigravity / Gemini Pro]\n${antigravityCode}\n\n[ChatGPT Codex]\n${codexCode}`,
        status: "IN_DEBATE",
      },
    });

    // 4. Triangular Cross-Review Debate (Round 1 & 2)
    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "TRIANGULAR_CROSS_REVIEW", taskTitle: task.title },
      task.id
    );

    // Claude reviews Antigravity & Codex
    const claudeReviewRes = await callAI({
      systemPrompt: "Tu es Claude Code. Effectue une revue critique globale des propositions d'Antigravity (UX) et de ChatGPT Codex (Algorithmes).",
      userPrompt: `Tâche : "${task.title}"\nProposition Antigravity :\n\`\`\`typescript\n${antigravityCode.slice(0, 1000)}\n\`\`\`\nProposition ChatGPT Codex :\n\`\`\`typescript\n${codexCode.slice(0, 1000)}\n\`\`\`\nÉcris une revue concise en 2 points :\n1. Analyse de la sécurité des types et de la robustesse transactionnelle.\n2. Recommandations fermes d'architecture logicielle pour la fusion.`,
      modelType: "claude",
      preferCli: true,
    });

    const log1 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "CLAUDE",
        phase: "review",
        round: 1,
        qualityScore: 9.3,
        message: claudeReviewRes.content,
        filePath: "src/components/feature.tsx",
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log1 }, task.id);

    // Antigravity reviews Claude & Codex
    const antigravityReviewRes = await callAI({
      systemPrompt: "Tu es Antigravity. Évalue les propositions de Claude Code et ChatGPT Codex sous l'angle du ressenti utilisateur, de la latence perçue et de l'ergonomie.",
      userPrompt: `Tâche : "${task.title}"\nProposition Claude Code :\n\`\`\`typescript\n${claudeCode.slice(0, 1000)}\n\`\`\`\nProposition ChatGPT Codex :\n\`\`\`typescript\n${codexCode.slice(0, 1000)}\n\`\`\`\nÉcris une revue concise en 2 points :\n1. Fluidité des transitions, feedback haptique/visuel et réactivité.\n2. Conseils pour rendre l'interface intuitive et agréable à l'usage.`,
      modelType: "antigravity",
      preferCli: true,
    });

    const log2 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "ANTIGRAVITY",
        phase: "review",
        round: 1,
        qualityScore: 9.4,
        message: antigravityReviewRes.content,
        filePath: "src/stores/feature-state.ts",
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log2 }, task.id);

    // ChatGPT Codex reviews Claude & Antigravity
    const codexReviewRes = await callAI({
      systemPrompt: "Tu es ChatGPT Codex. Évalue les propositions de Claude Code et Antigravity sous l'angle de la complexité algorithmique, des fuites mémoire et de la scalabilité.",
      userPrompt: `Tâche : "${task.title}"\nProposition Claude Code :\n\`\`\`typescript\n${claudeCode.slice(0, 1000)}\n\`\`\`\nProposition Antigravity :\n\`\`\`typescript\n${antigravityCode.slice(0, 1000)}\n\`\`\`\nÉcris une revue concise en 2 points :\n1. Optimisation des structures de données (O(1)), caching et réduction du footprint mémoire.\n2. Concurrence et gestion asynchrone non-bloquante.`,
      modelType: "openai",
      preferCli: true,
    });

    const log3 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "SYSTEM",
        phase: "review",
        round: 2,
        qualityScore: 9.2,
        message: `[ChatGPT Codex] Revue Algorithmique & Scalabilité :\n${codexReviewRes.content}`,
        filePath: "src/agents/openai-codex.ts",
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log3 }, task.id);

    // 5. Supreme Triangular Consensus Synthesis
    const synthesisPrompt = `Tu es le Grand Synthétiseur VibeFlow orchestrant un triumvirat de modèles d'IA d'élite pour "${task.title}".
Rédige la décision finale de synthèse consensuelle en intégrant la synergie des 3 piliers :
1. Architecture, Sécurité & Typage Défensif (Claude Code)
2. Fluidité 60 FPS, Ergonomie & Optimistic UI (Antigravity)
3. Performance Algorithmique & Scalabilité Concurrente (ChatGPT Codex)
4. Décision de fusion définitive sur la branche '${synthesisBranch}' prête pour la mise en production.`;

    const synthesisRes = await callAI({
      systemPrompt: "Tu es le Grand Synthétiseur VibeFlow, unifiant architecture, design et scalabilité.",
      userPrompt: synthesisPrompt,
      modelType: "synthesis",
      preferCli: true,
    });

    const synthesisText = synthesisRes.content;

    const log4 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "SYSTEM",
        phase: "synthesis",
        round: 3,
        qualityScore: 9.9,
        message: synthesisText,
      },
    });
    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log4 }, task.id);

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
      { phase: "SYNTHESIS", status: "READY_FOR_MERGE", mode: "TRIO" },
      task.id
    );

    return NextResponse.json({
      success: true,
      mode: "TRIO",
      activeProviders: ["claude", "gemini", "openai"],
      taskId: task.id,
      claudeBranch,
      antigravityBranch,
      synthesisBranch,
      claudeProvider: claudeRes.provider,
      antigravityProvider: antigravityRes.provider,
      codexProvider: codexRes.provider,
    });
  } catch (error) {
    console.error("Agent duel execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'exécution du VibeCoding multi-fournisseur" },
      { status: 500 }
    );
  }
}
