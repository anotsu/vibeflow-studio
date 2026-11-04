// ============================================================
// VibeFlow Studio — Background Worker & Job Dispatcher
// Processes dual-branch cycles, deployments, and scans
// Compatible with BullMQ/Redis AND In-Memory execution
// ============================================================

import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, getQueueConnection, type TaskOrchestrationJobData } from "@/lib/queue";
import { createOrchestrator } from "@/lib/orchestrator";
import { prisma } from "@/lib/prisma";
import { broadcastVibeEvent } from "@/lib/event-bus";

let isWorkerInitialized = false;

/**
 * Execute the actual dual-branch orchestration cycle for a given task.
 */
export async function executeTaskOrchestration(
  data: TaskOrchestrationJobData
): Promise<void> {
  const { taskId, projectId } = data;
  console.log(`[Worker] Starting Dual-Branch cycle for task ${taskId} (Project: ${projectId})...`);

  broadcastVibeEvent("PHASE_CHANGED", projectId, {
    action: data.action,
    phase: "BRANCHING",
    status: "PROCESSING",
  }, taskId);

  try {
    const orchestrator = createOrchestrator(taskId, projectId);
    await orchestrator.initialize();
    const finalState = await orchestrator.startDualBranchCycle();

    if (finalState.phase === "FAILED") {
      console.error(`[Worker] Orchestrator ended in FAILED phase for task ${taskId}:`, finalState.errors);
      broadcastVibeEvent("PHASE_CHANGED", projectId, {
        phase: "FAILED",
        errors: finalState.errors,
      }, taskId);
      return;
    }

    console.log(`[Worker] Dual-Branch cycle completed successfully for task ${taskId}:`, {
      claudeScore: finalState.claudeScore,
      antigravityScore: finalState.antigravityScore,
      synthesisBranch: finalState.synthesisBranch,
    });

    broadcastVibeEvent("PHASE_CHANGED", projectId, {
      phase: "COMPLETED",
      synthesisBranch: finalState.synthesisBranch,
    }, taskId);
  } catch (error: any) {
    console.error(`[Worker] Orchestration failed for task ${taskId}:`, error);

    // Update task status to FAILED in DB
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "FAILED" },
    }).catch(() => {});

    broadcastVibeEvent("PHASE_CHANGED", projectId, {
      phase: "FAILED",
      error: error?.message || "Orchestration error",
    }, taskId);
  }
}

/**
 * Initialize BullMQ workers if Redis is accessible.
 */
export function initBullMQWorkers(): void {
  if (isWorkerInitialized) return;
  isWorkerInitialized = true;

  try {
    const connection = getQueueConnection();
    const orchWorker = new Worker<TaskOrchestrationJobData>(
      QUEUE_NAMES.TASK_ORCHESTRATION,
      async (job: Job<TaskOrchestrationJobData>) => {
        await executeTaskOrchestration(job.data);
      },
      {
        connection,
        concurrency: 2,
      }
    );

    orchWorker.on("completed", (job) => {
      console.log(`[BullMQ Worker] Job ${job.id} completed successfully.`);
    });

    orchWorker.on("failed", (job, err) => {
      console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err);
    });

    console.log("[BullMQ Worker] Worker pool registered and listening on Redis.");
  } catch (err) {
    console.warn("[BullMQ Worker] Redis unavailable, running in in-process async mode.");
  }
}
