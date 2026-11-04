// ============================================================
// API Route: /api/tasks
// List tasks for a project & create new tasks
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@prisma/client";

/**
 * GET /api/tasks
 * List tasks for a project. Requires `projectId` query param.
 * Supports optional `status` filter query param.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const statusFilter = searchParams.get("status");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const projectExists = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!projectExists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Build where clause with optional status filter
    const where: Record<string, unknown> = { projectId };
    if (statusFilter) {
      // Validate the status enum value
      const validStatuses: TaskStatus[] = [
        "BACKLOG",
        "CLAUDE_IN_PROGRESS",
        "ANTIGRAVITY_IN_PROGRESS",
        "IN_DEBATE",
        "SYNTHESIS",
        "TESTING",
        "COMPLETED",
        "FAILED",
      ];
      if (validStatuses.includes(statusFilter as TaskStatus)) {
        where.status = statusFilter;
      } else {
        return NextResponse.json(
          {
            error: `Invalid status filter. Valid values: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { debateLogs: true },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            phase: true,
            order: true,
          },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[GET /api/tasks] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task for a project.
 * Body: { projectId, title, description, milestoneId?, priority?, origin? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, title, description, milestoneId, priority, origin } =
      body;

    // ── Validate required fields ──────────────────────────────
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }
    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Task description is required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const projectExists = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!projectExists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Verify milestone exists (if provided)
    if (milestoneId) {
      const milestoneExists = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        select: { id: true, projectId: true },
      });
      if (!milestoneExists || milestoneExists.projectId !== projectId) {
        return NextResponse.json(
          { error: "Milestone not found or does not belong to this project" },
          { status: 400 }
        );
      }
    }

    // Validate priority enum if provided
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        {
          error: `Invalid priority. Valid values: ${validPriorities.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate origin enum if provided
    const validOrigins = [
      "USER",
      "AI_GENERATED",
      "AUTO_OPTIMIZATION",
    ] as const;
    if (origin && !validOrigins.includes(origin)) {
      return NextResponse.json(
        { error: `Invalid origin. Valid values: ${validOrigins.join(", ")}` },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title: title.trim(),
        description: description.trim(),
        milestoneId: milestoneId || null,
        priority: priority || "MEDIUM",
        origin: origin || "USER",
      },
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

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks] Error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
