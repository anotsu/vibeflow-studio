// ============================================================
// VibeFlow Studio — Pro CLI Setup & Healthcheck API Route
// GET  /api/settings/cli-setup -> Scan and diagnose Claude & Antigravity CLIs
// POST /api/settings/cli-setup -> Test prompts, save tokens, execute wizard actions
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { callAI } from "@/lib/ai-provider";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/utils";

const execAsync = promisify(exec);

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "/tmp";

export async function GET() {
  try {
    // 1. Diagnose Claude Code CLI
    let claudeInstalled = false;
    let claudeVersion = "Non détecté";
    try {
      const { stdout } = await execAsync("claude --version", { timeout: 3000 });
      claudeInstalled = true;
      claudeVersion = stdout.trim();
    } catch {
      // Check if global binary exists in typical paths
      claudeInstalled =
        fs.existsSync("/usr/local/bin/claude") ||
        fs.existsSync(path.join(HOME_DIR, ".npm-global", "bin", "claude"));
      if (claudeInstalled) claudeVersion = "1.0.x (CLI Globale)";
    }

    const claudeJsonPath = path.join(HOME_DIR, ".claude.json");
    const claudeDirPath = path.join(HOME_DIR, ".claude");
    const hasClaudeSession =
      fs.existsSync(claudeJsonPath) || fs.existsSync(claudeDirPath);

    const hasAnthropicEnvKey = Boolean(
      process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith("sk-ant")
    );

    let claudeStatus: "ready" | "api_fallback" | "setup_required" = "setup_required";
    let claudeAccountType = "Non connecté";

    if (hasClaudeSession) {
      claudeStatus = "ready";
      claudeAccountType = "Abonnement Claude Pro (0€ token)";
    } else if (hasAnthropicEnvKey) {
      claudeStatus = "api_fallback";
      claudeAccountType = "Clé API Anthropic (Fallback)";
    } else if (claudeInstalled) {
      claudeStatus = "ready";
      claudeAccountType = "Claude Code CLI Détecté";
    }

    // 2. Diagnose Antigravity CLI (`agy`)
    let agyInstalled = false;
    let agyVersion = "Non détecté";
    try {
      const { stdout } = await execAsync("agy --version", { timeout: 3000 });
      agyInstalled = true;
      agyVersion = stdout.trim();
    } catch {
      try {
        const { stdout } = await execAsync("antigravity --version", { timeout: 3000 });
        agyInstalled = true;
        agyVersion = stdout.trim();
      } catch {
        agyInstalled =
          fs.existsSync("/usr/local/bin/antigravity") ||
          fs.existsSync("/usr/local/bin/agy");
        if (agyInstalled) agyVersion = "2.0.0 (CLI Globale)";
      }
    }

    const agyConfigDir = path.join(HOME_DIR, ".gemini", "antigravity-cli");
    const agyConfigFile = path.join(agyConfigDir, "settings.json");
    let hasAgySession = false;
    let agyTokenSnippet = "";

    if (fs.existsSync(agyConfigFile)) {
      try {
        const content = JSON.parse(fs.readFileSync(agyConfigFile, "utf-8"));
        if (content.authenticated || content.geminiApiKey) {
          hasAgySession = true;
          if (content.geminiApiKey) {
            agyTokenSnippet = `${content.geminiApiKey.slice(0, 4)}...${content.geminiApiKey.slice(-4)}`;
          }
        }
      } catch {}
    }

    const hasGeminiEnvKey = Boolean(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    );

    let agyStatus: "ready" | "api_fallback" | "setup_required" = "setup_required";
    let agyAccountType = "Non connecté";

    if (hasAgySession) {
      agyStatus = "ready";
      agyAccountType = "Compte Google / Gemini Pro (0€ token)";
    } else if (hasGeminiEnvKey) {
      agyStatus = "api_fallback";
      agyAccountType = "Clé Google Gemini API (Env)";
    } else if (agyInstalled) {
      agyStatus = "ready";
      agyAccountType = "Antigravity CLI Activé";
    }

    return NextResponse.json({
      success: true,
      claude: {
        installed: claudeInstalled,
        version: claudeVersion,
        authenticated: hasClaudeSession || claudeStatus === "ready",
        status: claudeStatus,
        accountType: claudeAccountType,
        hasSessionFile: hasClaudeSession,
        hasApiKey: hasAnthropicEnvKey,
        sessionPath: claudeJsonPath,
        details: hasClaudeSession
          ? "Session Claude Pro active et persistée sur le conteneur."
          : "Session Claude Pro prête à être associée.",
      },
      antigravity: {
        installed: agyInstalled,
        version: agyVersion,
        authenticated: hasAgySession || agyStatus === "ready",
        status: agyStatus,
        accountType: agyAccountType,
        hasSessionFile: hasAgySession,
        hasApiKey: hasGeminiEnvKey,
        sessionPath: agyConfigFile,
        tokenSnippet: agyTokenSnippet || undefined,
        details: hasAgySession
          ? "Jeton Gemini Pro lié à la configuration Antigravity CLI."
          : "Jeton Google AI / Gemini Pro requis pour activer l'agent Antigravity.",
      },
      defaultEngine: "pro_clis",
      serverHome: HOME_DIR,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[GET /api/settings/cli-setup] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur scan CLIs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    // ── Action 1 : Tester Claude Code Pro en direct ──────────
    if (action === "test_claude") {
      const startTime = Date.now();
      const testPrompt = body.prompt || "Réponds en 1 phrase courte pour valider la connectivité de Claude Code.";

      const aiRes = await callAI({
        systemPrompt: "Tu es l'assistant de configuration VibeFlow Studio. Confirme simplement que la session Claude Pro est opérationnelle.",
        userPrompt: testPrompt,
        modelType: "claude",
        preferCli: true,
      });

      const durationMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        content: aiRes.content,
        provider: aiRes.provider,
        modelUsed: aiRes.modelUsed,
        durationMs,
      });
    }

    // ── Action 2 : Tester Antigravity CLI Pro en direct ───────
    if (action === "test_antigravity") {
      const startTime = Date.now();
      const testPrompt = body.prompt || "Réponds en 1 phrase courte pour valider la connectivité d'Antigravity CLI.";

      const aiRes = await callAI({
        systemPrompt: "Tu es l'assistant de configuration VibeFlow Studio. Confirme simplement que la session Antigravity Pro est opérationnelle.",
        userPrompt: testPrompt,
        modelType: "antigravity",
        preferCli: true,
      });

      const durationMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        content: aiRes.content,
        provider: aiRes.provider,
        modelUsed: aiRes.modelUsed,
        durationMs,
      });
    }

    // ── Action 3 : Enregistrer le Jeton Gemini Pro dans Antigravity CLI
    if (action === "save_antigravity_token") {
      const token = (body.token || "").trim();
      if (!token) {
        return NextResponse.json({ error: "Jeton Gemini Pro manquant" }, { status: 400 });
      }

      const agyConfigDir = path.join(HOME_DIR, ".gemini", "antigravity-cli");
      const agyConfigFile = path.join(agyConfigDir, "settings.json");

      if (!fs.existsSync(agyConfigDir)) {
        fs.mkdirSync(agyConfigDir, { recursive: true });
      }

      const configData = {
        geminiApiKey: token,
        authenticated: true,
        accountType: "google-gemini-pro",
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(agyConfigFile, JSON.stringify(configData, null, 2), "utf-8");

      return NextResponse.json({
        success: true,
        message: "Jeton Google Gemini Pro enregistré dans la configuration Antigravity CLI avec succès !",
      });
    }

    // ── Action 4 : Enregistrer Clé API Anthropic de Secours ───
    if (action === "save_claude_fallback") {
      const key = (body.key || "").trim();
      if (!key) {
        return NextResponse.json({ error: "Clé Anthropic manquante" }, { status: 400 });
      }

      await prisma.globalSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", defaultAnthropicKey: encrypt(key) },
        update: { defaultAnthropicKey: encrypt(key) },
      });

      return NextResponse.json({
        success: true,
        message: "Clé API Anthropic de secours enregistrée dans le coffre-fort sécurisé !",
      });
    }

    // ── Action 5 : Diagnostic Global Simultané ───────────────
    if (action === "run_diagnostic") {
      const startTime = Date.now();

      const [claudeTest, agyTest] = await Promise.allSettled([
        callAI({
          systemPrompt: "VibeFlow Ping Diagnostic",
          userPrompt: "Ping Claude",
          modelType: "claude",
          preferCli: true,
        }),
        callAI({
          systemPrompt: "VibeFlow Ping Diagnostic",
          userPrompt: "Ping Antigravity",
          modelType: "antigravity",
          preferCli: true,
        }),
      ]);

      const totalDurationMs = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        claude: {
          ok: claudeTest.status === "fulfilled",
          provider: claudeTest.status === "fulfilled" ? claudeTest.value.provider : "error",
          content: claudeTest.status === "fulfilled" ? claudeTest.value.content.slice(0, 150) : null,
        },
        antigravity: {
          ok: agyTest.status === "fulfilled",
          provider: agyTest.status === "fulfilled" ? agyTest.value.provider : "error",
          content: agyTest.status === "fulfilled" ? agyTest.value.content.slice(0, 150) : null,
        },
        totalDurationMs,
      });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/settings/cli-setup] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur assistant configuration" },
      { status: 500 }
    );
  }
}
