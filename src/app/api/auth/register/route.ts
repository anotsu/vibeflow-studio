// ============================================================
// API Route: /api/auth/register
// User Registration & Auto-Session Creation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  createSession,
  logAuditEvent,
  toSafeUser,
  memoryAuth,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit comporter au moins 6 caractères." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    } catch {
      existingUser = memoryAuth.findUserByEmail(cleanEmail);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }

    // Check total users count to make first user an ADMIN automatically
    let totalUsersCount = 0;
    try {
      totalUsersCount = await prisma.user.count();
    } catch {
      totalUsersCount = memoryAuth.getAllUsers().length;
    }

    const assignedRole = totalUsersCount === 0 ? "ADMIN" : "USER";
    const { hash, salt } = hashPassword(password);
    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

    let createdUser: any = null;

    try {
      createdUser = await prisma.user.create({
        data: {
          id: userId,
          email: cleanEmail,
          name: name.trim(),
          passwordHash: hash,
          salt,
          role: assignedRole,
          status: "ACTIVE",
          avatar,
          lastLoginAt: new Date(),
        },
      });
    } catch (dbErr) {
      // Fallback in-memory
      createdUser = memoryAuth.createUser({
        id: userId,
        email: cleanEmail,
        name: name.trim(),
        role: assignedRole,
        status: "ACTIVE",
        avatar,
        passwordHash: hash,
        salt,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });
    }

    const safe = toSafeUser(createdUser);

    // Create active session
    const ip = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;
    const { token, expiresAt } = await createSession(safe.id, ip, userAgent);

    // Set HttpOnly session cookie
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
      action: "USER_REGISTERED",
      category: "AUTH",
      details: `Création de compte pour ${safe.email} avec le rôle ${safe.role}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: safe,
      message: `Bienvenue ${safe.name} ! Compte créé avec le rôle ${safe.role}.`,
    });
  } catch (error: any) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la création du compte." },
      { status: 500 }
    );
  }
}
