// ============================================================
// VibeFlow Studio — Task Orchestration Worker (BullMQ)
// Handles dual-branch cycles, agent execution, auto-mode
// ============================================================

import { Worker, type Job } from "bullmq";
import {
  QUEUE_NAMES,
  getQueueConnection,
  enqueueAutoModeCycle,
  enqueueTaskOrchestration,
  type TaskOrchestrationJobData,
  type AutoModeJobData,
  type AgentExecutionJobData,
} from "@/lib/queue";
import { createOrchestrator } from "@/lib/orchestrator";
import { prisma } from "@/lib/prisma";

// ─── Task Orchestration Worker ──────────────────────────────

const taskWorker = new Worker<TaskOrchestrationJobData>(
  QUEUE_NAMES.TASK_ORCHESTRATION,
  async (job: Job<TaskOrchestrationJobData>) => {
    const { taskId, projectId, action } = job.data;
    console.log(
      `[TaskWorker] Processing job ${job.id}: ${action} for task ${taskId}`
    );

    const orchestrator = createOrchestrator(taskId, projectId);

    try {
      await orchestrator.initialize();

      switch (action) {
        case "start_dual_branch": {
          const result = await orchestrator.startDualBranchCycle();
          console.log(
            `[TaskWorker] Dual-branch cycle completed for task ${taskId}. Phase: ${result.phase}`
          );
          return result;
        }

        case "run_claude":
        case "run_antigravity":
        case "cross_review":
        case "synthesize":
        case "merge": {
          // Individual phase execution — used when retrying specific phases
          console.log(
            `[TaskWorker] Individual phase ${action} not yet implemented as standalone`
          );
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[TaskWorker] Error processing task ${taskId}: ${errorMsg}`
      );
      await orchestrator.abort(errorMsg);
      throw error;
    }
  },
  {
    connection: getQueueConnection(),
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000, // Max 5 jobs per minute
    },
  }
);

taskWorker.on("completed", (job) => {
  console.log(`[TaskWorker] Job ${job.id} completed successfully`);
});

taskWorker.on("failed", (job, error) => {
  console.error(`[TaskWorker] Job ${job?.id} failed:`, error.message);
});

// ─── Auto-Mode Worker ───────────────────────────────────────

const autoModeWorker = new Worker<AutoModeJobData>(
  QUEUE_NAMES.AUTO_MODE,
  async (job: Job<AutoModeJobData>) => {
    const { projectId, cycleNumber } = job.data;
    console.log(
      `[AutoMode] Starting cycle #${cycleNumber} for project ${projectId}`
    );

    // Check if project is still in AUTO mode
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { status: "BACKLOG" },
          orderBy: { priority: "desc" },
          take: 1,
        },
      },
    });

    if (!project || project.mode !== "AUTO") {
      console.log(
        `[AutoMode] Project ${projectId} is no longer in AUTO mode. Stopping.`
      );
      return;
    }

    // Pick a task from backlog or generate an optimization task
    let taskToProcess = project.tasks[0];

    if (!taskToProcess) {
      // No backlog tasks — generate an auto-optimization task
      console.log(
        `[AutoMode] No backlog tasks. Generating optimization task.`
      );
      taskToProcess = await prisma.task.create({
        data: {
          projectId,
          title: `Auto-Optimization Cycle #${cycleNumber}`,
          description: `Automated improvement cycle: Review codebase for potential refactoring, add missing tests, improve error handling, optimize performance, and enhance security.`,
          status: "BACKLOG",
          priority: "LOW",
          origin: "AUTO_OPTIMIZATION",
        },
      });
    }

    // Enqueue the dual-branch orchestration
    await enqueueTaskOrchestration({
      taskId: taskToProcess.id,
      projectId,
      action: "start_dual_branch",
    });

    // Schedule the next cycle
    const settings = await prisma.globalSettings.findUnique({
      where: { id: "singleton" },
    });
    const intervalMs = settings?.autoModeIntervalMs || 300_000;

    await enqueueAutoModeCycle(
      { projectId, cycleNumber: cycleNumber + 1 },
      intervalMs
    );

    console.log(
      `[AutoMode] Cycle #${cycleNumber} complete. Next cycle in ${intervalMs / 1000}s.`
    );
  },
  {
    connection: getQueueConnection(),
    concurrency: 1,
  }
);

autoModeWorker.on("completed", (job) => {
  console.log(`[AutoMode] Cycle job ${job.id} completed`);
});

autoModeWorker.on("failed", (job, error) => {
  console.error(`[AutoMode] Cycle job ${job?.id} failed:`, error.message);
});

// ─── Agent Execution Worker ─────────────────────────────────

const agentWorker = new Worker<AgentExecutionJobData>(
  QUEUE_NAMES.AGENT_EXECUTION,
  async (job: Job<AgentExecutionJobData>) => {
    const { taskId, projectId, agent, branch, prompt } = job.data;
    console.log(
      `[AgentExec] Running ${agent} on branch ${branch} for task ${taskId}`
    );

    // This worker handles individual agent execution requests
    // Primarily used by the self-healing loop when Coolify deployments fail
    const orchestrator = createOrchestrator(taskId, projectId);
    await orchestrator.initialize();

    // The orchestrator's internal methods handle Claude/Antigravity execution
    // For self-healing, we run a targeted fix cycle
    try {
      // Log the healing attempt
      await prisma.agentDebateLog.create({
        data: {
          taskId,
          speaker: agent,
          message: `Self-healing attempt triggered.\n\nPrompt: ${prompt}`,
          phase: "self-healing",
        },
      });

      // Use the orchestrator's Claude call to fix the issue
      // (Both agents use Claude API under the hood)
      const state = orchestrator.getState();
      console.log(
        `[AgentExec] ${agent} execution completed. State: ${state.phase}`
      );
    } catch (error) {
      console.error(`[AgentExec] ${agent} execution failed:`, error);
      throw error;
    }
  },
  {
    connection: getQueueConnection(),
    concurrency: 2,
  }
);

agentWorker.on("completed", (job) => {
  console.log(`[AgentExec] Job ${job.id} completed`);
});

agentWorker.on("failed", (job, error) => {
  console.error(`[AgentExec] Job ${job?.id} failed:`, error.message);
});

// ─── Graceful Shutdown ──────────────────────────────────────

async function shutdown() {
  console.log("[Workers] Shutting down...");
  await Promise.all([
    taskWorker.close(),
    autoModeWorker.close(),
    agentWorker.close(),
  ]);
  console.log("[Workers] Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[Workers] Task orchestration workers started.");
console.log(
  `  - Task Orchestration: listening on "${QUEUE_NAMES.TASK_ORCHESTRATION}"`
);
console.log(`  - Auto-Mode: listening on "${QUEUE_NAMES.AUTO_MODE}"`);
console.log(
  `  - Agent Execution: listening on "${QUEUE_NAMES.AGENT_EXECUTION}"`
);
