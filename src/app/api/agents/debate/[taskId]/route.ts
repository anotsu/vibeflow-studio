// ============================================================
// API Route: /api/agents/debate/[taskId]
// Get all debate logs for a task
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ taskId: string }> };

/**
 * GET /api/agents/debate/[taskId]
 * Get all debate logs for a task, ordered by createdAt.
 * Includes round and phase grouping in the response.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, status: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch all debate logs ordered by createdAt
    const debateLogs = await prisma.agentDebateLog.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });

    // Group logs by round and phase for structured consumption
    const grouped: Record<
      number,
      Record<string, typeof debateLogs>
    > = {};

    for (const log of debateLogs) {
      const round = log.round;
      const phase = log.phase || "general";

      if (!grouped[round]) {
        grouped[round] = {};
      }
      if (!grouped[round][phase]) {
        grouped[round][phase] = [];
      }
      grouped[round][phase].push(log);
    }

    // Build rounds array for cleaner API response
    const rounds = Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([roundNumber, phases]) => ({
        round: Number(roundNumber),
        phases: Object.entries(phases).map(([phaseName, logs]) => ({
          phase: phaseName,
          messages: logs,
        })),
      }));

    return NextResponse.json({
      taskId,
      taskTitle: task.title,
      taskStatus: task.status,
      totalMessages: debateLogs.length,
      rounds,
      flat: debateLogs,
    });
  } catch (error) {
    console.error("[GET /api/agents/debate/[taskId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch debate logs" },
      { status: 500 }
    );
  }
}
