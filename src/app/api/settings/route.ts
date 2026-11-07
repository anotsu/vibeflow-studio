// ============================================================
// VibeFlow Studio — Global Settings & Integration Healthchecks
// Real-time connectivity tester for GitHub, Coolify & Anthropic
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/utils";
import { Octokit } from "octokit";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { id: "singleton" },
    });

    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    
    // Check real Claude session
    let hasClaudeAuth = false;
    const claudeJson = path.join(homeDir, ".claude.json");
    if (fs.existsSync(claudeJson)) {
      try {
        const raw = JSON.parse(fs.readFileSync(claudeJson, "utf-8"));
        if (raw.oauthAccount || raw.sessionKey || raw.primaryApiKey || raw.tokens) {
          hasClaudeAuth = true;
        }
      } catch {}
    }

    // Check real Antigravity session
    let hasAgyAuth = false;
    const agyJson = path.join(homeDir, ".gemini", "antigravity-cli", "settings.json");
    if (fs.existsSync(agyJson)) {
      try {
        const raw = JSON.parse(fs.readFileSync(agyJson, "utf-8"));
        if (raw.geminiApiKey && raw.geminiApiKey.trim().length > 10) {
          hasAgyAuth = true;
        }
      } catch {}
    }

    // Check installed binaries
    const isWin = process.platform === "win32";
    const claudeInstalled =
      fs.existsSync("/usr/local/bin/claude") ||
      fs.existsSync(path.join(homeDir, ".npm-global", "bin", "claude")) ||
      (isWin && fs.existsSync(path.join(process.env.APPDATA || "", "npm", "claude.cmd")));

    const agyInstalled =
      fs.existsSync("/usr/local/bin/agy") ||
      fs.existsSync("/usr/local/bin/antigravity") ||
      fs.existsSync(path.join(process.cwd(), "scripts", "antigravity-cli.js"));

    return NextResponse.json({
      hasGithubToken: Boolean(settings?.defaultGithubToken),
      hasAnthropicKey: Boolean(settings?.defaultAnthropicKey),
      defaultCoolifyUrl: settings?.defaultCoolifyUrl || "",
      hasCoolifyToken: Boolean(settings?.defaultCoolifyToken),
      redisUrl: settings?.redisUrl || "redis://localhost:6379",
      autoModeIntervalMs: settings?.autoModeIntervalMs || 300000,
      maxConcurrentTasks: settings?.maxConcurrentTasks || 2,
      claudeCliInstalled: Boolean(claudeInstalled),
      antigravityCliInstalled: Boolean(agyInstalled),
      hasClaudeAuth,
      hasAgyAuth,
      defaultEngine: "pro_clis",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read global settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Healthcheck: Test GitHub Connection ─────────────────
    if (action === "test_github") {
      const token = body.token || process.env.GITHUB_TOKEN;
      if (!token) {
        return NextResponse.json({ success: false, error: "Aucun token GitHub fourni" });
      }
      try {
        const octokit = new Octokit({ auth: token });
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const { data: rateLimit } = await octokit.rest.rateLimit.get();
        return NextResponse.json({
          success: true,
          username: user.login,
          avatarUrl: user.avatar_url,
          rateLimitRemaining: rateLimit.rate.remaining,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || "Échec d'authentification GitHub",
        });
      }
    }

    // ── Healthcheck: Test Coolify API ───────────────────────
    if (action === "test_coolify") {
      const { url, token } = body;
      const targetUrl = url || process.env.COOLIFY_API_URL;
      const targetToken = token || process.env.COOLIFY_API_TOKEN;

      if (!targetUrl) {
        return NextResponse.json({ success: false, error: "URL Coolify manquante" });
      }

      try {
        const normalizedUrl = targetUrl.replace(/\/+$/, "");
        const res = await fetch(`${normalizedUrl}/api/v1/healthcheck`, {
          headers: {
            Authorization: `Bearer ${targetToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          return NextResponse.json({ success: true, status: "Healthy" });
        } else {
          return NextResponse.json({
            success: false,
            error: `Coolify a répondu avec le statut ${res.status}`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Impossible de contacter Coolify: ${err.message}`,
        });
      }
    }

    // ── Healthcheck: Test Claude API ────────────────────────
    if (action === "test_claude") {
      const key = body.key || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        return NextResponse.json({ success: false, error: "Clé API Anthropic manquante" });
      }
      try {
        const client = new Anthropic({ apiKey: key });
        const response = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 15,
          messages: [{ role: "user", content: "Ping" }],
        });
        return NextResponse.json({
          success: true,
          model: response.model,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || "Clé Anthropic invalide",
        });
      }
    }

    // ── Save Global Settings ────────────────────────────────
    const updateData: any = {};
    if (body.githubToken) updateData.defaultGithubToken = encrypt(body.githubToken);
    if (body.anthropicApiKey) updateData.defaultAnthropicKey = encrypt(body.anthropicApiKey);
    if (body.coolifyApiToken) updateData.defaultCoolifyToken = encrypt(body.coolifyApiToken);
    if (body.coolifyUrl) updateData.defaultCoolifyUrl = body.coolifyUrl;
    if (body.redisUrl) updateData.redisUrl = body.redisUrl;
    if (body.autoModeIntervalMs) updateData.autoModeIntervalMs = Number(body.autoModeIntervalMs);
    if (body.maxConcurrentTasks) updateData.maxConcurrentTasks = Number(body.maxConcurrentTasks);

    await prisma.globalSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...updateData },
      update: updateData,
    });

    return NextResponse.json({ success: true, message: "Paramètres enregistrés" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
