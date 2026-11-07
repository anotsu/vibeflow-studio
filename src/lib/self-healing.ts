// ============================================================
// VibeFlow Studio — Self-Healing CI/CD Engine
// Automatically diagnoses failed builds and runtime errors,
// formulates hotfix tasks with Claude & Antigravity, and re-deploys.
// ============================================================

import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai-provider";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { CoolifyService } from "@/lib/coolify";
import { exportHealingReportToObsidian } from "@/lib/obsidian-sync";

export interface SelfHealingResult {
  success: boolean;
  deploymentId: string;
  diagnosis: string;
  patchSummary: string;
  hotfixTaskId?: string;
  newDeploymentUuid?: string;
}

/**
 * Executes an automated self-healing loop for a failed deployment
 */
export async function triggerSelfHealing(deploymentId: string): Promise<SelfHealingResult> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      project: true,
    },
  });

  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  const project = deployment.project;
  const errorLogs = deployment.errorMessage || deployment.logs || "Build ou démarrage conteneur échoué.";
  const truncatedLogs = errorLogs.length > 3000 ? errorLogs.slice(-3000) : errorLogs;

  console.log(`[Self-Healing] Starting diagnosis for deployment ${deployment.id} on project "${project.name}"...`);

  // 1. Analyze error logs using Pro CLIs (Claude Pro / Antigravity Pro)
  const systemPrompt = `Tu es l'ingénieur de référence du Moteur d'Auto-Guérison (Self-Healing) VibeFlow Studio.
Un déploiement d'application Next.js 15 sur Coolify vient d'échouer.
Ton objectif :
1. Identifier la cause racine exacte de la rupture (erreur TypeScript, module introuvable, dépendance manquante, variable d'environnement ou syntaxe).
2. Fournir la correction immédiate en TypeScript / configuration.
3. Rédiger un diagnostic synthétique et professionnel.`;

  const userPrompt = `Projet : "${project.name}" (${project.githubRepo})
Branche défaillante : "${deployment.branch}"
Derniers logs d'erreur :
\`\`\`
${truncatedLogs}
\`\`\`

Rédige :
- Cause Racine : Diagnostic clair en 2 phrases
- Solution Recommandée : Les modifications précises à appliquer
- Plan de Résilience : Mesures pour éviter la récurrence`;

  const aiRes = await callAI({
    systemPrompt,
    userPrompt,
    modelType: "synthesis",
    preferCli: true,
  });

  const diagnosis = aiRes.content;

  // 2. Create an automated Hotfix Task in the database
  const hotfixTask = await prisma.task.create({
    data: {
      projectId: project.id,
      title: `🛡️ Hotfix Autonome : Résolution échec déploiement #${deployment.id.slice(-6)}`,
      description: `Incident détecté lors du build ou déploiement Coolify sur la branche "${deployment.branch}". Diagnostic et correctif auto-générés par le moteur Self-Healing.`,
      status: "SYNTHESIS",
      priority: "CRITICAL",
      claudeBranch: `hotfix/claude-${deployment.id.slice(-6)}`,
      antigravityBranch: `hotfix/antigravity-${deployment.id.slice(-6)}`,
      synthesisBranch: deployment.branch,
      synthesisDecision: diagnosis,
    },
  });

  // 3. Add an audit log in debate history
  await prisma.agentDebateLog.create({
    data: {
      taskId: hotfixTask.id,
      speaker: "SYSTEM",
      phase: "auto_healing",
      round: 1,
      message: `🚨 [AUTO-HEALING DIAGNOSIS]
Échec de déploiement détecté sur ${deployment.branch}.
${diagnosis}`,
    },
  });

  // 4. Update deployment record
  await prisma.deployment.update({
    where: { id: deployment.id },
    data: {
      healingAttempts: { increment: 1 },
      errorMessage: `[Auto-Healing enclenché] ${diagnosis.slice(0, 250)}...`,
    },
  });

  // 5. Broadcast live SSE event
  broadcastVibeEvent(
    "DEPLOYMENT_STATUS",
    project.id,
    {
      action: "self_healing_triggered",
      deploymentId: deployment.id,
      hotfixTaskId: hotfixTask.id,
      branch: deployment.branch,
      diagnosis: diagnosis.slice(0, 300),
    },
    hotfixTask.id
  );

  // 6. If Coolify credentials and app UUID are configured, trigger re-deployment attempt
  let newDeploymentUuid: string | undefined;
  if (project.coolifyServerUrl && project.coolifyApiToken && project.coolifyAppUuid) {
    try {
      const coolify = new CoolifyService(project.coolifyServerUrl, project.coolifyApiToken);
      const res = await coolify.triggerDeployment(project.coolifyAppUuid, {
        branch: deployment.branch,
        force: true,
      });
      newDeploymentUuid = res.deploymentUuid;
      console.log(`[Self-Healing] Re-deployment triggered on Coolify: ${newDeploymentUuid}`);
    } catch (err: any) {
      console.warn(`[Self-Healing] Could not auto-trigger Coolify re-deployment:`, err.message);
    }
  }

  // 7. Export Post-Mortem Report to Obsidian vault & live API
  exportHealingReportToObsidian(deployment.id, {
    projectName: project.name,
    branch: deployment.branch,
    diagnosis,
    patchSummary: diagnosis.slice(0, 200),
    errorLogs,
    success: true,
  }).catch((err) => console.warn("[Self-Healing] Failed to export to Obsidian:", err.message));

  return {
    success: true,
    deploymentId: deployment.id,
    diagnosis,
    patchSummary: diagnosis.slice(0, 200),
    hotfixTaskId: hotfixTask.id,
    newDeploymentUuid,
  };
}
