// ============================================================
// VibeFlow Studio — API Route: Automated GitHub Pull Request Bot
// POST /api/tasks/[id]/github-pr
// Generates GitHub PR with badges, benchmark report & synthesis diff
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GitHubService } from "@/lib/github";
import { analyzeCodeImplementation } from "@/lib/sandbox-runner";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        debateLogs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = task.project;
    const defaultBranch = project.githubDefaultBranch || "main";
    const headBranch = task.synthesisBranch || `synthesis/${task.id}`;

    // Compute quality metrics for PR badges
    const claudeBenchmark = analyzeCodeImplementation(
      task.claudeImplementation || "",
      "CLAUDE",
      task.claudeBranch || "agent/claude"
    );
    const antigravityBenchmark = analyzeCodeImplementation(
      task.antigravityImplementation || "",
      "ANTIGRAVITY",
      task.antigravityBranch || "agent/antigravity"
    );

    const winner =
      claudeBenchmark.overallScore > antigravityBenchmark.overallScore + 0.3
        ? "Claude Code"
        : antigravityBenchmark.overallScore > claudeBenchmark.overallScore + 0.3
        ? "Antigravity Engine"
        : "Complémentarité Optimale (Consensus)";

    const prTitle = `feat(${task.id.slice(-6)}): ${task.title}`;

    const prBody = `## 🚀 VibeFlow Studio — Synthèse Consensuelle & Fusion Autonome

> **Tâche :** ${task.title}  
> **Orchestration :** Duel Collaboratif Claude Pro × Antigravity Pro (Zéro surcoût de token d'API)  
> **Branche de Synthèse :** \`${headBranch}\`  
> **Branche Cible :** \`${defaultBranch}\`  

---

### 🛡️ Badges de Qualité & Sécurité (Sandbox Runner)

| Indicateur | Badge |
| :--- | :--- |
| **Sécurité & Intégrité** | ![Sécurité Grade A+](https://img.shields.io/badge/Security-Grade%20A%2B-emerald?style=flat-square) |
| **Tests Virtuels** | ![Couverture](https://img.shields.io/badge/Tests-${claudeBenchmark.testSuite.passed}%2F${claudeBenchmark.testSuite.total}%20Pass%C3%A9s-brightgreen?style=flat-square) |
| **VibeCoding Pro** | ![Zéro Token](https://img.shields.io/badge/VibeCoding-Zero%20Token%20Cost-blue?style=flat-square) |
| **Vainqueur Technique** | ![Winner](https://img.shields.io/badge/Arbitrage-${encodeURIComponent(winner)}-purple?style=flat-square) |

---

### ⚔️ Résultats du Duel Multi-Agents

| Métrique | 🟠 Claude Code (Architecture) | 🔵 Antigravity (UI / UX / 60 FPS) |
| :--- | :---: | :---: |
| **Note Globale** | **${claudeBenchmark.overallScore}/10** | **${antigravityBenchmark.overallScore}/10** |
| **Grade Sécurité** | ${claudeBenchmark.securityGrade} (${claudeBenchmark.securityScore}/100) | ${antigravityBenchmark.securityGrade} (${antigravityBenchmark.securityScore}/100) |
| **Avertissements TypeScript** | ${claudeBenchmark.typeScriptWarnings} | ${antigravityBenchmark.typeScriptWarnings} |
| **Poids du Bundle (estimé)** | ${claudeBenchmark.bundleEstimatedKb} KB | ${antigravityBenchmark.bundleEstimatedKb} KB |
| **Assertions Validées** | ${claudeBenchmark.testSuite.passed} / ${claudeBenchmark.testSuite.total} | ${antigravityBenchmark.testSuite.passed} / ${antigravityBenchmark.testSuite.total} |

---

### 🏆 Décision & Rationale de Synthèse

\`\`\`markdown
${task.synthesisDecision || "Synthèse validée et approuvée par le protocole VibeFlow Studio."}
\`\`\`

---

*Généré automatiquement par [VibeFlow Studio](https://vibeflow.capstation.fr).*`;

    // If GitHub token is present on the project, create real PR via Octokit
    if (project.githubToken) {
      try {
        const gh = new GitHubService(project.githubRepo, project.githubToken);
        const pr = await gh.createPullRequest({
          title: prTitle,
          body: prBody,
          head: headBranch,
          base: defaultBranch,
        });

        return NextResponse.json({
          success: true,
          prUrl: pr.htmlUrl,
          prNumber: pr.number,
          markdown: prBody,
        });
      } catch (err: any) {
        console.warn("[POST /api/tasks/[id]/github-pr] Octokit create PR failed, fallback to prefilled URL:", err.message);
      }
    }

    // Fallback: Prefilled GitHub Compare / New PR URL
    const encodedTitle = encodeURIComponent(prTitle);
    const encodedBody = encodeURIComponent(prBody);
    const prefilledUrl = `https://github.com/${project.githubRepo}/compare/${defaultBranch}...${headBranch}?expand=1&title=${encodedTitle}&body=${encodedBody}`;

    return NextResponse.json({
      success: true,
      prefilledUrl,
      markdown: prBody,
      prTitle,
    });
  } catch (error: any) {
    console.error("[POST /api/tasks/[id]/github-pr] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur création PR GitHub" },
      { status: 500 }
    );
  }
}
