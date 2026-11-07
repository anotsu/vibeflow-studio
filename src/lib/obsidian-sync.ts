// ============================================================
// VibeFlow Studio — Obsidian Bidirectional Synchronization Engine
// Structured cleanly under the dedicated "VibeFlow" vault folder
// Direct pure UTF-8 streaming to avoid any character corruption
// http://192.168.1.203:27123 with Bearer Auth
// ============================================================

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const OBSIDIAN_DEFAULT_URL = process.env.OBSIDIAN_REST_URL || "http://192.168.1.203:27123";
const OBSIDIAN_DEFAULT_TOKEN =
  process.env.OBSIDIAN_REST_TOKEN || "817225bdd85485f2d234f36f36862363ca85e5c6ff69b35c19a1b4576ebf9c39";

/**
 * Returns the local disk path to the VibeFlow vault folder.
 */
export function getVibeFlowVaultDir(): string {
  const cwd = process.cwd();
  const directVault = path.join(cwd, "obsidian-vault", "VibeFlow");
  if (fs.existsSync(directVault)) {
    return directVault;
  }
  const parentVault = path.join(cwd, "..", "obsidian-vault", "VibeFlow");
  if (fs.existsSync(parentVault)) {
    return parentVault;
  }
  // Default to creating inside cwd/obsidian-vault/VibeFlow
  const target = path.join(cwd, "obsidian-vault", "VibeFlow");
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

/**
 * Uploads markdown file to the live Obsidian Local REST API in pure UTF-8.
 * Always places notes under the dedicated "VibeFlow/" folder.
 */
export async function pushToLiveObsidianApi(
  vaultRelativePath: string,
  markdownContent: string
): Promise<boolean> {
  const apiUrl = OBSIDIAN_DEFAULT_URL.replace(/\/+$/, "");
  
  // Ensure path starts with VibeFlow/
  let cleanPath = vaultRelativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleanPath.startsWith("VibeFlow/")) {
    cleanPath = `VibeFlow/${cleanPath}`;
  }

  // Encode each path segment properly to support UTF-8 characters and spaces
  const encodedPath = cleanPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const endpoint = `${apiUrl}/vault/${encodedPath}`;

  try {
    const utf8Buffer = Buffer.from(markdownContent, "utf-8");
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${OBSIDIAN_DEFAULT_TOKEN}`,
        "Content-Type": "text/markdown; charset=utf-8",
        Accept: "application/json",
      },
      body: utf8Buffer,
    });
    return res.ok;
  } catch (err: any) {
    console.warn(`[ObsidianSync] Failed to push to live API (${endpoint}): ${err.message}`);
    return false;
  }
}

/**
 * Deletes a file from the live Obsidian vault if present.
 */
export async function deleteFromLiveObsidianApi(vaultRelativePath: string): Promise<boolean> {
  const apiUrl = OBSIDIAN_DEFAULT_URL.replace(/\/+$/, "");
  const cleanPath = vaultRelativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const encodedPath = cleanPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const endpoint = `${apiUrl}/vault/${encodedPath}`;

  try {
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${OBSIDIAN_DEFAULT_TOKEN}`,
      },
    });
    return res.status === 204 || res.status === 200 || res.status === 404;
  } catch {
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
 * Synchronizes a single Task to an Obsidian Markdown note in VibeFlow/03_Kanban_Tasks/
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

  const vibeFlowDir = getVibeFlowVaultDir();
  const tasksDir = path.join(vibeFlowDir, "03_Kanban_Tasks");
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  const taskSlug = slugify(task.title);
  const fileName = `TASK-${task.id.slice(-6).toUpperCase()}-${taskSlug}.md`;
  const relativeVaultPath = `VibeFlow/03_Kanban_Tasks/${fileName}`;
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
> **Priorité** : \`${task.priority}\` | **Statut** : \`${task.status}\` | **Agent Assigné** : ${agentOwner}
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

  // 1. Write to local disk in UTF-8
  fs.writeFileSync(localFilePath, fullContent, "utf-8");

  // 2. Push to live Obsidian REST API in UTF-8
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
  // First ensure core documents are up to date in VibeFlow/
  await syncCoreVaultDocuments();

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
 * Exports a full debate log into VibeFlow/04_AI_Debates_Logs/
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

  const vibeFlowDir = getVibeFlowVaultDir();
  const debatesDir = path.join(vibeFlowDir, "04_AI_Debates_Logs");
  if (!fs.existsSync(debatesDir)) {
    fs.mkdirSync(debatesDir, { recursive: true });
  }

  const fileName = `DEBATE-${task.id.slice(-6).toUpperCase()}.md`;
  const relativeVaultPath = `VibeFlow/04_AI_Debates_Logs/${fileName}`;
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
 * Exports a self-healing post-mortem report to VibeFlow/05_Self_Healing_Reports/
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
  const vibeFlowDir = getVibeFlowVaultDir();
  const healingDir = path.join(vibeFlowDir, "05_Self_Healing_Reports");
  if (!fs.existsSync(healingDir)) {
    fs.mkdirSync(healingDir, { recursive: true });
  }

  const fileName = `HEAL-${deploymentId.slice(-8)}.md`;
  const relativeVaultPath = `VibeFlow/05_Self_Healing_Reports/${fileName}`;
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
 * Uploads all core architecture notes and vault subfolders from disk to the live Obsidian API in pure UTF-8.
 */
export async function syncAllVaultFilesFromDisk(): Promise<{ syncedFiles: string[]; success: boolean }> {
  const vibeFlowDir = getVibeFlowVaultDir();
  const syncedFiles: string[] = [];
  let allSuccess = true;

  function scanDir(dir: string, relPrefix: string = "") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        scanDir(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        syncedFiles.push(relPath);
      }
    }
  }

  scanDir(vibeFlowDir);

  for (const rel of syncedFiles) {
    const fullPath = path.join(vibeFlowDir, rel);
    const content = fs.readFileSync(fullPath, "utf-8");
    const ok = await pushToLiveObsidianApi(`VibeFlow/${rel}`, content);
    if (!ok) allSuccess = false;
  }

  // Clean up any accidental legacy files in vault root
  await deleteFromLiveObsidianApi("00_Dashboard_Home.md");
  await deleteFromLiveObsidianApi("01_Master_Roadmap.md");

  return { syncedFiles, success: allSuccess };
}

/**
 * Uploads all core architecture notes from disk to the live Obsidian API in pure UTF-8.
 */
export async function syncCoreVaultDocuments(): Promise<boolean> {
  const res = await syncAllVaultFilesFromDisk();
  return res.success;
}

/**
 * Checks the status and connectivity of the live Obsidian vault and Local REST API.
 */
export async function getObsidianVaultHealth(): Promise<{
  vaultPath: string;
  tasksCount: number;
  debatesCount: number;
  healingReportsCount: number;
  blueprintsCount: number;
  liveApiOnline: boolean;
  liveApiUrl: string;
}> {
  const vibeFlowDir = getVibeFlowVaultDir();
  const tasksDir = path.join(vibeFlowDir, "03_Kanban_Tasks");
  const debatesDir = path.join(vibeFlowDir, "04_AI_Debates_Logs");
  const healingDir = path.join(vibeFlowDir, "05_Self_Healing_Reports");
  const blueprintsDir = path.join(vibeFlowDir, "06_Project_Blueprints");

  const tasksCount = fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir).filter((f) => f.endsWith(".md")).length : 0;
  const debatesCount = fs.existsSync(debatesDir) ? fs.readdirSync(debatesDir).filter((f) => f.endsWith(".md")).length : 0;
  const healingReportsCount = fs.existsSync(healingDir) ? fs.readdirSync(healingDir).filter((f) => f.endsWith(".md")).length : 0;
  const blueprintsCount = fs.existsSync(blueprintsDir) ? fs.readdirSync(blueprintsDir).filter((f) => f.endsWith(".md")).length : 0;

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
    vaultPath: vibeFlowDir,
    tasksCount,
    debatesCount,
    healingReportsCount,
    blueprintsCount,
    liveApiOnline,
    liveApiUrl: OBSIDIAN_DEFAULT_URL,
  };
}
