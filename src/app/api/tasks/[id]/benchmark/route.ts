// ============================================================
// VibeFlow Studio — API Route: Run Sandbox Benchmark on Task
// POST /api/tasks/[id]/benchmark
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runTaskSandboxBenchmark } from "@/lib/sandbox-runner";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await runTaskSandboxBenchmark(id);

    return NextResponse.json({
      success: true,
      benchmark: result,
    });
  } catch (error: any) {
    console.error("[POST /api/tasks/[id]/benchmark] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur exécution benchmark" },
      { status: 500 }
    );
  }
}
