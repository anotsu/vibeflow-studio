// ============================================================
// VibeFlow Studio — API Route: Obsidian Synchronization
// GET  /api/obsidian/sync -> Diagnostic, Vault Health & File Counts
// POST /api/obsidian/sync -> Trigger Sync (Single Task or Entire Project)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  syncTaskToObsidian,
  syncAllTasksToObsidian,
  getObsidianVaultHealth,
} from "@/lib/obsidian-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getObsidianVaultHealth();
    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[GET /api/obsidian/sync] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur vérification coffre Obsidian" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const taskId = body?.taskId;
    const projectId = body?.projectId;

    if (taskId) {
      // Sync single task
      const result = await syncTaskToObsidian(taskId);
      return NextResponse.json({
        success: true,
        message: `Tâche synchronisée vers Obsidian avec succès.`,
        result,
      });
    }

    // Sync all tasks (project or global)
    const result = await syncAllTasksToObsidian(projectId);
    return NextResponse.json({
      success: true,
      message: `${result.syncedCount} tâche(s) synchronisée(s) vers le coffre Obsidian.`,
      result,
    });
  } catch (error: any) {
    console.error("[POST /api/obsidian/sync] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur synchronisation Obsidian" },
      { status: 500 }
    );
  }
}
