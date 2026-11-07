// ============================================================
// API Route: /api/admin/audit-logs
// Audit Trail & Security Logs Explorer
// Guarded by requireAdmin
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAuditLogs } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await getAuditLogs({ category, limit });
    return NextResponse.json({ logs, total: logs.length });
  } catch (error: any) {
    const status = error.message?.includes("FORBIDDEN")
      ? 403
      : error.message?.includes("UNAUTHORIZED")
      ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
