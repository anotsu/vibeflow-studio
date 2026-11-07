// ============================================================
// VibeFlow Studio — Developer Notification Hub
// Phase 7.2 : Discord, Telegram & Slack Webhook Dispatcher
// Alerts developers in real-time on PR completion, self-healing & test verdicts
// ============================================================

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/utils";

export interface NotificationPayload {
  title: string;
  description: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  phase?: string;
  qualityScore?: number;
  winner?: string;
  previewUrl?: string;
  prUrl?: string;
  level?: "info" | "success" | "warning" | "error";
}

/**
 * Sends a rich notification to configured webhooks (Discord / Telegram).
 */
export async function sendDeveloperNotification(payload: NotificationPayload): Promise<{
  discordSent: boolean;
  telegramSent: boolean;
}> {
  let discordSent = false;
  let telegramSent = false;

  try {
    // 1. Fetch global settings or project settings
    const settings = await prisma.globalSettings.findUnique({
      where: { id: "singleton" },
    }).catch(() => null);

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    const emoji =
      payload.level === "error"
        ? "🚨"
        : payload.level === "warning"
        ? "⚠️"
        : payload.level === "success"
        ? "🚀"
        : "⚡";

    const color =
      payload.level === "error"
        ? 0xef4444
        : payload.level === "warning"
        ? 0xf59e0b
        : payload.level === "success"
        ? 0x10b981
        : 0x8b5cf6;

    // 2. Dispatch to Discord Webhook
    if (discordWebhookUrl) {
      try {
        const discordBody = {
          username: "VibeFlow Studio",
          avatar_url: "https://vibeflow.capstation.fr/favicon.ico",
          embeds: [
            {
              title: `${emoji} ${payload.title}`,
              description: payload.description,
              color,
              timestamp: new Date().toISOString(),
              fields: [
                ...(payload.projectName ? [{ name: "📁 Projet", value: payload.projectName, inline: true }] : []),
                ...(payload.taskTitle ? [{ name: "📌 Tâche", value: payload.taskTitle, inline: true }] : []),
                ...(payload.winner ? [{ name: "🏆 Vainqueur Duel", value: `**${payload.winner}**`, inline: true }] : []),
                ...(payload.qualityScore ? [{ name: "⚖️ Score Juge", value: `${payload.qualityScore}/10`, inline: true }] : []),
                ...(payload.previewUrl ? [{ name: "🌐 Aperçu Live", value: `[Tester la Preview](${payload.previewUrl})`, inline: true }] : []),
                ...(payload.prUrl ? [{ name: "🐙 Pull Request", value: `[Voir la PR GitHub](${payload.prUrl})`, inline: true }] : []),
              ],
              footer: {
                text: "VibeFlow Studio • Mode Pro-First (0€ Token)",
              },
            },
          ],
        };

        const res = await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordBody),
        });
        discordSent = res.ok;
      } catch (err) {
        console.warn("[Notifications] Discord dispatch failed:", err);
      }
    }

    // 3. Dispatch to Telegram Bot
    if (telegramBotToken && telegramChatId) {
      try {
        const text = `
<b>${emoji} VibeFlow Studio : ${payload.title}</b>

${payload.description}

${payload.projectName ? `📁 <b>Projet</b> : ${payload.projectName}\n` : ""}${
          payload.taskTitle ? `📌 <b>Tâche</b> : ${payload.taskTitle}\n` : ""
        }${payload.winner ? `🏆 <b>Vainqueur</b> : ${payload.winner}\n` : ""}${
          payload.qualityScore ? `⚖️ <b>Score</b> : ${payload.qualityScore}/10\n` : ""
        }${payload.previewUrl ? `🌐 <a href="${payload.previewUrl}">Aperçu Preview Live</a>\n` : ""}${
          payload.prUrl ? `🐙 <a href="${payload.prUrl}">Consulter la PR</a>\n` : ""
        }
<i>Piloté par VibeFlow Studio (0€ Token Cost)</i>
        `.trim();

        const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: false,
          }),
        });
        telegramSent = tgRes.ok;
      } catch (err) {
        console.warn("[Notifications] Telegram dispatch failed:", err);
      }
    }
  } catch (err) {
    console.error("[Notifications] Overall error:", err);
  }

  return { discordSent, telegramSent };
}
