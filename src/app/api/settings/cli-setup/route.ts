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
      // Check typical binary locations (Linux, Docker, Windows npm global)
      const isWin = process.platform === "win32";
      const npmGlobalBin = isWin
        ? path.join(process.env.APPDATA || "", "npm", "claude.cmd")
        : path.join(HOME_DIR, ".npm-global", "bin", "claude");
      const unixBin = "/usr/local/bin/claude";
      if (fs.existsSync(npmGlobalBin) || fs.existsSync(unixBin)) {
        claudeInstalled = true;
        claudeVersion = "1.0.x (CLI Globale)";
      }
    }

    // Real Claude credentials check (do NOT consider an empty ~/.claude directory as authenticated)
    let hasClaudeSession = false;
    let claudeAccountEmail = "";
    const claudeJsonPath = path.join(HOME_DIR, ".claude.json");

    if (fs.existsSync(claudeJsonPath)) {
      try {
        const raw = fs.readFileSync(claudeJsonPath, "utf-8");
        const json = JSON.parse(raw);
        if (json.oauthAccount || json.sessionKey || json.primaryApiKey || json.tokens) {
          hasClaudeSession = true;
          claudeAccountEmail =
            json.oauthAccount?.emailAddress || json.oauthAccount?.accountUuid || "";
        }
      } catch {}
    }

    if (!hasClaudeSession) {
      const claudeConfigPath = path.join(HOME_DIR, ".claude", "config.json");
      if (fs.existsSync(claudeConfigPath)) {
        try {
          const raw = fs.readFileSync(claudeConfigPath, "utf-8");
          const json = JSON.parse(raw);
          if (json.oauthAccount || json.sessionKey || json.primaryApiKey) {
            hasClaudeSession = true;
          }
        } catch {}
      }
    }

    const hasAnthropicEnvKey = Boolean(
      process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().startsWith("sk-ant")
    );

    let claudeStatus: "ready" | "api_fallback" | "setup_required" = "setup_required";
    let claudeAccountType = "Non associé";
    let claudeDetails = "Aucune session active. Cliquez sur 'Ouvrir Terminal' pour exécuter `claude login`.";

    if (hasClaudeSession) {
      claudeStatus = "ready";
      claudeAccountType = claudeAccountEmail
        ? `Claude Pro (${claudeAccountEmail})`
        : "Abonnement Claude Pro lié (0€ token)";
      claudeDetails = "Session Claude Pro authentifiée et persistée.";
    } else if (hasAnthropicEnvKey) {
      claudeStatus = "api_fallback";
      claudeAccountType = "Clé API Anthropic (Fallback)";
      claudeDetails = "Clé d'API Anthropic configurée via variable d'environnement.";
    } else {
      claudeStatus = "setup_required";
      claudeAccountType = claudeInstalled ? "CLI Installée (Non connecté)" : "Non associé";
      claudeDetails = claudeInstalled
        ? "La CLI est installée mais aucun compte Pro n'est lié. Tapez `claude login` dans le terminal."
        : "La CLI Claude Code n'est pas installée. Installez-la avec `npm i -g @anthropic-ai/claude-code`.";
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
        const unixAgy = "/usr/local/bin/agy";
        const unixAntigravity = "/usr/local/bin/antigravity";
        const scriptAgy = path.join(process.cwd(), "scripts", "antigravity-cli.js");
        if (fs.existsSync(unixAgy) || fs.existsSync(unixAntigravity) || fs.existsSync(scriptAgy)) {
          agyInstalled = true;
          agyVersion = "2.0.0 (CLI Runtime)";
        }
      }
    }

    const agyConfigDir = path.join(HOME_DIR, ".gemini", "antigravity-cli");
    const agyConfigFile = path.join(agyConfigDir, "settings.json");
    let hasAgySession = false;
    let agyTokenSnippet = "";

    if (fs.existsSync(agyConfigFile)) {
      try {
        const content = JSON.parse(fs.readFileSync(agyConfigFile, "utf-8"));
        if (
          content.geminiApiKey &&
          typeof content.geminiApiKey === "string" &&
          content.geminiApiKey.trim().length > 10
        ) {
          hasAgySession = true;
          const cleanKey = content.geminiApiKey.trim();
          agyTokenSnippet = `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`;
        }
      } catch {}
    }

    const hasGeminiEnvKey = Boolean(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) ||
      (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 10)
    );

    let agyStatus: "ready" | "api_fallback" | "setup_required" = "setup_required";
    let agyAccountType = "Non associé";
    let agyDetails = "Jeton Gemini Pro manquant. Renseignez votre jeton gratuit Google AI Studio ci-dessous.";

    if (hasAgySession) {
      agyStatus = "ready";
      agyAccountType = "Compte Google / Gemini Pro lié (0€ token)";
      agyDetails = "Jeton Gemini Pro associé dans la configuration Antigravity CLI.";
    } else if (hasGeminiEnvKey) {
      agyStatus = "api_fallback";
      agyAccountType = "Clé Google Gemini API (Env)";
      agyDetails = "Clé API Gemini configurée via les variables d'environnement.";
    } else {
      agyStatus = "setup_required";
      agyAccountType = agyInstalled ? "CLI Prête (Jeton Requis)" : "Non associé";
      agyDetails = "Jeton gratuit Google AI Studio requis pour activer Antigravity CLI (0€ token).";
    }

    return NextResponse.json({
      success: true,
      claude: {
        installed: claudeInstalled,
        version: claudeVersion,
        authenticated: hasClaudeSession || (hasAnthropicEnvKey && claudeStatus === "api_fallback"),
        status: claudeStatus,
        accountType: claudeAccountType,
        hasSessionFile: hasClaudeSession,
        hasApiKey: hasAnthropicEnvKey,
        sessionPath: claudeJsonPath,
        details: claudeDetails,
      },
      antigravity: {
        installed: agyInstalled,
        version: agyVersion,
        authenticated: hasAgySession || (hasGeminiEnvKey && agyStatus === "api_fallback"),
        status: agyStatus,
        accountType: agyAccountType,
        hasSessionFile: hasAgySession,
        hasApiKey: hasGeminiEnvKey,
        sessionPath: agyConfigFile,
        tokenSnippet: agyTokenSnippet || undefined,
        details: agyDetails,
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
      const claudeJsonPath = path.join(HOME_DIR, ".claude.json");
      let hasSession = false;
      if (fs.existsSync(claudeJsonPath)) {
        try {
          const raw = fs.readFileSync(claudeJsonPath, "utf-8");
          const json = JSON.parse(raw);
          if (json.oauthAccount || json.sessionKey || json.primaryApiKey || json.tokens) {
            hasSession = true;
          }
        } catch {}
      }

      const hasKey = Boolean(
        process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().startsWith("sk-ant")
      );

      if (!hasSession && !hasKey) {
        return NextResponse.json({
          success: false,
          error: "Claude Code CLI n'est pas encore associé. Ouvrez le terminal et tapez `claude login`, ou enregistrez une clé Anthropic de secours ci-dessous.",
        });
      }

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
      const agyConfigFile = path.join(HOME_DIR, ".gemini", "antigravity-cli", "settings.json");
      let hasAgyKey = false;
      if (fs.existsSync(agyConfigFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(agyConfigFile, "utf-8"));
          if (content.geminiApiKey && content.geminiApiKey.trim().length > 10) {
            hasAgyKey = true;
          }
        } catch {}
      }

      const hasEnvKey = Boolean(
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) ||
        (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 10)
      );

      if (!hasAgyKey && !hasEnvKey) {
        return NextResponse.json({
          success: false,
          error: "Antigravity CLI n'est pas encore associé. Renseignez votre jeton Google AI Studio ci-dessous pour l'activer.",
        });
      }

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
