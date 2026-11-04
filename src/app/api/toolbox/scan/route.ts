// ============================================================
// API Route: /api/toolbox/scan
// Trigger a toolbox scan for a project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/utils";
import { enqueueToolboxScan } from "@/lib/queue";

/**
 * POST /api/toolbox/scan
 * Trigger a toolbox scan for a project.
 * Body: { projectId }
 * Loads the project from DB, decrypts the GitHub token, and enqueues a scan job.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // ── Load project with required fields ─────────────────────
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        githubRepo: true,
        githubToken: true,
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

    // ── Resolve GitHub token ──────────────────────────────────
    // Try project-level token first, fall back to global settings
    let githubToken: string | null = null;

    if (project.githubToken) {
      try {
        githubToken = decrypt(project.githubToken);
      } catch (decryptError) {
        console.error(
          "[POST /api/toolbox/scan] Failed to decrypt project GitHub token:",
          decryptError
        );
        return NextResponse.json(
          { error: "Failed to decrypt GitHub token. Please re-enter it." },
          { status: 500 }
        );
      }
    } else {
      // Fall back to global default token
      const globalSettings = await prisma.globalSettings.findUnique({
        where: { id: "singleton" },
        select: { defaultGithubToken: true },
      });

      if (globalSettings?.defaultGithubToken) {
        try {
          githubToken = decrypt(globalSettings.defaultGithubToken);
        } catch (decryptError) {
          console.error(
            "[POST /api/toolbox/scan] Failed to decrypt global GitHub token:",
            decryptError
          );
        }
      }
    }

    if (!githubToken) {
      return NextResponse.json(
        {
          error:
            "No GitHub token available. Configure one on the project or in global settings.",
        },
        { status: 400 }
      );
    }

    // ── Enqueue the toolbox scan job ──────────────────────────
    const job = await enqueueToolboxScan({
      projectId,
      githubRepo: project.githubRepo,
      githubToken,
    });

    return NextResponse.json(
      {
        jobId: job.id,
        message: "Scan queued",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[POST /api/toolbox/scan] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger toolbox scan" },
      { status: 500 }
    );
  }
}
