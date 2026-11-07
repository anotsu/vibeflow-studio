// ============================================================
// VibeFlow Studio — API Route: /api/auth/change-password
// Allows authenticated users to change their own password
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, changeUserPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth(req);
    } catch {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "L'ancien et le nouveau mot de passe sont requis." },
        { status: 400 }
      );
    }

    const result = await changeUserPassword(user.id, oldPassword, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Échec de modification du mot de passe." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été modifié avec succès.",
    });
  } catch (err: any) {
    console.error("[ChangePassword API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
