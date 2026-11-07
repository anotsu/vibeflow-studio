// ============================================================
// VibeFlow Studio — Git Worktree Manager
// Physical file isolation for dual-agent branches:
// /tmp/vibeflow-worktrees/[taskId]/claude-impl
// /tmp/vibeflow-worktrees/[taskId]/antigravity-impl
// ============================================================

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export type AgentWorktreeRole = "claude" | "antigravity" | "openai" | "synthesis";

export interface WorktreePaths {
  taskId: string;
  baseDir: string;
  claudePath: string;
  antigravityPath: string;
  openaiPath?: string;
  synthesisPath: string;
  claudeBranch: string;
  antigravityBranch: string;
  openaiBranch?: string;
  synthesisBranch: string;
}

export interface WorktreeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/**
 * Resolves root repository directory.
 */
function getRepoRoot(): string {
  // If running inside Next.js or Docker
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, ".git"))) {
    return cwd;
  }
  // If running inside nested directory
  const parent = path.resolve(cwd, "..");
  if (fs.existsSync(path.join(parent, ".git"))) {
    return parent;
  }
  return cwd;
}

/**
 * Returns the base directory for worktrees for a given task, isolated by project.
 * Example: /tmp/vibeflow-worktrees/[projectId]/[taskId] (or fallback /tmp/vibeflow-worktrees/[taskId])
 */
export function getTaskWorktreeBase(taskId: string, projectId?: string): string {
  const isLinux = process.platform === "linux";
  const rootTmp = isLinux ? "/tmp/vibeflow-worktrees" : path.join(os.tmpdir(), "vibeflow-worktrees");

  if (projectId) {
    const projectDir = path.join(rootTmp, projectId, taskId);
    if (fs.existsSync(projectDir)) {
      return projectDir;
    }
    // Backward compatibility fallback to legacy flat path
    const legacyDir = path.join(rootTmp, taskId);
    if (fs.existsSync(legacyDir)) {
      return legacyDir;
    }
    return projectDir;
  }

  // If no projectId specified, check if task exists under any project subfolder
  if (fs.existsSync(rootTmp)) {
    try {
      const entries = fs.readdirSync(rootTmp, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const candidate = path.join(rootTmp, entry.name, taskId);
          if (fs.existsSync(candidate)) {
            return candidate;
          }
        }
      }
    } catch {}
  }

  return path.join(rootTmp, taskId);
}

/**
 * Provisions isolated git worktrees for Claude and Antigravity.
 */
export async function setupTaskWorktrees(
  taskId: string,
  baseBranch: string = "main",
  projectId?: string
): Promise<WorktreePaths> {
  const repoRoot = getRepoRoot();
  const baseDir = getTaskWorktreeBase(taskId, projectId);

  const claudePath = path.join(baseDir, "claude-impl");
  const antigravityPath = path.join(baseDir, "antigravity-impl");
  const openaiPath = path.join(baseDir, "openai-impl");
  const synthesisPath = path.join(baseDir, "synthesis-impl");

  const claudeBranch = `agent/claude-${taskId}`;
  const antigravityBranch = `agent/antigravity-${taskId}`;
  const openaiBranch = `agent/openai-${taskId}`;
  const synthesisBranch = `synthesis/${taskId}`;

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Helper to safely provision a single worktree
  async function provisionSingleWorktree(targetPath: string, branchName: string) {
    if (fs.existsSync(targetPath)) {
      try {
        // Test if worktree is valid
        await execAsync("git status", { cwd: targetPath });
        return;
      } catch {
        // Stale or corrupted, remove and recreate
        try {
          await execAsync(`git worktree remove --force "${targetPath}"`, { cwd: repoRoot });
        } catch {}
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
      }
    }

    // Check if branch already exists
    let branchExists = false;
    try {
      await execAsync(`git rev-parse --verify "${branchName}"`, { cwd: repoRoot });
      branchExists = true;
    } catch {}

    const addCommand = branchExists
      ? `git worktree add --force "${targetPath}" "${branchName}"`
      : `git worktree add -b "${branchName}" "${targetPath}" "${baseBranch}"`;

    try {
      await execAsync(addCommand, { cwd: repoRoot });
    } catch (err: any) {
      // Fallback: create worktree with checkout
      console.warn(`[WorktreeManager] Initial add failed: ${err.message}. Retrying with force reset...`);
      await execAsync(`git worktree prune`, { cwd: repoRoot });
      await execAsync(`git worktree add -B "${branchName}" "${targetPath}" "${baseBranch}"`, { cwd: repoRoot });
    }
  }

  // Provision active worktrees concurrently
  await Promise.all([
    provisionSingleWorktree(claudePath, claudeBranch),
    provisionSingleWorktree(antigravityPath, antigravityBranch),
    provisionSingleWorktree(openaiPath, openaiBranch),
  ]);

  return {
    taskId,
    baseDir,
    claudePath,
    antigravityPath,
    openaiPath,
    synthesisPath,
    claudeBranch,
    antigravityBranch,
    openaiBranch,
    synthesisBranch,
  };
}

