// ============================================================
// API Route: /api/auth/login
// User Authentication & Session Generation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  logAuditEvent,
  toSafeUser,
  memoryAuth,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Find user in DB or memory
    let user: any = null;
    let isMemory = false;

    try {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    } catch {
      user = memoryAuth.findUserByEmail(cleanEmail);
      isMemory = true;
    }

    if (!user) {
      user = memoryAuth.findUserByEmail(cleanEmail);
      isMemory = true;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    // 2. Check account status
    if (user.status === "SUSPENDED") {
      await logAuditEvent({
        userId: user.id,
        action: "SUSPENDED_LOGIN_BLOCKED",
        category: "SECURITY",
        details: `Tentative de connexion bloquée pour compte suspendu : ${user.email}`,
      });

      return NextResponse.json(
        { error: "Ce compte a été suspendu par un administrateur." },
        { status: 403 }
      );
    }

    // 3. Verify password
    const valid = verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    // 4. Update lastLoginAt
    try {
      if (!isMemory) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } else {
        memoryAuth.updateUser(user.id, { lastLoginAt: new Date() });
      }
    } catch {}

    const safe = toSafeUser(user);
    const ip = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // 5. Create active session
    const { token, expiresAt } = await createSession(safe.id, ip, userAgent);

    // 6. Set cookie
    const cookieJar = await cookies();
    cookieJar.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    await logAuditEvent({
      userId: safe.id,
      action: "USER_LOGIN",
      category: "AUTH",
      details: `Connexion réussie pour ${safe.email} (${safe.role})`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: safe,
      message: `Connexion réussie. Bienvenue, ${safe.name} !`,
    });
  } catch (error: any) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de connexion." },
      { status: 500 }
    );
  }
}
