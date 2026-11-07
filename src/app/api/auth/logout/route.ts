// ============================================================
// API Route: /api/auth/logout
// Terminate Session & Clear Cookie
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  logAuditEvent,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const cookieJar = await cookies();
    const token = cookieJar.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      try {
        await prisma.session.delete({ where: { token } });
      } catch {}
    }

    cookieJar.delete(SESSION_COOKIE_NAME);

    if (user) {
      await logAuditEvent({
        userId: user.id,
        action: "USER_LOGOUT",
        category: "AUTH",
        details: `Déconnexion volontaire de ${user.email}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Déconnexion effectuée avec succès.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur de déconnexion." },
      { status: 500 }
    );
  }
}
