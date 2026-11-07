// ============================================================
// VibeFlow Studio — Preview Orchestrator
// Ephemeral per-task dev servers & reverse proxy for Visual Diff Slider
// Dynamically allocates ports, runs dev servers in isolated worktrees,
// proxies live requests, and provides 15-min auto-sleep to save RAM.
// ============================================================

import { spawn, ChildProcess } from "child_process";
import net from "net";
import fs from "fs";
import path from "path";
import { getAgentWorktreePath, AgentWorktreeRole } from "@/lib/git-worktree-manager";
import { getDevExecutionPlan } from "@/lib/stack-detector";

export type { AgentWorktreeRole };

export interface PreviewInstance {
  projectId?: string;
  taskId: string;
  role: AgentWorktreeRole;
  port: number;
  pid?: number;
  process?: ChildProcess;
  status: "starting" | "running" | "stopped" | "error";
  worktreePath: string;
  createdAt: number;
  lastActivityAt: number;
  error?: string;
}

// Global in-memory registry of active preview servers (survives requests in same process)
const globalPreviews = global as unknown as {
  __vibeflowPreviews?: Map<string, PreviewInstance>;
  __vibeflowGcInterval?: NodeJS.Timeout;
};

if (!globalPreviews.__vibeflowPreviews) {
  globalPreviews.__vibeflowPreviews = new Map<string, PreviewInstance>();
}

const previewRegistry = globalPreviews.__vibeflowPreviews;

// Inactivity timeout: 15 minutes
const AUTO_SLEEP_TIMEOUT_MS = 15 * 60 * 1000;

// Setup Garbage Collection Interval (every 60 seconds)
if (!globalPreviews.__vibeflowGcInterval) {
  globalPreviews.__vibeflowGcInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, instance] of previewRegistry.entries()) {
      if (
        instance.status === "running" &&
        now - instance.lastActivityAt > AUTO_SLEEP_TIMEOUT_MS
      ) {
        console.log(`[PreviewOrchestrator] Auto-sleeping idle preview: ${key} (PID: ${instance.pid})`);
        stopPreviewServer(instance.taskId, instance.role);
      }
    }
  }, 60000);
}

/**
 * Finds a free TCP port dynamically on localhost.
 */
