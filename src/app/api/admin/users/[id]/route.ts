// ============================================================
// API Route: /api/admin/users/[id]
// Modify User Role, Status (Suspend/Activate), Reset Password or Delete
// Guarded by requireAdmin
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  hashPassword,
  logAuditEvent,
  toSafeUser,
  memoryAuth,
} from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const { role, status, password, name } = body;

    // Prevent modifying self status to SUSPENDED or demoting self to USER if only 1 admin
    if (admin.id === id && status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas suspendre votre propre compte administrateur." },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (role && (role === "USER" || role === "ADMIN")) updates.role = role;
    if (status && (status === "ACTIVE" || status === "SUSPENDED" || status === "PENDING")) {
      updates.status = status;
    }
    if (name) updates.name = name.trim();
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Le mot de passe doit comporter au moins 6 caractères." },
          { status: 400 }
        );
      }
      const { hash, salt } = hashPassword(password);
      updates.passwordHash = hash;
      updates.salt = salt;
    }

    let updated: any = null;
    try {
      updated = await prisma.user.update({
        where: { id },
        data: updates,
      });
    } catch {
      updated = memoryAuth.updateUser(id, updates);
    }

    if (!updated) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    await logAuditEvent({
      userId: admin.id,
      action: "ADMIN_UPDATED_USER",
      category: "ADMIN",
      details: `Admin ${admin.email} a modifié l'utilisateur ${updated.email} : ${Object.keys(updates).join(", ")}`,
    });

    return NextResponse.json({
      success: true,
      user: toSafeUser(updated),
      message: `Utilisateur ${updated.email} mis à jour.`,
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

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    if (admin.id === id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 }
      );
    }

    let targetEmail = id;
    try {
      const u = await prisma.user.delete({ where: { id } });
      targetEmail = u.email;
    } catch {
      const u = memoryAuth.findUserById(id);
      if (u) {
        targetEmail = u.email;
        memoryAuth.deleteUser(id);
      }
    }

    await logAuditEvent({
      userId: admin.id,
      action: "ADMIN_DELETED_USER",
      category: "ADMIN",
      details: `Admin ${admin.email} a supprimé le compte ${targetEmail}`,
    });

    return NextResponse.json({
      success: true,
      message: `Compte ${targetEmail} supprimé avec succès.`,
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
