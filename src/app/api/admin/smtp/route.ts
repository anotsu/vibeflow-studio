// ============================================================
// VibeFlow Studio — API Route: /api/admin/smtp
// Manages SMTP configuration and connection testing for Admins
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSmtpConfig, saveSmtpConfig, testSmtpConnection } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const config = await getSmtpConfig();
    const maskedConfig = {
      ...config,
      password: config.password ? "••••••••" : "",
    };

    return NextResponse.json({ config: maskedConfig });
  } catch (err: any) {
    console.error("[Admin SMTP API] Error fetching SMTP config:", err);
    return NextResponse.json({ error: err.message || "Accès refusé" }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { action, config, testEmail } = await req.json();

    if (action === "save") {
      const current = await getSmtpConfig();
      const newPassword =
        config.password && config.password !== "••••••••"
          ? config.password
          : current.password;

      const saved = await saveSmtpConfig({
        ...config,
        password: newPassword,
      });

      return NextResponse.json({
        success: true,
        message: "Configuration SMTP enregistrée avec succès.",
        config: {
          ...saved,
          password: saved.password ? "••••••••" : "",
        },
      });
    }

    if (action === "test") {
      const recipient = testEmail || admin.email;
      const testResult = await testSmtpConnection(recipient);

      if (!testResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: testResult.message,
            details: testResult.details,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: testResult.message,
        details: testResult.details,
      });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err: any) {
    console.error("[Admin SMTP API] Error in action:", err);
    return NextResponse.json({ error: err.message || "Accès refusé" }, { status: 403 });
  }
}
