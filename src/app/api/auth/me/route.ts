// ============================================================
// API Route: /api/auth/me
// Returns or updates the currently logged-in user profile
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  requireAuth,
  hashPassword,
  logAuditEvent,
  toSafeUser,
  memoryAuth,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await requireAuth(req);
    const body = await req.json();
    const { name, avatar, password } = body;

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (avatar) updateData.avatar = avatar.trim();

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Le mot de passe doit comporter au moins 6 caractères." },
          { status: 400 }
        );
      }
      const { hash, salt } = hashPassword(password);
      updateData.passwordHash = hash;
      updateData.salt = salt;
    }

    let updatedUser: any = null;
    try {
      updatedUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: updateData,
      });
    } catch {
      updatedUser = memoryAuth.updateUser(currentUser.id, updateData);
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: "PROFILE_UPDATED",
      category: "AUTH",
      details: `Mise à jour du profil pour ${currentUser.email}${password ? " (mot de passe changé)" : ""}`,
    });

    return NextResponse.json({
      success: true,
      user: toSafeUser(updatedUser),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la mise à jour du profil" },
      { status: 400 }
    );
  }
}
