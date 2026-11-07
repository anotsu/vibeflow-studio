// ============================================================
// VibeFlow Studio — Obsidian Bidirectional Synchronization Engine
// Integrates local disk vault (/obsidian-vault) & live Local REST API
// http://192.168.1.203:27123 with Bearer Auth
// ============================================================

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const OBSIDIAN_DEFAULT_URL = process.env.OBSIDIAN_REST_URL || "http://192.168.1.203:27123";
const OBSIDIAN_DEFAULT_TOKEN =
  process.env.OBSIDIAN_REST_TOKEN || "817225bdd85485f2d234f36f36862363ca85e5c6ff69b35c19a1b4576ebf9c39";

/**
 * Returns the local vault directory path.
 */
export function getLocalVaultDir(): string {
  const cwd = process.cwd();
  const directVault = path.join(cwd, "obsidian-vault");
  if (fs.existsSync(directVault)) {
    return directVault;
  }
  const parentVault = path.join(cwd, "..", "obsidian-vault");
  if (fs.existsSync(parentVault)) {
    return parentVault;
  }
  return directVault;
}

/**
 * Helper to upload markdown file to the live Obsidian Local REST API.
 */
async function pushToLiveObsidianApi(vaultRelativePath: string, markdownContent: string): Promise<boolean> {
  const apiUrl = OBSIDIAN_DEFAULT_URL.replace(/\/+$/, "");
  const normalizedPath = vaultRelativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const endpoint = `${apiUrl}/vault/${encodeURI(normalizedPath)}`;

  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${OBSIDIAN_DEFAULT_TOKEN}`,
        "Content-Type": "text/markdown",
      },
      body: markdownContent,
    });
    return res.ok;
  } catch (err: any) {
    console.warn(`[ObsidianSync] Failed to push to live API (${endpoint}): ${err.message}`);
    return false;
  }
}

/**
 * Helper to slugify task titles for note filenames.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

/**
 * Maps task status to Dataview & Kanban standard tags.
 */
function mapStatusToTag(status: string): string {
  switch (status) {
    case "BACKLOG":
      return "backlog";
    case "CLAUDE_IN_PROGRESS":
    case "ANTIGRAVITY_IN_PROGRESS":
      return "in-progress";
    case "IN_DEBATE":
      return "debate";
    case "SYNTHESIS":
      return "synthesis";
    case "TESTING":
      return "testing";
    case "COMPLETED":
      return "done";
    case "FAILED":
      return "failed";
    default:
      return "backlog";
  }
}

/**
 * Synchronizes a single Task to an Obsidian Markdown note.
 */
export async function syncTaskToObsidian(taskId: string): Promise<{
  success: boolean;
  localPath: string;
  liveApiSynced: boolean;
}> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      milestone: true,
      debateLogs: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const vaultDir = getLocalVaultDir();
  const tasksDir = path.join(vaultDir, "03_Kanban_Tasks");
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  const taskSlug = slugify(task.title);
  const fileName = `TASK-${task.id.slice(-6).toUpperCase()}-${taskSlug}.md`;
  const relativeVaultPath = `03_Kanban_Tasks/${fileName}`;
  const localFilePath = path.join(tasksDir, fileName);

  const statusTag = mapStatusToTag(task.status);
  const priorityStr = task.priority.toLowerCase();
  const agentOwner = task.status.includes("CLAUDE")
    ? "Claude Code Pro"
    : task.status.includes("ANTIGRAVITY")
    ? "Antigravity CLI"
    : "Dual (Claude × Antigravity)";

  // Format Frontmatter
  const frontmatter = `---
tags: [vibeflow, task, kanban, status/${statusTag}]
taskId: "${task.id}"
project: "${task.project.name}"
status: "${statusTag}"
priority: "${priorityStr}"
agent_owner: "${agentOwner}"
claude_branch: "${task.claudeBranch || "N/A"}"
antigravity_branch: "${task.antigravityBranch || "N/A"}"
synthesis_branch: "${task.synthesisBranch || "N/A"}"
updated: ${new Date().toISOString()}
---`;

  // Format Markdown Body
  const body = `
# 📌 ${task.title}

> [!INFO] Fiche Technique Tâche
> **Projet** : ${task.project.name} (\`${task.project.githubRepo}\`)
> **Priorité** : \`${task.priority}\` | **Statut** : \`${task.status}\` | **Agent** : ${agentOwner}
> **Branche Claude** : \`${task.claudeBranch || "Non provisionnée"}\`
> **Branche Antigravity** : \`${task.antigravityBranch || "Non provisionnée"}\`

## 🎯 Spécification & Objectif
${task.description || "Aucune description détaillée fournie."}

## 📝 Check-list de Validation (Sous-Tâches)
- [${task.status === "COMPLETED" ? "x" : " "}] Spécification validée en débat contradictoire
- [${task.claudeImplementation ? "x" : " "}] Implémentation Claude Code (Architecture & Sécurité)
- [${task.antigravityImplementation ? "x" : " "}] Implémentation Antigravity CLI (Performance & UI)
- [${task.synthesisDecision ? "x" : " "}] Synthèse et arbitrage Juge IA
- [${task.status === "COMPLETED" ? "x" : " "}] Tests unitaires & Déploiement validé

## 🧠 Approche Claude Code (Architecte)
${task.claudeImplementation ? `\`\`\`typescript\n${task.claudeImplementation}\n\`\`\`` : "_En attente de développement par Claude Code._"}

## ⚡ Approche Antigravity CLI (Challenger)
${task.antigravityImplementation ? `\`\`\`typescript\n${task.antigravityImplementation}\n\`\`\`` : "_En attente de développement par Antigravity CLI._"}

## ⚖️ Décision de Synthèse & Fusion
${task.synthesisDecision ? `> [!SUCCESS] Arbitrage Juge IA\n> ${task.synthesisDecision}` : "_Non arbitrée pour le moment._"}

## 💬 Historique du Débat (${task.debateLogs.length} messages)
${
  task.debateLogs.length > 0
    ? task.debateLogs
        .map(
          (log) =>
            `- **[${log.speaker}]** (${new Date(log.createdAt).toLocaleTimeString()}): ${log.message.slice(0, 300)}${
              log.qualityScore ? ` *(Score: ${log.qualityScore}/10)*` : ""
            }`
        )
        .join("\n")
    : "_Aucun échange enregistré._"
}
`;

  const fullContent = `${frontmatter}\n${body.trim()}\n`;

  // 1. Write to local disk
  fs.writeFileSync(localFilePath, fullContent, "utf-8");

  // 2. Push to live Obsidian REST API
  const liveApiSynced = await pushToLiveObsidianApi(relativeVaultPath, fullContent);

  return {
    success: true,
    localPath: localFilePath,
    liveApiSynced,
  };
}

/**
 * Synchronizes all tasks of a project (or all projects) to Obsidian.
 */
export async function syncAllTasksToObsidian(projectId?: string): Promise<{
  syncedCount: number;
  liveApiOnline: boolean;
}> {
  const where = projectId ? { projectId } : {};
  const tasks = await prisma.task.findMany({
    where,
    select: { id: true },
  });

  let liveApiOnline = true;
  for (const t of tasks) {
    const res = await syncTaskToObsidian(t.id);
    if (!res.liveApiSynced) {
      liveApiOnline = false;
    }
  }

  return {
    syncedCount: tasks.length,
    liveApiOnline,
  };
}

/**
 * Exports a full debate log into /obsidian-vault/04_AI_Debates_Logs/
 */
export async function exportDebateToObsidian(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      debateLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task) throw new Error(`Task ${taskId} not found`);

  const vaultDir = getLocalVaultDir();
  const debatesDir = path.join(vaultDir, "04_AI_Debates_Logs");
  if (!fs.existsSync(debatesDir)) {
    fs.mkdirSync(debatesDir, { recursive: true });
  }

  const fileName = `DEBATE-${task.id.slice(-6).toUpperCase()}.md`;
  const relativeVaultPath = `04_AI_Debates_Logs/${fileName}`;
  const localFilePath = path.join(debatesDir, fileName);

  const frontmatter = `---
tags: [vibeflow, debate, log]
taskId: "${task.id}"
project: "${task.project.name}"
rounds: ${task.debateLogs.length}
updated: ${new Date().toISOString()}
---`;

  let transcriptMd = `# 💬 Débat Contradictoire : ${task.title}\n\n`;
  transcriptMd += `> **Tâche liée** : [[TASK-${task.id.slice(-6).toUpperCase()}-${slugify(task.title)}]]\n\n`;

  for (const log of task.debateLogs) {
    const speakerEmoji =
      log.speaker === "CLAUDE" ? "🧠 **Claude Code Pro**" : log.speaker === "ANTIGRAVITY" ? "⚡ **Antigravity CLI**" : "⚙️ **Système**";
    transcriptMd += `### ${speakerEmoji} *(Phase: ${log.phase || "Discussion"} - Tour ${log.round})*\n`;
    transcriptMd += `${log.message}\n\n`;
    if (log.qualityScore) {
      transcriptMd += `> **Score attribué** : \`${log.qualityScore}/10\`\n\n`;
    }
    if (log.codeDiffRef) {
      transcriptMd += `\`\`\`diff\n${log.codeDiffRef}\n\`\`\`\n\n`;
    }
  }

  const fullContent = `${frontmatter}\n\n${transcriptMd.trim()}\n`;
  fs.writeFileSync(localFilePath, fullContent, "utf-8");
  await pushToLiveObsidianApi(relativeVaultPath, fullContent);

  return localFilePath;
}

