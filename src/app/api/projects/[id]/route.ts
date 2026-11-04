// ============================================================
// API Route: /api/projects/[id]
// Get, update, or delete a single project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/[id]
 * Get a single project by ID with all relations.
 * Milestones sorted by order, tasks by createdAt desc, deployments by createdAt desc.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        toolboxItems: {
          orderBy: { category: "asc" },
        },
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            debateLogs: {
              orderBy: { createdAt: "asc" },
            },
            milestone: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Mask encrypted tokens in the response
    const response = {
      ...project,
      anthropicApiKey: project.anthropicApiKey ? "••••••••" : null,
      coolifyApiToken: project.coolifyApiToken ? "••••••••" : null,
      githubToken: project.githubToken ? "••••••••" : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/projects/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Update project fields. Encrypts API tokens if they are updated.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify project exists
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Build update payload, encrypting any sensitive fields
    const updateData: Record<string, unknown> = {};

    const directFields = [
      "name",
      "vibeDescription",
      "githubRepo",
      "githubDefaultBranch",
      "coolifyAppUuid",
      "coolifyServerUrl",
      "mode",
    ] as const;

    for (const field of directFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          typeof body[field] === "string" ? body[field].trim() : body[field];
      }
    }

    // Encrypt sensitive tokens if provided (non-empty strings only)
    const encryptableFields = [
      "githubToken",
      "anthropicApiKey",
      "coolifyApiToken",
    ] as const;

    for (const field of encryptableFields) {
      if (body[field] !== undefined) {
        if (body[field] === null || body[field] === "") {
          // Allow clearing a token
          updateData[field] = null;
        } else if (typeof body[field] === "string") {
          updateData[field] = encrypt(body[field]);
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Mask tokens in response
    const response = {
      ...updated,
      anthropicApiKey: updated.anthropicApiKey ? "••••••••" : null,
      coolifyApiToken: updated.coolifyApiToken ? "••••••••" : null,
      githubToken: updated.githubToken ? "••••••••" : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[PATCH /api/projects/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project. Cascade deletes handle all relations.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify project exists
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
