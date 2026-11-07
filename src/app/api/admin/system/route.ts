// ============================================================
// API Route: /api/admin/system
// System Administration, Health Checks, Queue Inspection & Worktree Cleanup
// Guarded by requireAdmin
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAuditEvent } from "@/lib/auth";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    // 1. Check Database Health
    let dbStatus = "CONNECTED";
    let dbLatencyMs = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = "STANDALONE_FALLBACK";
    }

    // 2. Check Worktrees on disk (/tmp/vibeflow-worktrees)
    const tmpDir = process.env.VIBEFLOW_WORKTREES_DIR || path.join(os.tmpdir(), "vibeflow-worktrees");
    let worktreesCount = 0;
    let worktreeFolders: string[] = [];
    if (fs.existsSync(tmpDir)) {
      try {
        const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
        worktreeFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        worktreesCount = worktreeFolders.length;
      } catch {}
    }

    // 3. System Load & Node Stats
    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptimeMinutes: Math.round(os.uptime() / 60),
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      cpuCount: os.cpus().length,
      nodeVersion: process.version,
    };

    // 4. Counts
    let projectsCount = 0;
    let tasksCount = 0;
    let deploymentsCount = 0;
    let usersCount = 0;

    try {
      [projectsCount, tasksCount, deploymentsCount, usersCount] = await Promise.all([
        prisma.project.count().catch(() => 0),
        prisma.task.count().catch(() => 0),
        prisma.deployment.count().catch(() => 0),
        prisma.user.count().catch(() => 0),
      ]);
    } catch {}

    return NextResponse.json({
      health: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        worktrees: { path: tmpDir, activeCount: worktreesCount, folders: worktreeFolders.slice(0, 10) },
        system: systemInfo,
      },
      counts: {
        projects: projectsCount,
        tasks: tasksCount,
        deployments: deploymentsCount,
        users: usersCount,
      },
      adminUser: { id: admin.id, email: admin.email, role: admin.role },
    });
  } catch (error: any) {
    const status = error.message?.includes("FORBIDDEN")
      ? 403
      : error.message?.includes("UNAUTHORIZED")
      ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { action } = body;

    if (action === "purge_worktrees") {
      const tmpDir = process.env.VIBEFLOW_WORKTREES_DIR || path.join(os.tmpdir(), "vibeflow-worktrees");
      let purgedCount = 0;

      if (fs.existsSync(tmpDir)) {
        try {
          const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(tmpDir, entry.name);
              fs.rmSync(fullPath, { recursive: true, force: true });
              purgedCount++;
            }
          }
        } catch (e: any) {
          throw new Error(`Erreur lors de la purge : ${e.message}`);
        }
      }

      await logAuditEvent({
        userId: admin.id,
        action: "ADMIN_PURGE_WORKTREES",
        category: "ADMIN",
        details: `Purge de ${purgedCount} répertoires de worktrees temporaires par ${admin.email}`,
      });

      return NextResponse.json({
        success: true,
        message: `${purgedCount} dossiers de worktrees orphelins ont été purgés.`,
      });
    }

    if (action === "test_db") {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return NextResponse.json({ success: true, message: `PostgreSQL opérationnel (latence : ${latency}ms).` });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error: any) {
    const status = error.message?.includes("FORBIDDEN")
      ? 403
      : error.message?.includes("UNAUTHORIZED")
      ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
