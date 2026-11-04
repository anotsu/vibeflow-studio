// ============================================================
// API Route: /api/deployments
// List deployments & trigger new deployments
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueDeployment } from "@/lib/queue";
import type { DeploymentStatus, DeploymentEnvironment } from "@prisma/client";

/**
 * GET /api/deployments
 * List deployments for a project. Requires `projectId` query param.
 * Supports optional `branch` and `status` filter query params.
 * Ordered by createdAt desc.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const branchFilter = searchParams.get("branch");
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

    // Build where clause with optional filters
    const where: Record<string, unknown> = { projectId };

    if (branchFilter) {
      where.branch = branchFilter;
    }

    if (statusFilter) {
      const validStatuses: DeploymentStatus[] = [
        "QUEUED",
        "BUILDING",
        "RUNNING",
        "STOPPED",
        "FAILED",
        "CANCELLED",
      ];
      if (!validStatuses.includes(statusFilter as DeploymentStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status filter. Valid values: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
      where.status = statusFilter;
    }

    const deployments = await prisma.deployment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(deployments);
  } catch (error) {
    console.error("[GET /api/deployments] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deployments
 * Trigger a new deployment.
 * Body: { projectId, branch, environment?, commitSha? }
 * Creates a Deployment record with status QUEUED and enqueues a deployment job.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, branch, environment, commitSha } = body;

    // ── Validate required fields ──────────────────────────────
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }
    if (!branch || typeof branch !== "string" || branch.trim().length === 0) {
      return NextResponse.json(
        { error: "branch is required" },
        { status: 400 }
      );
    }

    // Validate environment if provided
    const validEnvironments: DeploymentEnvironment[] = [
      "PRODUCTION",
      "PREVIEW",
      "STAGING",
    ];
    const deployEnv: DeploymentEnvironment =
      environment && validEnvironments.includes(environment)
        ? environment
        : "PREVIEW";

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        coolifyAppUuid: true,
        coolifyServerUrl: true,
        coolifyApiToken: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // ── Create Deployment record with QUEUED status ───────────
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        branch: branch.trim(),
        commitSha: commitSha?.trim() || null,
        environment: deployEnv,
        status: "QUEUED",
        triggeredBy: "user",
      },
    });

    // ── Enqueue the deployment job ────────────────────────────
    const job = await enqueueDeployment({
      projectId,
      branch: branch.trim(),
      commitSha: commitSha?.trim(),
      environment: deployEnv,
    });

    return NextResponse.json(
      {
        ...deployment,
        jobId: job.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/deployments] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger deployment" },
      { status: 500 }
    );
  }
}
