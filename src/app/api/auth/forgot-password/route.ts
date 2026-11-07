// ============================================================
// VibeFlow Studio — API Route: /api/auth/forgot-password
// Generates secure reset token & dispatches via SMTP or direct fallback
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, memoryAuth } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Veuillez renseigner une adresse email valide." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists (DB or memory fallback)
    let userExists = false;
    try {
      const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (user) userExists = true;
    } catch {}

    if (!userExists) {
      const memUser = memoryAuth.findUserByEmail(cleanEmail);
      if (memUser) userExists = true;
    }

    if (!userExists) {
      return NextResponse.json(
        { error: "Aucun compte n'est associé à cette adresse email." },
        { status: 404 }
      );
    }

    // Generate token & 6-digit code
    const { token, code } = await createPasswordResetToken(cleanEmail);

    // Dispatch via SMTP
    const origin = req.nextUrl.origin || "http://localhost:3000";
    const emailResult = await sendPasswordResetEmail(cleanEmail, token, code, origin);

    return NextResponse.json({
      success: true,
      message: emailResult.message,
      sent: emailResult.sent,
      code: emailResult.code,
      directLink: emailResult.directLink,
    });
  } catch (err: any) {
    console.error("[ForgotPassword API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de la demande de réinitialisation." },
      { status: 500 }
    );
  }
}