/**
 * Returns the directory path for a specific agent's worktree.
 */
export function getAgentWorktreePath(
  taskId: string,
  role: AgentWorktreeRole,
  projectId?: string
): string {
  const baseDir = getTaskWorktreeBase(taskId, projectId);
  switch (role) {
    case "claude":
      return path.join(baseDir, "claude-impl");
    case "antigravity":
      return path.join(baseDir, "antigravity-impl");
    case "openai":
      return path.join(baseDir, "openai-impl");
    case "synthesis":
      return path.join(baseDir, "synthesis-impl");
  }
}

/**
 * Executes a CLI or bash command strictly within the target agent's worktree.
 */
export async function executeInWorktree(
  taskId: string,
  role: AgentWorktreeRole,
  command: string,
  options: {
    timeoutMs?: number;
    extraEnv?: Record<string, string>;
    projectId?: string;
  } = {}
): Promise<WorktreeExecResult> {
  const worktreePath = getAgentWorktreePath(taskId, role, options.projectId);

  if (!fs.existsSync(worktreePath)) {
    throw new Error(`Worktree for task ${taskId} (role: ${role}) does not exist at ${worktreePath}`);
  }

  const startTime = Date.now();
  const timeout = options.timeoutMs || 60000;

  const env = {
    ...process.env,
    PWD: worktreePath,
    VIBEFLOW_WORKTREE_ROLE: role,
    VIBEFLOW_TASK_ID: taskId,
    VIBEFLOW_PROJECT_ID: options.projectId || "",
    ...options.extraEnv,
  };

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: worktreePath,
      timeout,
      env,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
    });

    return {
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: 0,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "Execution error",
      exitCode: typeof err.code === "number" ? err.code : 1,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Commits all uncommitted changes in the agent's worktree.
 */
export async function commitWorktreeChanges(
  taskId: string,
  role: AgentWorktreeRole,
  commitMessage: string,
  projectId?: string
): Promise<string> {
  const worktreePath = getAgentWorktreePath(taskId, role, projectId);

  if (!fs.existsSync(worktreePath)) {
    throw new Error(`Worktree not found for task ${taskId} at ${worktreePath}`);
  }

  try {
    await execAsync("git add -A", { cwd: worktreePath });
    const { stdout } = await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: worktreePath,
    });
    return stdout;
  } catch (err: any) {
    if (err.stdout && err.stdout.includes("nothing to commit")) {
      return "nothing to commit";
    }
    throw err;
  }
}

/**
 * Returns the real git diff produced by the agent against the base branch.
 */
export async function getWorktreeDiff(
  taskId: string,
  role: AgentWorktreeRole,
  baseBranch: string = "main",
  projectId?: string
): Promise<string> {
  const worktreePath = getAgentWorktreePath(taskId, role, projectId);
  if (!fs.existsSync(worktreePath)) {
    return "";
  }

  try {
    // Diff against base branch or HEAD
    const { stdout } = await execAsync(`git diff ${baseBranch}...HEAD`, {
      cwd: worktreePath,
      timeout: 10000,
    });
    return stdout || "";
  } catch {
    try {
      const { stdout } = await execAsync("git diff HEAD~1", { cwd: worktreePath, timeout: 5000 });
      return stdout || "";
    } catch {
      return "";
    }
  }
}

/**
 * Cleans up and prunes all worktrees for a task once completed or deployed.
 */
