// ============================================================
// API Route: /api/admin/users
// Admin User Management (List & Create Users with RBAC)
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
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    let users: any[] = [];
    try {
      users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { projects: true, auditLogs: true },
          },
        },
      });
    } catch {
      users = memoryAuth.getAllUsers().map((u) => ({
        ...u,
        _count: { projects: 1, auditLogs: 2 },
      }));
    }

    const safeUsers = users.map((u) => ({
      ...toSafeUser(u),
      projectsCount: u._count?.projects || 0,
    }));

    return NextResponse.json({
      users: safeUsers,
      total: safeUsers.length,
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

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetRole = role === "ADMIN" ? "ADMIN" : "USER";

    // Check existing
    let existing = null;
    try {
      existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    } catch {
      existing = memoryAuth.findUserByEmail(cleanEmail);
    }

    if (existing) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà." },
        { status: 409 }
      );
    }

    const { hash, salt } = hashPassword(password);
    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

    let created: any = null;
    try {
      created = await prisma.user.create({
        data: {
          id: userId,
          email: cleanEmail,
          name: name.trim(),
          passwordHash: hash,
          salt,
          role: targetRole,
          status: "ACTIVE",
          avatar,
        },
      });
    } catch {
      created = memoryAuth.createUser({
        id: userId,
        email: cleanEmail,
        name: name.trim(),
        role: targetRole,
        status: "ACTIVE",
        avatar,
        passwordHash: hash,
        salt,
        createdAt: new Date(),
      });
    }

    await logAuditEvent({
      userId: admin.id,
      action: "ADMIN_CREATED_USER",
      category: "ADMIN",
      details: `Admin ${admin.email} a créé le compte ${cleanEmail} (Rôle: ${targetRole})`,
    });

    return NextResponse.json({
      success: true,
      user: toSafeUser(created),
      message: `Compte utilisateur créé avec succès pour ${cleanEmail}.`,
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
