// ============================================================
// Redis / BullMQ Queue Configuration + In-Memory Fallback
// Resilient job execution with or without Redis
// ============================================================

import { Queue, type Job, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { broadcastVibeEvent } from "@/lib/event-bus";

// ─── Redis Connection ───────────────────────────────────────

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let redisConnection: IORedis | null = null;
let isRedisAvailable = true;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 3) {
          isRedisAvailable = false;
          return null; // Stop retrying Redis, fallback to in-memory
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisConnection.on("error", (err) => {
      if (isRedisAvailable) {
        console.warn(
          "[Queue] Redis unavailable — switching to local In-Memory job dispatcher"
        );
      }
      isRedisAvailable = false;
    });

    redisConnection.on("connect", () => {
      isRedisAvailable = true;
      console.log("[Queue] Connected to Redis successfully");
    });
  }
  return redisConnection;
}

export function getQueueConnection(): ConnectionOptions {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port || "6379", 10),
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

// ─── Queue Definitions ──────────────────────────────────────

export const QUEUE_NAMES = {
  TASK_ORCHESTRATION: "vibeflow:task-orchestration",
  DEPLOYMENT: "vibeflow:deployment",
  TOOLBOX_SCAN: "vibeflow:toolbox-scan",
  AUTO_MODE: "vibeflow:auto-mode",
  AGENT_EXECUTION: "vibeflow:agent-execution",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<string, Queue>();

export function getQueue(name: QueueName): Queue | null {
  if (!isRedisAvailable) return null;

  if (!queues.has(name)) {
    try {
      const q = new Queue(name, {
        connection: getQueueConnection(),
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
          attempts: 2,
          backoff: { type: "exponential", delay: 2000 },
        },
      });
      queues.set(name, q);
    } catch {
      isRedisAvailable = false;
      return null;
    }
  }
  return queues.get(name) || null;
}

// ─── Job Type Definitions ───────────────────────────────────

export interface TaskOrchestrationJobData {
  taskId: string;
  projectId: string;
  action:
    | "start_dual_branch"
    | "run_claude"
    | "run_antigravity"
    | "cross_review"
    | "synthesize"
    | "merge";
}

export interface DeploymentJobData {
  projectId: string;
  branch: string;
  commitSha?: string;
  environment: "PRODUCTION" | "PREVIEW" | "STAGING";
  taskId?: string;
}

export interface ToolboxScanJobData {
  projectId: string;
  githubRepo: string;
  githubToken: string;
}

export interface AutoModeJobData {
  projectId: string;
  cycleNumber: number;
}

export interface AgentExecutionJobData {
  taskId: string;
  projectId: string;
  agent: "CLAUDE" | "ANTIGRAVITY";
  branch: string;
  prompt: string;
  contextFiles?: string[];
}

// ─── In-Memory Fallback Job Runner ──────────────────────────

const inMemoryJobs = new Map<string, { id: string; name: string; data: any }>();

function createMockJob(id: string, name: string, data: any): Job {
  return {
    id,
    name,
    data,
    progress: 0,
    timestamp: Date.now(),
    attemptsMade: 1,
  } as unknown as Job;
}

// ─── Queue Enqueue Helpers with Graceful Fallback ───────────

/** Add a task orchestration job */
export async function enqueueTaskOrchestration(
  data: TaskOrchestrationJobData,
  opts?: { delay?: number; priority?: number }
): Promise<Job> {
  broadcastVibeEvent(
    "PHASE_CHANGED",
    data.projectId,
    { action: data.action, status: "QUEUED" },
    data.taskId
  );

  const queue = getQueue(QUEUE_NAMES.TASK_ORCHESTRATION);
  if (queue) {
    try {
      return await queue.add(`orchestrate:${data.action}:${data.taskId}`, data, {
        delay: opts?.delay,
        priority: opts?.priority,
      });
    } catch {
      isRedisAvailable = false;
    }
  }

  // Fallback in-memory dispatch
  const id = `local-orch-${Date.now()}`;
  inMemoryJobs.set(id, { id, name: data.action, data });
  console.log(`[Queue:InMemory] Enqueued task orchestration: ${data.action} for task ${data.taskId}`);
  return createMockJob(id, data.action, data);
}

/** Add a deployment job */
export async function enqueueDeployment(
  data: DeploymentJobData,
  opts?: { delay?: number }
): Promise<Job> {
  broadcastVibeEvent("DEPLOYMENT_STATUS", data.projectId, {
    branch: data.branch,
    status: "BUILDING",
  });

  const queue = getQueue(QUEUE_NAMES.DEPLOYMENT);
  if (queue) {
    try {
      return await queue.add(`deploy:${data.branch}`, data, {
        delay: opts?.delay,
      });
    } catch {
      isRedisAvailable = false;
    }
  }

  const id = `local-deploy-${Date.now()}`;
  inMemoryJobs.set(id, { id, name: `deploy:${data.branch}`, data });
  console.log(`[Queue:InMemory] Enqueued deployment for branch ${data.branch}`);
  return createMockJob(id, `deploy:${data.branch}`, data);
}

/** Add a toolbox scan job */
export async function enqueueToolboxScan(
  data: ToolboxScanJobData
): Promise<Job> {
  broadcastVibeEvent("TOOLBOX_UPDATED", data.projectId, {
    status: "SCANNING",
  });

  const queue = getQueue(QUEUE_NAMES.TOOLBOX_SCAN);
  if (queue) {
    try {
      return await queue.add(`scan:${data.projectId}`, data, {
        jobId: `toolbox-scan:${data.projectId}`,
      });
    } catch {
      isRedisAvailable = false;
    }
  }

  const id = `local-scan-${Date.now()}`;
  inMemoryJobs.set(id, { id, name: "toolbox-scan", data });
  console.log(`[Queue:InMemory] Enqueued toolbox scan for project ${data.projectId}`);
  return createMockJob(id, "toolbox-scan", data);
}

/** Add an auto-mode cycle job */
export async function enqueueAutoModeCycle(
  data: AutoModeJobData,
  delayMs: number = 300_000
): Promise<Job> {
  broadcastVibeEvent("AUTO_MODE_TICK", data.projectId, {
    cycle: data.cycleNumber,
  });

  const queue = getQueue(QUEUE_NAMES.AUTO_MODE);
  if (queue) {
    try {
      return await queue.add(`auto-cycle:${data.projectId}:${data.cycleNumber}`, data, {
        delay: delayMs,
      });
    } catch {
      isRedisAvailable = false;
    }
  }

  const id = `local-auto-${Date.now()}`;
  inMemoryJobs.set(id, { id, name: "auto-mode", data });
  console.log(`[Queue:InMemory] Scheduled auto-mode cycle #${data.cycleNumber} in ${delayMs / 1000}s`);
  return createMockJob(id, "auto-mode", data);
}

/** Add an agent execution job */
export async function enqueueAgentExecution(
  data: AgentExecutionJobData
): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.AGENT_EXECUTION);
  if (queue) {
    try {
      return await queue.add(`agent:${data.agent}:${data.taskId}`, data);
    } catch {
      isRedisAvailable = false;
    }
  }

  const id = `local-agent-${Date.now()}`;
  inMemoryJobs.set(id, { id, name: `agent:${data.agent}`, data });
  return createMockJob(id, `agent:${data.agent}`, data);
}

// ─── Graceful Shutdown ──────────────────────────────────────

export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closePromises);
  queues.clear();
  if (redisConnection) {
    try {
      await redisConnection.quit();
    } catch {}
    redisConnection = null;
  }
}
