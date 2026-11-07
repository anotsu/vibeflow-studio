// ============================================================
// VibeFlow Studio — Authentication & RBAC Engine
// Robust password hashing via Node crypto scrypt, session management,
// role-based access control (USER vs ADMIN), and audit logging.
// Supports both PostgreSQL database and seamless standalone memory fallback.
// ============================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User, Session, AuditLog, UserRole, UserStatus } from "@prisma/client";

export type { UserRole, UserStatus };

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
}

export const SESSION_COOKIE_NAME = "vibeflow_session";
const SESSION_DURATION_DAYS = 14;

// ── In-Memory Fallback Store (keeps app fully usable in dev / standalone) ──
interface MemoryUser extends SafeUser {
  passwordHash: string;
  salt: string;
}

const globalAuthMemory = global as unknown as {
  __vibeflowUsers?: Map<string, MemoryUser>;
  __vibeflowSessions?: Map<string, { userId: string; expiresAt: Date }>;
  __vibeflowAuditLogs?: Array<{
    id: string;
    userId?: string | null;
    action: string;
    category: string;
    details?: string | null;
    ipAddress?: string | null;
    createdAt: Date;
  }>;
};

if (!globalAuthMemory.__vibeflowUsers) {
  globalAuthMemory.__vibeflowUsers = new Map<string, MemoryUser>();
  globalAuthMemory.__vibeflowSessions = new Map();
  globalAuthMemory.__vibeflowAuditLogs = [];

  // Seed default Admin: admin@vibeflow.local / AdminVibe2026!
  const adminSalt = crypto.randomBytes(16).toString("hex");
  const adminHash = crypto
    .scryptSync("AdminVibe2026!", adminSalt, 64)
    .toString("hex");

  const defaultAdmin: MemoryUser = {
    id: "user_admin_001",
    email: "admin@vibeflow.local",
    name: "Lead Administrator",
    role: "ADMIN",
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    passwordHash: adminHash,
    salt: adminSalt,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  // Seed default User: dev@vibeflow.local / UserVibe2026!
  const userSalt = crypto.randomBytes(16).toString("hex");
  const userHash = crypto
    .scryptSync("UserVibe2026!", userSalt, 64)
    .toString("hex");

  const defaultUser: MemoryUser = {
    id: "user_dev_002",
    email: "dev@vibeflow.local",
    name: "Alex Developer",
    role: "USER",
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=alex",
    passwordHash: userHash,
    salt: userSalt,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  globalAuthMemory.__vibeflowUsers.set(defaultAdmin.id, defaultAdmin);
  globalAuthMemory.__vibeflowUsers.set(defaultUser.id, defaultUser);
}

const memoryUsers = globalAuthMemory.__vibeflowUsers;
const memorySessions = globalAuthMemory.__vibeflowSessions!;
const memoryAuditLogs = globalAuthMemory.__vibeflowAuditLogs!;

/**
 * Hashes a plaintext password using scrypt.
 */
export function hashPassword(
  password: string,
  providedSalt?: string
): { hash: string; salt: string } {
  const salt = providedSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

/**
 * Verifies a password against a hash using constant-time comparison.
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

/**
 * Sanitizes user object by stripping hash and salt.
 */
export function toSafeUser(user: any): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Creates an active session for a user.
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Try DB first
  try {
    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  } catch {
    // Fallback in-memory
    memorySessions.set(token, { userId, expiresAt });
  }

  return { token, expiresAt };
}

/**
 * Retrieves the currently authenticated user from cookies or Authorization header.
 */
export async function getSessionUser(req?: Request): Promise<SafeUser | null> {
  let token: string | undefined;

  // 1. Try reading from Request cookies / Authorization header
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Try reading from Next.js cookie jar
  if (!token) {
    try {
      const cookieJar = await cookies();
      token = cookieJar.get(SESSION_COOKIE_NAME)?.value;
    } catch {}
  }

  if (!token) return null;

  // Try DB lookup
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date() && session.user.status === "ACTIVE") {
      return toSafeUser(session.user);
    }
  } catch {
    // Fallback in-memory lookup
    const memSession = memorySessions.get(token);
    if (memSession && memSession.expiresAt > new Date()) {
      const user = memoryUsers.get(memSession.userId);
      if (user && user.status === "ACTIVE") {
        return toSafeUser(user);
      }
    }
  }

  return null;
}

/**
 * Enforces that a user is logged in. Throws error or returns 401.
 */
export async function requireAuth(req?: Request): Promise<SafeUser> {
  const user = await getSessionUser(req);
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentification requise pour cette opération.");
  }
  return user;
}

/**
 * Enforces that the logged-in user is an ADMIN. Throws error or returns 403.
 */
export async function requireAdmin(req?: Request): Promise<SafeUser> {
  const user = await requireAuth(req);
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN: Droits d'administrateur requis.");
  }
  return user;
}

/**
 * Logs a system or security event to the audit trail.
 */
export async function logAuditEvent(entry: {
  userId?: string | null;
  action: string;
  category: "AUTH" | "ADMIN" | "DEPLOYMENT" | "SECURITY" | "PROJECT";
  details?: string | null;
  ipAddress?: string | null;
}) {
  const auditRecord = {
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    userId: entry.userId || null,
    action: entry.action,
    category: entry.category,
    details: entry.details || null,
    ipAddress: entry.ipAddress || null,
    createdAt: new Date(),
  };

  memoryAuditLogs.unshift(auditRecord);
  if (memoryAuditLogs.length > 500) memoryAuditLogs.pop();

  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        category: entry.category,
        details: entry.details,
        ipAddress: entry.ipAddress,
      },
    });
  } catch {}
}

/**
 * Lists audit logs with pagination and filters.
 */
export async function getAuditLogs(options?: {
  category?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const limit = options?.limit || 50;

  try {
    const logs = await prisma.auditLog.findMany({
      where: options?.category ? { category: options.category } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (logs && logs.length > 0) return logs as any;
  } catch {}

  // Fallback to memory logs
  let filtered = [...memoryAuditLogs];
  if (options?.category) {
    filtered = filtered.filter((l) => l.category === options.category);
  }
  return filtered.slice(0, limit) as any;
}

/**
 * In-memory user management helpers for when DB is unreachable.
 */
export const memoryAuth = {
  findUserByEmail: (email: string) => {
    return Array.from(memoryUsers.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
  },
  findUserById: (id: string) => memoryUsers.get(id),
  getAllUsers: () => Array.from(memoryUsers.values()).map(toSafeUser),
  createUser: (userData: MemoryUser) => {
    memoryUsers.set(userData.id, userData);
    return toSafeUser(userData);
  },
  updateUser: (id: string, updates: Partial<MemoryUser>) => {
    const existing = memoryUsers.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryUsers.set(id, updated);
    return toSafeUser(updated);
  },
  deleteUser: (id: string) => {
    return memoryUsers.delete(id);
  },
};
