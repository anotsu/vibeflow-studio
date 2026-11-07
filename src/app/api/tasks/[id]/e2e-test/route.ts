// ============================================================
// VibeFlow Studio — API Route: Automated E2E Testing & Web Vitals
// GET  /api/tasks/[id]/e2e-test -> Get or run E2E audit
// POST /api/tasks/[id]/e2e-test -> Trigger fresh E2E test run
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runDualE2ETest } from "@/lib/playwright-runner";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await runDualE2ETest(id);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[GET /api/tasks/[id]/e2e-test] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Échec de l'audit E2E" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const result = await runDualE2ETest(id);

    // Record system debate log entry with verdict
    await prisma.agentDebateLog.create({
      data: {
        taskId: id,
        speaker: "SYSTEM",
        phase: "e2e_testing",
        round: 2,
        qualityScore: result.verdict.winner === "claude" ? result.claude.score / 10 : result.antigravity.score / 10,
        message: `🧪 Audit E2E & Web Vitals validé : ${result.verdict.summary} (LCP Claude: ${result.claude.webVitals.lcpMs}ms, LCP Antigravity: ${result.antigravity.webVitals.lcpMs}ms). ${result.verdict.recommendation}`,
      },
    }).catch(() => {});

    // Broadcast SSE event
    broadcastVibeEvent(
      "TASK_UPDATED",
      task.projectId,
      {
        taskId: id,
        action: "e2e_test_completed",
        winner: result.verdict.winner,
      },
      id
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[POST /api/tasks/[id]/e2e-test] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Échec de l'exécution des tests E2E" },
      { status: 500 }
    );
  }
}
