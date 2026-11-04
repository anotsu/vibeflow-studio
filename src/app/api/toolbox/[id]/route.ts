// ============================================================
// API Route: /api/toolbox/[id]
// Update or delete an individual toolbox item
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ToolboxStatus } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, version, description, configJson } = body;

    const existing = await prisma.toolboxItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Toolbox item not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status as ToolboxStatus;
    if (version !== undefined) updateData.version = version;
    if (description !== undefined) updateData.description = description;
    if (configJson !== undefined) updateData.configJson = configJson;

    if (status === "ACQUIRED") {
      updateData.installedAt = new Date();
    }

    const updated = await prisma.toolboxItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PATCH /api/toolbox/[id]] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.toolboxItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/toolbox/[id]] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