/**
 * Exports a self-healing post-mortem report to /obsidian-vault/05_Self_Healing_Reports/
 */
export async function exportHealingReportToObsidian(
  deploymentId: string,
  data: {
    projectName: string;
    branch: string;
    diagnosis: string;
    patchSummary: string;
    errorLogs?: string;
    success: boolean;
  }
): Promise<string> {
  const vaultDir = getLocalVaultDir();
  const healingDir = path.join(vaultDir, "05_Self_Healing_Reports");
  if (!fs.existsSync(healingDir)) {
    fs.mkdirSync(healingDir, { recursive: true });
  }

  const fileName = `HEAL-${deploymentId.slice(-8)}.md`;
  const relativeVaultPath = `05_Self_Healing_Reports/${fileName}`;
  const localFilePath = path.join(healingDir, fileName);

  const frontmatter = `---
tags: [vibeflow, self-healing, postmortem]
deploymentId: "${deploymentId}"
project: "${data.projectName}"
branch: "${data.branch}"
resolved: ${data.success}
timestamp: ${new Date().toISOString()}
---`;

  const content = `${frontmatter}

# 🛡️ Rapport d'Auto-Guérison CI/CD : Déploiement \`${deploymentId.slice(0, 8)}\`

> [!${data.success ? "SUCCESS" : "WARNING"}] Statut : ${data.success ? "**RÉSOLU ET RE-DÉPLOYÉ**" : "**ATTENTION REQUISE**"}
> **Projet** : ${data.projectName} | **Branche** : \`${data.branch}\`

## 🔍 Diagnostic & Cause Racine
${data.diagnosis}

## 🩹 Patch Appliqué
${data.patchSummary}

## 📋 Extrait des Logs d'Erreur
\`\`\`
${(data.errorLogs || "Aucun log fourni").slice(0, 1500)}
\`\`\`
`;

  fs.writeFileSync(localFilePath, content.trim(), "utf-8");
  await pushToLiveObsidianApi(relativeVaultPath, content.trim());

  return localFilePath;
}

