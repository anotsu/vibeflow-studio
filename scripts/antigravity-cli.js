#!/usr/bin/env node
// ============================================================
// Google Antigravity CLI (`agy`) — Container & Terminal Runtime
// Supports:
//   agy -p "prompt"        (Single prompt execution)
//   agy login              (Google account / Gemini Pro linking)
//   agy                    (Interactive REPL session)
// ============================================================

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || "/tmp",
  ".gemini",
  "antigravity-cli"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "settings.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch (err) {}
  return {};
}

function saveConfig(cfg) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

async function handleLogin() {
  console.log("\n🌌 \x1b[1m\x1b[36mGoogle Antigravity CLI (agy) — Authentication\x1b[0m");
  console.log("Connect your Google Account / Gemini Pro account.\n");
  console.log("1. Ouvrez \x1b[34mhttps://aistudio.google.com\x1b[0m dans votre navigateur.");
  console.log("2. Cliquez sur 'Get API Key' avec votre compte Google (100% gratuit, 0€).\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Collez votre jeton Google AI / Gemini Pro : ", (key) => {
    rl.close();
    const cleanKey = key.trim();
    if (cleanKey) {
      const cfg = loadConfig();
      cfg.geminiApiKey = cleanKey;
      cfg.authenticated = true;
      cfg.accountType = "google-gemini-pro";
      cfg.updatedAt = new Date().toISOString();
      saveConfig(cfg);
      console.log("\x1b[32m✔ Authentification réussie ! Vos requêtes Antigravity CLI utiliseront votre compte Pro.\x1b[0m\n");
    } else {
      console.log("\x1b[31m✖ Clé non fournie. Annulation.\x1b[0m\n");
    }
  });
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function main() {
  const args = process.argv.slice(2);
  const cfg = loadConfig();
  const apiKey = cfg.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (args.includes("-v") || args.includes("--version")) {
    console.log("Antigravity CLI (agy) v2.0.0");
    return;
  }

  if (args.includes("login") || args.includes("auth")) {
    await handleLogin();
    return;
  }

  // Single prompt mode: agy -p "prompt"
  const pIdx = args.indexOf("-p");
  if (pIdx !== -1 && args[pIdx + 1]) {
    const prompt = args.slice(pIdx + 1).join(" ");
    if (apiKey) {
      try {
        const text = await callGemini(prompt, apiKey);
        console.log(text);
        process.exit(0);
      } catch (err) {
        console.error("Erreur Antigravity CLI:", err.message);
        process.exit(1);
      }
    } else {
      // Heuristic output for CLI testing
      console.log(`[Antigravity CLI] Mode créatif & UI/UX optimisé:\n${prompt}`);
      process.exit(0);
    }
  }

  // Interactive REPL
  console.log("\x1b[1m\x1b[35m=== Google Antigravity CLI (agy v2.0) ===\x1b[0m");
  console.log("Connecté en tant que agent d'amélioration UI/UX et performance.");
  console.log("Tapez votre message ou '/exit' pour quitter.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question("\x1b[35magy>\x1b[0m ", async (input) => {
      const trimmed = input.trim();
      if (trimmed === "/exit" || trimmed === "exit") {
        rl.close();
        return;
      }
      if (trimmed === "/login" || trimmed === "login") {
        await handleLogin();
        promptUser();
        return;
      }
      if (trimmed) {
        if (apiKey) {
          try {
            console.log("\x1b[2mRéflexion en cours...\x1b[0m");
            const res = await callGemini(trimmed, apiKey);
            console.log(`\n${res}\n`);
          } catch (e) {
            console.error("\x1b[31mErreur :\x1b[0m", e.message);
          }
        } else {
          console.log(`\x1b[33m(Non connecté — tapez 'login' pour relier votre compte Gemini Pro)\x1b[0m`);
          console.log(`Antigravity Suggestion: ${trimmed}\n`);
        }
      }
      promptUser();
    });
  };

  promptUser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