export async function findAvailablePort(startPort = 4100, endPort = 4999): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    const isFree = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`);
}

/**
 * Generates cache key for an agent's preview server.
 */
function getInstanceKey(taskId: string, role: AgentWorktreeRole, projectId?: string): string {
  return projectId ? `${projectId}:${taskId}:${role}` : `${taskId}:${role}`;
}

/**
 * Ensures a live preview server is running for a given task and agent role.
 */
export async function ensurePreviewServer(
  taskId: string,
  role: AgentWorktreeRole,
  projectId?: string
): Promise<PreviewInstance> {
  const key = getInstanceKey(taskId, role, projectId);
  let existing = previewRegistry.get(key);

  // Fallback to legacy un-namespaced key if needed
  if (!existing && projectId) {
    existing = previewRegistry.get(`${taskId}:${role}`);
  }

  if (existing && existing.status === "running" && existing.pid) {
    existing.lastActivityAt = Date.now();
    return existing;
  }

  const worktreePath = getAgentWorktreePath(taskId, role, projectId);

  if (!fs.existsSync(worktreePath)) {
    throw new Error(`Worktree for task ${taskId} (${role}) not found at ${worktreePath}`);
  }

  const port = await findAvailablePort();

  const instance: PreviewInstance = {
    projectId,
    taskId,
    role,
    port,
    status: "starting",
    worktreePath,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  previewRegistry.set(key, instance);

  // Compute dynamic execution plan based on detected framework (Next.js, Vite, Nuxt, FastAPI, Rust, etc.)
  const plan = getDevExecutionPlan(worktreePath, port);
  console.log(`[PreviewOrchestrator] Starting ${plan.stackName} dev server for ${key} on port ${port}...`);

  try {
    const devProcess = spawn(plan.command, plan.args, {
      cwd: worktreePath,
      env: {
        ...process.env,
        ...plan.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    instance.process = devProcess;
    instance.pid = devProcess.pid;

    devProcess.stdout?.on("data", (data) => {
      const out = data.toString();
      if (out.includes("ready") || out.includes("Local:") || out.includes("http") || out.includes("listening")) {
        instance.status = "running";
      }
    });

    devProcess.stderr?.on("data", (data) => {
      console.warn(`[Preview ${key}] stderr:`, data.toString().slice(0, 200));
    });

    devProcess.on("exit", (code) => {
      console.log(`[Preview ${key}] Process exited with code ${code}`);
      instance.status = "stopped";
    });

    // Mark as running after small startup delay
    setTimeout(() => {
      if (instance.status === "starting") {
        instance.status = "running";
      }
    }, 2500);
  } catch (err: any) {
    console.error(`[PreviewOrchestrator] Failed to spawn dev server for ${key}:`, err);
    instance.status = "error";
    instance.error = err?.message || String(err);
  }

  return instance;
}

/**
 * Returns an existing preview instance or undefined.
 */
export function getPreviewInstance(
  taskId: string,
  role: AgentWorktreeRole,
  projectId?: string
): PreviewInstance | undefined {
  const key = getInstanceKey(taskId, role, projectId);
  let instance = previewRegistry.get(key);
  if (!instance && projectId) {
    instance = previewRegistry.get(`${taskId}:${role}`);
  }
  if (instance) {
    instance.lastActivityAt = Date.now();
  }
  return instance;
}

/**
 * Stops a specific preview server and terminates its background process.
 */
export function stopPreviewServer(
  taskId: string,
  role: AgentWorktreeRole,
  projectId?: string
): boolean {
  const key = getInstanceKey(taskId, role, projectId);
  let instance = previewRegistry.get(key);
  if (!instance && projectId) {
    instance = previewRegistry.get(`${taskId}:${role}`);
  }

  if (!instance) return false;

  if (instance.process && instance.pid) {
    try {
      process.kill(instance.pid, "SIGTERM");
    } catch {
      try {
        instance.process.kill("SIGKILL");
      } catch {}
    }
  }

  instance.status = "stopped";
  previewRegistry.delete(key);
  if (projectId) {
    previewRegistry.delete(`${taskId}:${role}`);
  }
  return true;
}

/**
 * Stops all preview servers associated with a task (called upon task completion).
 */
export function stopAllTaskPreviews(taskId: string, projectId?: string): void {
  const roles: AgentWorktreeRole[] = ["claude", "antigravity", "openai", "synthesis"];
  for (const r of roles) {
    stopPreviewServer(taskId, r, projectId);
  }
}

/**
 * Stops all preview servers associated with a given project.
 */
export function stopProjectPreviews(projectId: string): number {
  let count = 0;
  for (const [key, instance] of previewRegistry.entries()) {
    if (instance.projectId === projectId || key.startsWith(`${projectId}:`)) {
      stopPreviewServer(instance.taskId, instance.role, projectId);
      count++;
    }
  }
  return count;
}

/**
 * Lists all active preview server instances, optionally filtered by projectId.
 */
export function listProjectPreviews(projectId?: string): PreviewInstance[] {
  const all = Array.from(previewRegistry.values());
  if (!projectId) return all;
  return all.filter((p) => p.projectId === projectId);
}

/**
 * Reads a static file directly from the agent's worktree if available.
 */
export function readWorktreeStaticFile(
  taskId: string,
  role: AgentWorktreeRole,
  subPath: string = ""
): { found: boolean; content?: Buffer; contentType?: string } {
  const worktreePath = getAgentWorktreePath(taskId, role);
  if (!fs.existsSync(worktreePath)) {
    return { found: false };
  }

  let cleanSubPath = subPath.replace(/^\/+/, "");
  if (!cleanSubPath) {
    // Check typical entrypoints
    const candidates = [
      "index.html",
      "public/index.html",
      "src/index.html",
      "dist/index.html",
      "out/index.html",
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(worktreePath, c))) {
        cleanSubPath = c;
        break;
      }
    }
  }

  const targetFile = path.join(worktreePath, cleanSubPath);

  // Security check: ensure path does not escape worktree
  if (!targetFile.startsWith(worktreePath)) {
    return { found: false };
  }

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    const content = fs.readFileSync(targetFile);
    const ext = path.extname(targetFile).toLowerCase();

    const mimeMap: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".mjs": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
    };

    return {
      found: true,
      content,
      contentType: mimeMap[ext] || "application/octet-stream",
    };
  }

  return { found: false };
}