/**
 * Checks the status and connectivity of the live Obsidian vault and Local REST API.
 */
export async function getObsidianVaultHealth(): Promise<{
  vaultPath: string;
  tasksCount: number;
  debatesCount: number;
  healingReportsCount: number;
  liveApiOnline: boolean;
  liveApiUrl: string;
}> {
  const vaultDir = getLocalVaultDir();
  const tasksDir = path.join(vaultDir, "03_Kanban_Tasks");
  const debatesDir = path.join(vaultDir, "04_AI_Debates_Logs");
  const healingDir = path.join(vaultDir, "05_Self_Healing_Reports");

  const tasksCount = fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir).filter((f) => f.endsWith(".md")).length : 0;
  const debatesCount = fs.existsSync(debatesDir) ? fs.readdirSync(debatesDir).filter((f) => f.endsWith(".md")).length : 0;
  const healingReportsCount = fs.existsSync(healingDir) ? fs.readdirSync(healingDir).filter((f) => f.endsWith(".md")).length : 0;

  // Test live API ping
  let liveApiOnline = false;
  try {
    const res = await fetch(`${OBSIDIAN_DEFAULT_URL.replace(/\/+$/, "")}/`, {
      headers: { Authorization: `Bearer ${OBSIDIAN_DEFAULT_TOKEN}` },
    });
    liveApiOnline = res.ok;
  } catch {
    liveApiOnline = false;
  }

  return {
    vaultPath: vaultDir,
    tasksCount,
    debatesCount,
    healingReportsCount,
    liveApiOnline,
    liveApiUrl: OBSIDIAN_DEFAULT_URL,
  };
}
