// ============================================================
// API Route: /api/toolbox
// List & add toolbox items for a project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ToolboxCategory, ToolboxStatus } from "@prisma/client";

/**
 * GET /api/toolbox
 * List toolbox items for a project (query param `projectId`).
 * Groups items by status (ACQUIRED, MISSING, IN_PROGRESS).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

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

    const items = await prisma.toolboxItem.findMany({
      where: { projectId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Group by status
    const grouped: Record<ToolboxStatus, typeof items> = {
      ACQUIRED: [],
      MISSING: [],
      IN_PROGRESS: [],
    };

    for (const item of items) {
      grouped[item.status].push(item);
    }

    return NextResponse.json({
      projectId,
      total: items.length,
      grouped,
      flat: items,
    });
  } catch (error) {
    console.error("[GET /api/toolbox] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch toolbox items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/toolbox
 * Add a toolbox item manually.
 * Body: { projectId, name, category, status?, description?, configJson? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, category, status, description, configJson } = body;

    // ── Validate required fields ──────────────────────────────
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 }
      );
    }

    // Validate category enum
    const validCategories: ToolboxCategory[] = [
      "FRAMEWORK",
      "DATABASE",
      "AUTH",
      "PAYMENT",
      "UI_KIT",
      "API",
      "MONITORING",
      "CI_CD",
      "HOSTING",
      "TESTING",
      "SECURITY",
      "OTHER",
    ];
    if (!validCategories.includes(category as ToolboxCategory)) {
      return NextResponse.json(
        {
          error: `Invalid category. Valid values: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (status) {
      const validStatuses: ToolboxStatus[] = [
        "ACQUIRED",
        "MISSING",
        "IN_PROGRESS",
      ];
      if (!validStatuses.includes(status as ToolboxStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status. Valid values: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
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

    const item = await prisma.toolboxItem.create({
      data: {
        projectId,
        name: name.trim(),
        category: category as ToolboxCategory,
        status: (status as ToolboxStatus) || "MISSING",
        description: description?.trim() || null,
        configJson: configJson || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[POST /api/toolbox] Error:", error);
    return NextResponse.json(
      { error: "Failed to add toolbox item" },
      { status: 500 }
    );
  }
}
