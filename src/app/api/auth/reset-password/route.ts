// ============================================================
// VibeFlow Studio — API Route: /api/auth/reset-password
// Validates token/code and applies new password
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { tokenOrCode, newPassword } = await req.json();

    if (!tokenOrCode || typeof tokenOrCode !== "string") {
      return NextResponse.json(
        { error: "Le jeton ou code de réinitialisation est requis." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }

    const result = await consumePasswordResetToken(tokenOrCode, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Impossible de réinitialiser le mot de passe." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
    });
  } catch (err: any) {
    console.error("[ResetPassword API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de la réinitialisation du mot de passe." },
      { status: 500 }
    );
  }
}
