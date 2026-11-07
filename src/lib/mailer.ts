// ============================================================
// VibeFlow Studio — SMTP & Email Dispatcher Engine
// Manages Admin SMTP Settings, Test Pings & Password Reset Emails
// ============================================================

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/auth";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  from: string;
  enabled: boolean;
}

const DEFAULT_SMTP: SmtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || "",
  password: process.env.SMTP_PASSWORD || "",
  from: process.env.SMTP_FROM || "VibeFlow Studio <noreply@vibeflow.local>",
  enabled: process.env.SMTP_ENABLED === "true",
};

// Global memory cache for standalone dev
const globalMailer = global as unknown as {
  __vibeflowSmtpConfig?: SmtpConfig;
};

if (!globalMailer.__vibeflowSmtpConfig) {
  globalMailer.__vibeflowSmtpConfig = { ...DEFAULT_SMTP };
}

/**
 * Retrieves the active SMTP configuration from database or fallback.
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "smtp_config" },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      const merged: SmtpConfig = {
        ...DEFAULT_SMTP,
        ...parsed,
      };
      globalMailer.__vibeflowSmtpConfig = merged;
      return merged;
    }
  } catch {}

  return globalMailer.__vibeflowSmtpConfig || { ...DEFAULT_SMTP };
}

/**
 * Saves and updates the SMTP configuration in database and memory.
 */
export async function saveSmtpConfig(config: Partial<SmtpConfig>): Promise<SmtpConfig> {
  const current = await getSmtpConfig();
  const updated: SmtpConfig = {
    ...current,
    ...config,
    port: Number(config.port) || current.port,
    secure: Boolean(config.secure),
    enabled: Boolean(config.enabled),
  };

  globalMailer.__vibeflowSmtpConfig = updated;

  try {
    await prisma.systemSetting.upsert({
      where: { key: "smtp_config" },
      create: {
        key: "smtp_config",
        value: JSON.stringify(updated),
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    await logAuditEvent({
      action: "SMTP_CONFIG_UPDATED",
      category: "ADMIN",
      details: `Hôte: ${updated.host}:${updated.port}, Activé: ${updated.enabled}`,
    });
  } catch {}

  return updated;
}

/**
 * Creates a Nodemailer transport instance using the current SMTP settings.
 */
function createTransportInstance(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? {
            user: config.user,
            pass: config.password,
          }
        : undefined,
    tls: {
      rejectUnauthorized: false, // allow self-signed local certs
    },
  });
}

/**
 * Tests the SMTP server connection and sends a verification email.
 */
export async function testSmtpConnection(
  targetEmail: string
): Promise<{ success: boolean; message: string; details?: string }> {
  const config = await getSmtpConfig();

  if (!config.host) {
    return {
      success: false,
      message: "Veuillez renseigner un hôte SMTP valide.",
    };
  }

  try {
    const transporter = createTransportInstance(config);

    // 1. Verify connection
    await transporter.verify();

    // 2. Send ping email
    const info = await transporter.sendMail({
      from: config.from || "VibeFlow Studio <noreply@vibeflow.local>",
      to: targetEmail,
      subject: "⚡ VibeFlow Studio — Test de Connexion SMTP Réussi",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 32px; color: #f8fafc; border: 1px solid #1e293b;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(139, 92, 246, 0.2); border: 1px solid #8b5cf6; display: flex; align-items: center; justify-center; text-align: center; line-height: 36px; font-weight: bold; color: #8b5cf6; font-size: 20px;">⚡</div>
            <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #ffffff;">VibeFlow Studio</h1>
          </div>
          <h2 style="font-size: 16px; color: #10b981; margin-top: 0;">Connexion SMTP opérationnelle !</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
            Ce message confirme que la configuration de messagerie de votre instance VibeFlow Studio fonctionne parfaitement.
          </p>
          <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 12px; font-family: monospace; color: #cbd5e1;">
            <div>Hôte SMTP : ${config.host}:${config.port}</div>
            <div>Sécurisé (SSL/TLS) : ${config.secure ? "Oui" : "Non"}</div>
            <div>Expéditeur : ${config.from}</div>
            <div>Date du test : ${new Date().toLocaleString("fr-FR")}</div>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            Notification envoyée automatiquement depuis la console d'administration VibeFlow Studio.
          </p>
        </div>
      `,
    });

    await logAuditEvent({
      action: "SMTP_TEST_SUCCESS",
      category: "ADMIN",
      details: `Message ID: ${info.messageId} envoyé à ${targetEmail}`,
    });

    return {
      success: true,
      message: `Connexion réussie ! Email de test envoyé à ${targetEmail}.`,
      details: `ID: ${info.messageId}`,
    };
  } catch (err: any) {
    await logAuditEvent({
      action: "SMTP_TEST_FAILED",
      category: "ADMIN",
      details: `Erreur: ${err.message}`,
    });

    return {
      success: false,
      message: `Échec de connexion SMTP : ${err.message}`,
      details: err.stack,
    };
  }
}

/**
 * Sends a password reset email or returns direct link/code when SMTP is disabled.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  code: string,
  origin: string = "http://localhost:3000"
): Promise<{ sent: boolean; code: string; directLink: string; message: string }> {
  const config = await getSmtpConfig();
  const cleanOrigin = origin.replace(/\/+$/, "");
  const directLink = `${cleanOrigin}/dashboard?resetToken=${encodeURIComponent(token)}`;

  // If SMTP is disabled or credentials missing, return graceful fallback with instant direct access
  if (!config.enabled || !config.host) {
    return {
      sent: false,
      code,
      directLink,
      message:
        "Le service SMTP n'étant pas actif, le lien sécurisé et le code de réinitialisation vous sont fournis directement ci-dessous.",
    };
  }

  try {
    const transporter = createTransportInstance(config);

    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: "🔒 VibeFlow Studio — Réinitialisation de votre mot de passe",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 32px; color: #f8fafc; border: 1px solid #1e293b;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 22px; font-weight: bold; color: #ffffff;">VibeFlow <span style="color: #8b5cf6;">Studio</span></span>
          </div>
          <h2 style="font-size: 18px; font-weight: bold; color: #ffffff; margin-top: 0;">Demande de réinitialisation de mot de passe</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
            Une demande de réinitialisation de mot de passe a été initiée pour votre compte <strong>${email}</strong>.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${directLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center;">
            <span style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 6px;">Ou utilisez votre code de vérification à 6 chiffres :</span>
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 6px; color: #f59e0b; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            Ce lien et ce code sont valables pendant <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </div>
      `,
    });

    return {
      sent: true,
      code,
      directLink,
      message: "Un email contenant le lien et le code de réinitialisation a été envoyé.",
    };
  } catch (err: any) {
    console.warn("[Mailer] Failed to send email via SMTP:", err.message);
    return {
      sent: false,
      code,
      directLink,
      message: `Échec d'envoi SMTP (${err.message}). Utilisez le code ou le lien direct ci-dessous.`,
    };
  }
}