export async function cleanupTaskWorktrees(taskId: string, projectId?: string): Promise<void> {
  const repoRoot = getRepoRoot();
  const baseDir = getTaskWorktreeBase(taskId, projectId);

  if (!fs.existsSync(baseDir)) {
    return;
  }

  const subdirs = ["claude-impl", "antigravity-impl", "openai-impl", "synthesis-impl"];

  for (const sub of subdirs) {
    const fullPath = path.join(baseDir, sub);
    if (fs.existsSync(fullPath)) {
      try {
        await execAsync(`git worktree remove --force "${fullPath}"`, { cwd: repoRoot });
      } catch (err: any) {
        console.warn(`[WorktreeManager] Error removing worktree ${fullPath}: ${err.message}`);
      }
    }
  }

  try {
    await execAsync("git worktree prune", { cwd: repoRoot });
  } catch {}

  // Remove directory if still on disk
  if (fs.existsSync(baseDir)) {
    try {
      fs.rmSync(baseDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Completely purges all isolated worktrees for a project.
 */
export async function cleanupProjectWorktrees(projectId: string): Promise<number> {
  const isLinux = process.platform === "linux";
  const rootTmp = isLinux ? "/tmp/vibeflow-worktrees" : path.join(os.tmpdir(), "vibeflow-worktrees");
  const projectDir = path.join(rootTmp, projectId);
  const repoRoot = getRepoRoot();
  let count = 0;

  if (!fs.existsSync(projectDir)) {
    return 0;
  }

  try {
    const taskDirs = fs.readdirSync(projectDir, { withFileTypes: true });
    for (const dir of taskDirs) {
      if (dir.isDirectory()) {
        await cleanupTaskWorktrees(dir.name, projectId);
        count++;
      }
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
  } catch (err: any) {
    console.warn(`[WorktreeManager] Cleanup project worktrees error for ${projectId}:`, err?.message);
  }

  try {
    await execAsync("git worktree prune", { cwd: repoRoot });
  } catch {}

  return count;
}

export interface ActiveWorktreeInfo {
  projectId?: string;
  taskId: string;
  role: string;
  path: string;
  sizeBytes: number;
}

/**
 * Lists all active isolated worktrees on the system, optionally filtered by projectId.
 */
export async function listActiveWorktrees(projectId?: string): Promise<ActiveWorktreeInfo[]> {
  const isLinux = process.platform === "linux";
  const rootTmp = isLinux ? "/tmp/vibeflow-worktrees" : path.join(os.tmpdir(), "vibeflow-worktrees");
  const results: ActiveWorktreeInfo[] = [];

  if (!fs.existsSync(rootTmp)) {
    return results;
  }

  const getDirSizeBytes = (dirPath: string): number => {
    let size = 0;
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const file of files) {
        if (file.name === ".git" || file.name === "node_modules") continue;
        const full = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += getDirSizeBytes(full);
        } else if (file.isFile()) {
          size += fs.statSync(full).size;
        }
      }
    } catch {}
    return size;
  };

  try {
    const topEntries = fs.readdirSync(rootTmp, { withFileTypes: true });
    for (const entry of topEntries) {
      if (!entry.isDirectory()) continue;

      const subPath = path.join(rootTmp, entry.name);
      const subEntries = fs.readdirSync(subPath, { withFileTypes: true });

      // Check if entry.name is a projectId containing task directories
      const hasTaskDirs = subEntries.some((s) => s.isDirectory() && (s.name.includes("-impl") || ["claude-impl", "antigravity-impl", "openai-impl", "synthesis-impl"].some(role => fs.existsSync(path.join(subPath, s.name, role)))));

      if (hasTaskDirs) {
        const foundProjectId = entry.name;
        if (projectId && foundProjectId !== projectId) continue;

        for (const taskEntry of subEntries) {
          if (!taskEntry.isDirectory()) continue;
          const taskDir = path.join(subPath, taskEntry.name);
          for (const role of ["claude", "antigravity", "openai", "synthesis"] as const) {
            const rolePath = path.join(taskDir, `${role}-impl`);
            if (fs.existsSync(rolePath)) {
              results.push({
                projectId: foundProjectId,
                taskId: taskEntry.name,
                role,
                path: rolePath,
                sizeBytes: getDirSizeBytes(rolePath),
              });
            }
          }
        }
      } else {
        // Flat legacy structure (/tmp/vibeflow-worktrees/[taskId]/[role]-impl)
        if (!projectId) {
          for (const role of ["claude", "antigravity", "openai", "synthesis"] as const) {
            const rolePath = path.join(subPath, `${role}-impl`);
            if (fs.existsSync(rolePath)) {
              results.push({
                taskId: entry.name,
                role,
                path: rolePath,
                sizeBytes: getDirSizeBytes(rolePath),
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[WorktreeManager] Error listing active worktrees:", err?.message);
  }

  return results;
}
