// ============================================================
// API Route: /api/agents/orchestrate
// Start a dual-branch orchestration cycle for a task
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueTaskOrchestration } from "@/lib/queue";

/**
 * POST /api/agents/orchestrate
 * Start a dual-branch orchestration cycle for a task.
 * Body: { taskId, projectId }
 * Enqueues a `start_dual_branch` job and returns the job ID.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, projectId } = body;

    // ── Validate required fields ──────────────────────────────
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // ── Verify task exists and belongs to the project ─────────
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, status: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.projectId !== projectId) {
      return NextResponse.json(
        { error: "Task does not belong to the specified project" },
        { status: 400 }
      );
    }

    // Prevent re-orchestration of already-completed tasks
    if (task.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Task is already completed" },
        { status: 409 }
      );
    }

    // ── Verify project exists and has required configuration ──
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        githubRepo: true,
        githubToken: true,
        anthropicApiKey: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    if (!project.githubRepo) {
      return NextResponse.json(
        { error: "Project has no GitHub repo configured" },
        { status: 400 }
      );
    }

    // ── Enqueue the orchestration job ─────────────────────────
    const job = await enqueueTaskOrchestration({
      taskId,
      projectId,
      action: "start_dual_branch",
    });

    return NextResponse.json(
      {
        jobId: job.id,
        message: "Orchestration started",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[POST /api/agents/orchestrate] Error:", error);
    return NextResponse.json(
      { error: "Failed to start orchestration" },
      { status: 500 }
    );
  }
}
