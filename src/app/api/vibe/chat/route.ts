// ============================================================
// VibeFlow Studio — Vibe Guide Chat & Incremental Roadmap API
// Step-by-step onboarding, milestone generation & GitHub sync
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGitHubService } from "@/lib/github";
import { decrypt } from "@/lib/utils";
import Anthropic from "@anthropic-ai/sdk";

interface ChatRequestBody {
  projectId: string;
  message: string;
  action?: "analyze_vibe" | "next_step" | "complete_step" | "sync_github";
  milestoneId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { projectId, message, action = "analyze_vibe", milestoneId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Load project with current milestones and tasks
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          orderBy: { order: "asc" },
          include: { tasks: true },
        },
        toolboxItems: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Save user message to database
    await prisma.chatMessage.create({
      data: {
        projectId,
        role: "user",
        content: message,
        milestoneRef: milestoneId,
      },
    });

    // Determine current progress
    const activeMilestone = project.milestones.find(
      (m) => m.status === "IN_PROGRESS"
    ) || project.milestones.find((m) => m.status === "PENDING") || project.milestones[0];

    // Anthropic API Key resolution
    let anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (project.anthropicApiKey) {
      try {
        anthropicKey = decrypt(project.anthropicApiKey);
      } catch {
        anthropicKey = project.anthropicApiKey;
      }
    }

    let assistantResponse = "";
    let roadmapAction: Record<string, unknown> | null = null;

    if (anthropicKey && anthropicKey.startsWith("sk-ant")) {
      const client = new Anthropic({ apiKey: anthropicKey });

      const promptContext = `
Vous êtes le VibeGuide Senior de VibeFlow Studio.
Projet : "${project.name}"
Description Vibe : "${project.vibeDescription}"
Repo GitHub : "${project.githubRepo}"
Jalon actif : ${activeMilestone ? `${activeMilestone.phase} (${activeMilestone.title})` : "Aucun"}
Jalons actuels : ${project.milestones.map((m) => `[${m.phase} - ${m.status}] ${m.title}`).join(", ")}
Outils acquis : ${project.toolboxItems.filter((t) => t.status === "ACQUIRED").map((t) => t.name).join(", ") || "Aucun"}
Outils manquants : ${project.toolboxItems.filter((t) => t.status === "MISSING").map((t) => t.name).join(", ") || "Aucun"}

Consignes d'accompagnement "VibeCoding" :
1. Éviter la surcharge cognitive : proposer UNIQUEMENT UNE SEULE étape ou décision à la fois.
2. Découper pragmatiquement en 5 jalons : ARCHITECTURE -> MVP -> UI/UX -> INTEGRATIONS -> DEPLOYMENT.
3. Si l'utilisateur valide une étape, préciser les fichiers impactés et proposer de créer la tâche dual-branch.
4. Répondre en français, ton bienveillant, technique et direct. Style Markdown élégant.
`;

      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        temperature: 0.7,
        system: promptContext,
        messages: [{ role: "user", content: message }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      assistantResponse = textBlock ? textBlock.text : "Étape analysée avec succès.";
    } else {
      // Heuristic intelligent fallback when no live Anthropic API key is provided
      if (action === "next_step" || message.toLowerCase().includes("étape suivante") || message.toLowerCase().includes("continuer")) {
        assistantResponse = `🎯 **Étape en cours : ${activeMilestone?.title || "Architecture Initiale"}**\n\n` +
          `Voici l'action concrète prioritaire à exécuter maintenant :\n\n` +
          `1. **Fichiers cibles :** \`src/app/page.tsx\` et composants associés.\n` +
          `2. **Objectif :** Implémenter le composant d'accroche et valider le flux de données.\n` +
          `3. **Orchestration :** Les agents Claude et Antigravity peuvent créer chacun une branche pour proposer leur implémentation.\n\n` +
          `Voulez-vous que je crée automatiquement l'Issue GitHub correspondante et lance le duel de branches ?`;
      } else {
        assistantResponse = `✨ **Vibe bien reçu pour "${project.name}" !**\n\n` +
          `Votre vision : *${message.slice(0, 160)}...*\n\n` +
          `J'ai préparé la feuille de route incrémentale en 5 étapes clés :\n` +
          `1. 🏗️ **Architecture & Schéma de données** : Base PostgreSQL, modèles Prisma et contrats d'API.\n` +
          `2. 🚀 **MVP & Cœur Fonctionnel** : Logique métier et routes serveur principales.\n` +
          `3. 🎨 **UI/UX Cyber-Minimaliste** : Interface réactive Tailwind, dark mode et feedbacks temps réel.\n` +
          `4. 🔌 **Intégrations & Boîte à Outils** : Services externes (Auth, Stripe, Storage).\n` +
          `5. 📦 **Déploiement Continu Coolify** : Prévisualisation des branches et conteneurisation.\n\n` +
          `👉 **Commençons par le Jalon 1 (Architecture).** Souhaitez-vous que je détaille le schéma initial ?`;
      }
    }

    // Optional GitHub Sync: Create or update issue if requested
    let githubIssueNumber: number | undefined;
    if (action === "sync_github" || message.toLowerCase().includes("issue github")) {
      let ghToken = process.env.GITHUB_TOKEN;
      if (project.githubToken) {
        try {
          ghToken = decrypt(project.githubToken);
        } catch {
          ghToken = project.githubToken;
        }
      }

      if (ghToken && project.githubRepo) {
        try {
          const gh = createGitHubService(project.githubRepo, ghToken);
          const issue = await gh.createIssue(
            `[VibeFlow] ${activeMilestone?.title || "Nouvelle étape"}`,
            `### Objectif de l'étape\n\n${message}\n\n*Généré automatiquement par VibeFlow Studio pour le jalon ${activeMilestone?.phase || "MVP"}*`,
            ["vibeflow", "milestone"]
          );
          githubIssueNumber = issue.number;
          if (activeMilestone) {
            await prisma.milestone.update({
              where: { id: activeMilestone.id },
              data: { githubIssueNumber: issue.number },
            });
          }
        } catch (err) {
          console.error("Failed to sync GitHub Issue:", err);
        }
      }
    }

    // Save assistant message to DB
    const savedMsg = await prisma.chatMessage.create({
      data: {
        projectId,
        role: "assistant",
        content: assistantResponse,
        milestoneRef: activeMilestone?.id,
        actionTaken: githubIssueNumber ? `created_github_issue_${githubIssueNumber}` : undefined,
      },
    });

    return NextResponse.json({
      message: savedMsg,
      activeMilestone,
      githubIssueNumber,
      roadmapAction,
    });
  } catch (error) {
    console.error("Error in /api/vibe/chat:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne de chat" },
      { status: 500 }
    );
  }
}
