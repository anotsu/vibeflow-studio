// ============================================================
// API Route: /api/tasks/[id]
// Get or update a single task
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { enqueueDeployment } from "@/lib/queue";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]
 * Get a task by ID with all debate logs (ordered by createdAt) and milestone.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        debateLogs: {
          orderBy: { createdAt: "asc" },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            phase: true,
            order: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[GET /api/tasks/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update task fields (status, priority, title, description, branches, etc.).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify task exists
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update payload from allowed fields
    const updateData: Record<string, unknown> = {};

    const allowedStringFields = [
      "title",
      "description",
      "claudeBranch",
      "antigravityBranch",
      "synthesisBranch",
      "claudeImplementation",
      "antigravityImplementation",
      "synthesisDecision",
    ] as const;

    for (const field of allowedStringFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          body[field] === null ? null : String(body[field]).trim();
      }
    }

    // Status field with validation
    if (body.status !== undefined) {
      const validStatuses = [
        "BACKLOG",
        "CLAUDE_IN_PROGRESS",
        "ANTIGRAVITY_IN_PROGRESS",
        "IN_DEBATE",
        "SYNTHESIS",
        "TESTING",
        "COMPLETED",
        "FAILED",
      ] as const;
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Valid values: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      // Auto-set timestamp fields based on status transitions
      if (
        body.status === "CLAUDE_IN_PROGRESS" ||
        body.status === "ANTIGRAVITY_IN_PROGRESS"
      ) {
        if (!existing.startedAt) {
          updateData.startedAt = new Date();
        }
      }
      if (body.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }

    // Priority field with validation
    if (body.priority !== undefined) {
      const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          {
            error: `Invalid priority. Valid values: ${validPriorities.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updateData.priority = body.priority;
    }

    // Nullable integer fields
    const intFields = [
      "claudePrNumber",
      "antigravityPrNumber",
      "synthesisPrNumber",
      "estimatedMinutes",
      "actualMinutes",
    ] as const;

    for (const field of intFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] === null ? null : Number(body[field]);
      }
    }

    // MilestoneId
    if (body.milestoneId !== undefined) {
      if (body.milestoneId === null) {
        updateData.milestoneId = null;
      } else {
        // Verify milestone belongs to the same project
        const milestone = await prisma.milestone.findUnique({
          where: { id: body.milestoneId },
          select: { projectId: true },
        });
        if (!milestone || milestone.projectId !== existing.projectId) {
          return NextResponse.json(
            {
              error:
                "Milestone not found or does not belong to this task's project",
            },
            { status: 400 }
          );
        }
        updateData.milestoneId = body.milestoneId;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            phase: true,
          },
        },
        _count: {
          select: { debateLogs: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/tasks/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]
 * Action dispatcher (e.g. merge synthesis, retry duel, etc.)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (action === "merge") {
      // 1. Mark task as COMPLETED
      const updated = await prisma.task.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // 2. Add celebratory debate log
      await prisma.agentDebateLog.create({
        data: {
          taskId: id,
          speaker: "SYSTEM",
          phase: "synthesis",
          round: 3,
          qualityScore: 10,
          message: `🚀 Synthèse consensuelle validée par le développeur. Fusion actée sur la branche principale '${task.project.githubDefaultBranch}'.`,
        },
      });

      // 3. Broadcast phase change
      broadcastVibeEvent(
        "PHASE_CHANGED",
        task.projectId,
        { taskId: id, status: "COMPLETED", message: "Task merged successfully" },
        id
      );

      // 4. If Coolify is connected, optionally trigger auto-deploy
      if (task.project.coolifyServerUrl && task.project.coolifyAppUuid) {
        try {
          await enqueueDeployment({
            projectId: task.projectId,
            branch: task.project.githubDefaultBranch,
            environment: "PRODUCTION",
            taskId: id,
          });
        } catch (err) {
          console.warn("[Merge Action] Auto-deploy enqueue failed:", err);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Task merged & marked as COMPLETED",
        task: updated,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/tasks/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to process task action" },
      { status: 500 }
    );
  }
}
