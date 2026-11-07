// ============================================================
// VibeFlow Studio — API Route: /api/projects/frame-blueprint
// Project Framing & Scaffolding Engine before VibeCoding
// Synthesizes Project Charter, Milestones, Tasks & Obsidian Sync
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-provider";
import { pushToLiveObsidianApi, getVibeFlowVaultDir } from "@/lib/obsidian-sync";
import { recommendSkillsForProject, installSkillMpToProject, SkillRecommendation } from "@/lib/skillsmp-client";
import { slugify } from "@/lib/utils";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export interface ProjectFramingInput {
  name: string;
  pitch: string;
  problemAndTarget: string;
  coreFeature: string;
  frontend?: string;
  database?: string;
  auth?: string;
  payment?: string;
  styling?: string;
  hosting?: string;
  entities?: string;
  agentRules?: string;
  selectedSkills?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ProjectFramingInput = await request.json();

    if (!body.name || !body.pitch) {
      return NextResponse.json(
        { error: "Le nom du projet et le pitch sont obligatoires pour le cadrage." },
        { status: 400 }
      );
    }

    const slug = slugify(body.name);
    const frontend = body.frontend || "Next.js 15 (App Router, React 19)";
    const database = body.database || "PostgreSQL avec Prisma ORM";
    const auth = body.auth || "NextAuth.js (Sessions persistantes)";
    const payment = body.payment || "Stripe Checkout & Webhooks sécurisés";
    const styling = body.styling || "Tailwind CSS (Thème sombre néon/cockpit)";
    const hosting = body.hosting || "VPS Coolify (Docker multi-stage)";
    const entities = body.entities || "User, Workspace, Task, Subscription, AuditLog";
    const agentRules =
      body.agentRules ||
      "Typage TypeScript strict (zéro any), modularité Server/Client Components, fluidité 60fps et architecture Zéro-Mock.";

    // 0. Compute SkillsMP Recommendations
    const recommendedSkills = recommendSkillsForProject(body);
    const selectedIds = new Set(
      body.selectedSkills && body.selectedSkills.length > 0
        ? body.selectedSkills
        : recommendedSkills.filter((r) => r.selectedByDefault).map((r) => r.skill.id)
    );
    const activeRecommended = recommendedSkills.filter((r) => selectedIds.has(r.skill.id));

    // 1. Synthesize Blueprint via AI
    const systemPrompt = `Tu es le Directeur Technique (Lead Software Architect) de VibeFlow Studio.
Ton rôle est de transformer le cadrage d'un projet en une spécification technique exhaustive (Project Blueprint Charter)
avant que les agents Claude Code Pro et Antigravity Pro ne démarrent le "Vibe Coding" dans leurs worktrees respectifs.

Fournis ta réponse sous forme d'un objet JSON strict valide avec les clés suivantes :
{
  "summary": "Résumé exécutif du projet en 2-3 phrases",
  "projectCharterMarkdown": "Le document complet de cadrage en Markdown prêt pour Obsidian",
  "milestones": [
    { "phase": "ARCHITECTURE", "title": "...", "description": "...", "order": 1 },
    { "phase": "MVP", "title": "...", "description": "...", "order": 2 },
    { "phase": "UI_UX", "title": "...", "description": "...", "order": 3 },
    { "phase": "DEPLOYMENT", "title": "...", "description": "...", "order": 4 }
  ],
  "initialTasks": [
    {
      "title": "Titre clair de la tâche",
      "description": "Description avec critères d'acceptation Gherkin (Given/When/Then)",
      "priority": "HIGH" | "CRITICAL" | "MEDIUM",
      "phase": "ARCHITECTURE" | "MVP" | "UI_UX" | "DEPLOYMENT"
    }
  ],
  "toolboxItems": [
    { "name": "Nom de l'outil", "category": "DATABASE" | "AUTH" | "PAYMENT" | "UI_KIT" | "MONITORING" }
  ]
}`;

    const userPrompt = `Voici les éléments de cadrage du projet :
- Nom : ${body.name}
- Pitch : ${body.pitch}
- Problème & Cible : ${body.problemAndTarget}
- Fonctionnalité Reine (Killer Feature) : ${body.coreFeature}
- Frontend : ${frontend}
- Base de Données : ${database}
- Authentification : ${auth}
- Paiements / Monétisation : ${payment}
- Design & Styling : ${styling}
- Hébergement : ${hosting}
- Entités clés & Données : ${entities}
- Règles d'or pour les Agents : ${agentRules}

Génère le dossier de cadrage complet avec 4 jalons méthodiques, 6 tâches Kanban concrètes réparties sur les phases et la liste des outils nécessaires.`;

    let aiResult;
    try {
      aiResult = await callAI({
        systemPrompt,
        userPrompt,
        modelType: "claude",
        preferCli: true,
      });
    } catch {
      // Fallback to antigravity if claude is unavailable
      aiResult = await callAI({
        systemPrompt,
        userPrompt,
        modelType: "antigravity",
        preferCli: true,
      });
    }

    let parsedBlueprint: any = null;
    try {
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedBlueprint = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("[FrameBlueprint] AI JSON parsing failed, using fallback scaffolding.");
    }

    // High quality deterministic fallback if JSON parsing fails
    if (!parsedBlueprint || !parsedBlueprint.projectCharterMarkdown) {
      const fallbackCharter = `---
tags: [vibeflow, blueprint, charter, architecture]
project: ${body.name}
slug: ${slug}
created: ${new Date().toISOString().split("T")[0]}
status: FRAMED_READY_FOR_VIBE_CODING
---

# 🧭 Dossier de Cadrage & Blueprint : ${body.name}

> **Pitch** : ${body.pitch}  
> **Cible & Problème** : ${body.problemAndTarget}  
> **Fonctionnalité Clé** : ${body.coreFeature}

---

## 🛠️ Matrice Technique & Choix d'Architecture

| Domaine | Solution Retenue |
| :--- | :--- |
| **Frontend** | ${frontend} |
| **Base de Données** | ${database} |
| **Authentification** | ${auth} |
| **Monétisation** | ${payment} |
| **Design System** | ${styling} |
| **Hébergement Cible** | ${hosting} |

---

## 🧱 Modèle de Données & Entités
Entités clés modélisées : **${entities}**

---

## ⚖️ Règles d'Or pour les Agents Claude & Antigravity
- ${agentRules}
- Aucune régression TypeScript (compilation \`tsc --noEmit\` à 0 erreur requise).
- Tests et vérification dans worktrees isolés avant tout merge sur la branche principale.
`;

      parsedBlueprint = {
        summary: `${body.name} : ${body.pitch}`,
        projectCharterMarkdown: fallbackCharter,
        milestones: [
          {
            phase: "ARCHITECTURE",
            title: "Phase 1 : Fondations & Schéma de Données",
            description: `Mise en place de ${database}, configuration du client et typage strict des entités.`,
            order: 1,
          },
          {
            phase: "MVP",
            title: "Phase 2 : Moteur Cœur de Métier",
            description: `Implémentation de la fonctionnalité reine : ${body.coreFeature}.`,
            order: 2,
          },
          {
            phase: "UI_UX",
            title: "Phase 3 : Interface Utilisateur & Polish 60fps",
            description: `Design System ${styling}, composants interactifs et responsive.`,
            order: 3,
          },
          {
            phase: "DEPLOYMENT",
            title: "Phase 4 : Sécurité, Monétisation & Déploiement",
            description: `Configuration ${auth}, ${payment} et pipeline ${hosting}.`,
            order: 4,
          },
        ],
        initialTasks: [
          {
            title: "Initialisation du schéma de base de données & ORM",
            description: `Given un projet ${body.name}\nWhen le schéma est appliqué\nThen les entités ${entities} sont migrées sans erreur.`,
            priority: "CRITICAL",
            phase: "ARCHITECTURE",
          },
          {
            title: `Implémentation du service métier : ${body.coreFeature.slice(0, 50)}`,
            description: `Given les routes API\nWhen un appel est effectué\nThen la logique métier retourne les données typées.`,
            priority: "HIGH",
            phase: "MVP",
          },
          {
            title: "Création du layout principal & design system",
            description: `Given le design system ${styling}\nWhen la page s'affiche\nThen le thème responsive et les composants sont fluides à 60fps.`,
            priority: "HIGH",
            phase: "UI_UX",
          },
          {
            title: "Intégration du système d'authentification",
            description: `Given un utilisateur non connecté\nWhen il se connecte via ${auth}\nThen sa session est persistée.`,
            priority: "MEDIUM",
            phase: "DEPLOYMENT",
          },
          {
            title: "Mise en place de la passerelle de paiement / webhook",
            description: `Given un paiement ${payment}\nWhen l'événement webhook arrive\nThen les droits d'accès sont mis à jour.`,
            priority: "MEDIUM",
            phase: "DEPLOYMENT",
          },
          {
            title: "Configuration Dockerfile multi-stage & vérification Coolify",
            description: `Given le dépôt Git\nWhen le build démarre sur ${hosting}\nThen le conteneur passe en statut RUNNING.`,
            priority: "HIGH",
            phase: "DEPLOYMENT",
          },
        ],
        toolboxItems: [
          { name: "Prisma ORM", category: "DATABASE" },
          { name: auth, category: "AUTH" },
          { name: "Tailwind CSS", category: "UI_KIT" },
          { name: payment, category: "PAYMENT" },
          { name: "Coolify Cloud", category: "HOSTING" },
        ],
      };
    }

    // Append SkillsMP Recommendations to Project Charter
    if (activeRecommended.length > 0) {
      const skillsSection = `\n\n---\n\n## ⚡ Compétences SkillsMP Activées pour le Projet (skillsmp.com)\n\nCes compétences spécialisées de la marketplace SkillsMP orientent les arbitrages des agents Claude et Antigravity :\n\n${activeRecommended
        .map(
          (r) =>
            `- **${r.skill.name}** (\`${r.skill.category}\`, ⭐ ${r.skill.stars}) : *${r.reason}*\n  > \`${r.skill.systemPromptInjection}\``
        )
        .join("\n\n")}\n`;

      parsedBlueprint.projectCharterMarkdown += skillsSection;

      // Auto-install and sync each skill to Obsidian (09_SkillsMP_Installed/)
      for (const rec of activeRecommended) {
        try {
          await installSkillMpToProject(rec.skill.id, slug);
        } catch (e) {
          console.warn("[FrameBlueprint] Failed installing skill to Obsidian:", e);
        }
      }
    }

    // 2. Sync Project Charter to Obsidian Vault in pure UTF-8
    const obsidianRelPath = `06_Project_Blueprints/${slug}_Charter.md`;
    await pushToLiveObsidianApi(obsidianRelPath, parsedBlueprint.projectCharterMarkdown);

    // Also persist to local disk vault directory
    try {
      const localVaultDir = path.join(getVibeFlowVaultDir(), "06_Project_Blueprints");
      if (!fs.existsSync(localVaultDir)) {
        fs.mkdirSync(localVaultDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(localVaultDir, `${slug}_Charter.md`),
        parsedBlueprint.projectCharterMarkdown,
        "utf-8"
      );
    } catch (fsErr) {
      console.warn("[FrameBlueprint] Local file save warning:", fsErr);
    }

    return NextResponse.json({
      success: true,
      slug,
      obsidianPath: `VibeFlow/${obsidianRelPath}`,
      blueprint: parsedBlueprint,
      recommendedSkills,
      activeSkills: activeRecommended,
    });
  } catch (error: any) {
    console.error("[POST /api/projects/frame-blueprint] Error:", error);
    return NextResponse.json(
      { error: "Échec de la génération du dossier de cadrage", details: error?.message },
      { status: 500 }
    );
  }
}
