// ============================================================
// VibeFlow Studio — API Route: WebCloud Terminal Execution
// POST /api/terminal/execute
// Interactive command runner for bash, Claude Pro & Antigravity Pro CLIs
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-provider";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/utils";
import {
  getDefaultSshHost,
  getSshHosts,
  executeSshCommand,
  testSshConnection,
} from "@/lib/ssh-service";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const command = (body.command || "").trim();
    const target = body.target || "bash";
    const projectId = body.projectId;

    if (!command) {
      return NextResponse.json({ success: true, output: "" });
    }

    const lower = command.toLowerCase();

    // 1. Built-in clear / help
    if (lower === "clear" || lower === "cls") {
      return NextResponse.json({ success: true, output: "\x1b[2J\x1b[H" });
    }

    if (lower === "help") {
      const helpText = `\x1b[1;35m⚡ VibeFlow CloudCLI — Commandes interactives :\x1b[0m\r\n` +
        `  \x1b[33mclaude <instruction>\x1b[0m      Session interactive avec Claude Code Pro\r\n` +
        `  \x1b[34magy | antigravity <inst>\x1b[0m Session interactive avec Antigravity CLI\r\n` +
        `  \x1b[32mgit status\x1b[0m                 Statut du dépôt Git local\r\n` +
        `  \x1b[32mnode -v | npm -v\x1b[0m           Versions des runtimes d'exécution\r\n` +
        `  \x1b[36mcoolify status\x1b[0m             État des conteneurs Coolify et déploiements\r\n` +
        `  \x1b[35mstatus\x1b[0m                     Résumé global du projet et des agents\r\n` +
        `  \x1b[37mclear\x1b[0m                      Effacer l'écran du terminal\r\n`;
      return NextResponse.json({ success: true, output: helpText });
    }

    // 2. Claude Commands & Login
    if (
      lower === "claude login" ||
      lower === "claude auth" ||
      (target === "claude" && (lower === "login" || lower === "auth"))
    ) {
      const output =
        `\x1b[1;33m[Claude Code Pro — Liaison de Compte]\x1b[0m\r\n` +
        `Pour lier votre abonnement Claude Pro (0€ facturation token) :\r\n\r\n` +
        `  1. Dans votre terminal système hôte, exécutez :\r\n` +
        `     \x1b[36mclaude login\x1b[0m\r\n` +
        `     (Suivez le lien d'authentification OAuth dans votre navigateur)\r\n\r\n` +
        `  2. Ou enregistrez une clé d'API Anthropic de secours directement ici :\r\n` +
        `     \x1b[32mclaude key sk-ant-api03-...\x1b[0m\r\n`;
      return NextResponse.json({ success: true, output });
    }

    if (lower.startsWith("claude key ") || lower.startsWith("claude fallback ")) {
      const key = command.replace(/^claude\s+(key|fallback)\s+/i, "").trim();
      if (!key.startsWith("sk-ant")) {
        return NextResponse.json({
          success: true,
          output: `\x1b[31m✖ Format de clé invalide. Une clé Anthropic commence par 'sk-ant-'.\x1b[0m\r\n`,
        });
      }

      await prisma.globalSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", defaultAnthropicKey: encrypt(key) },
        update: { defaultAnthropicKey: encrypt(key) },
      });

      return NextResponse.json({
        success: true,
        output:
          `\x1b[32m✔ Clé Anthropic enregistrée avec succès dans le coffre-fort sécurisé !\x1b[0m\r\n` +
          `\x1b[36mClaude Code utilisera ce fallback API lorsque le CLI local n'est pas connecté.\x1b[0m\r\n`,
      });
    }

    // 3. Antigravity Commands & Login
    if (
      lower === "agy login" ||
      lower === "antigravity login" ||
      (target === "antigravity" && (lower === "login" || lower === "auth"))
    ) {
      const output =
        `\x1b[1;35m[Google Antigravity CLI (agy) — Liaison Gemini Pro]\x1b[0m\r\n` +
        `Pour associer votre compte Google / Gemini Pro (100% gratuit, 0€ token) :\r\n\r\n` +
        `  1. Ouvrez \x1b[34mhttps://aistudio.google.com/app/apikey\x1b[0m dans votre navigateur\r\n` +
        `  2. Cliquez sur 'Create API Key' (gratuit sans carte bancaire)\r\n` +
        `  3. Collez votre jeton directement ici avec la commande :\r\n` +
        `     \x1b[32magy token AIzaSy...\x1b[0m\r\n`;
      return NextResponse.json({ success: true, output });
    }

    if (lower.startsWith("agy token ") || lower.startsWith("antigravity token ")) {
      const token = command.replace(/^(agy|antigravity)\s+token\s+/i, "").trim();
      if (token.length < 10) {
        return NextResponse.json({
          success: true,
          output: `\x1b[31m✖ Jeton trop court ou invalide. Renseignez un jeton valide Google AI Studio.\x1b[0m\r\n`,
        });
      }

      const homeDir = process.env.HOME || process.env.USERPROFILE || "/tmp";
      const agyDir = path.join(homeDir, ".gemini", "antigravity-cli");
      const agyFile = path.join(agyDir, "settings.json");

      if (!fs.existsSync(agyDir)) {
        fs.mkdirSync(agyDir, { recursive: true });
      }

      fs.writeFileSync(
        agyFile,
        JSON.stringify(
          {
            geminiApiKey: token,
            authenticated: true,
            accountType: "google-gemini-pro",
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        "utf-8"
      );

      return NextResponse.json({
        success: true,
        output:
          `\x1b[32m✔ Jeton Gemini Pro enregistré dans ~/.gemini/antigravity-cli/settings.json !\x1b[0m\r\n` +
          `\x1b[35mAntigravity CLI (agy) est maintenant opérationnel en mode Pro (0€ token).\x1b[0m\r\n`,
      });
    }

    // 4. Claude AI Command Prompt
    if (target === "claude" || lower.startsWith("claude ")) {
      const prompt = lower.startsWith("claude ") ? command.slice(7) : command;
      const aiRes = await callAI({
        systemPrompt: "Tu es l'agent Claude Code Pro dans le terminal interactif VibeFlow CloudCLI. Réponds avec concision et précision technique.",
        userPrompt: prompt,
        modelType: "claude",
        preferCli: true,
      });

      const output = `\x1b[33m[Claude Code Pro (${aiRes.provider})]\x1b[0m\r\n${aiRes.content}\r\n`;
      return NextResponse.json({ success: true, output, provider: aiRes.provider });
    }

    // 5. Antigravity AI Command Prompt
    if (target === "antigravity" || lower.startsWith("antigravity ") || lower.startsWith("agy ")) {
      const prompt = lower.startsWith("antigravity ")
        ? command.slice(12)
        : lower.startsWith("agy ")
        ? command.slice(4)
        : command;

      const aiRes = await callAI({
        systemPrompt: "Tu es l'agent Antigravity Pro dans le terminal interactif VibeFlow CloudCLI. Réponds avec fluidité, créativité et pragmatisme.",
        userPrompt: prompt,
        modelType: "antigravity",
        preferCli: true,
      });

      const output = `\x1b[34m[Antigravity CLI (${aiRes.provider})]\x1b[0m\r\n${aiRes.content}\r\n`;
      return NextResponse.json({ success: true, output, provider: aiRes.provider });
    }

    // 4. Coolify Status Command
    if (lower.includes("coolify") || target === "coolify-logs") {
      let deploymentsSummary = "Aucun déploiement récent.";
      if (projectId) {
        const deps = await prisma.deployment.findMany({
          where: { projectId },
          orderBy: { createdAt: "desc" },
          take: 3,
        });
        if (deps.length > 0) {
          deploymentsSummary = deps
            .map((d) => `• [${d.status}] Branche: ${d.branch} (UUID: ${d.coolifyDeploymentUuid || d.id.slice(0, 8)})`)
            .join("\r\n");
        }
      }

      const output = `\x1b[32m[Coolify Control Plane]\x1b[0m Endpoint: https://coolify.capstation.fr\r\n` +
        `\x1b[36mDerniers déploiements :\x1b[0m\r\n${deploymentsSummary}\r\n`;
      return NextResponse.json({ success: true, output });
    }

    // 5. General project status
    if (lower === "status") {
      let projectInfo = "Projet courant actif";
      if (projectId) {
        const p = await prisma.project.findUnique({
          where: { id: projectId },
          include: { _count: { select: { tasks: true, deployments: true } } },
        });
        if (p) {
          projectInfo = `Projet: ${p.name} | Dépôt: ${p.githubRepo} | Tâches: ${p._count.tasks} | Déploiements: ${p._count.deployments}`;
        }
      }

      const output = `\x1b[1;35m═══ VibeFlow Studio Status ═══\x1b[0m\r\n` +
        `\x1b[36m${projectInfo}\x1b[0m\r\n` +
        `CLIs Pro disponibles : \x1b[32m✔ Claude Code Pro\x1b[0m | \x1b[32m✔ Antigravity CLI Pro\x1b[0m\r\n` +
        `Environnement : \x1b[33mNext.js 15 Standalone sur Coolify Cloud\x1b[0m\r\n`;
      return NextResponse.json({ success: true, output });
    }

    // 6. SSH Remote Host & Runner execution
    if (target === "ssh" || lower.startsWith("ssh ")) {
      const defaultHost = await getDefaultSshHost();

      if (lower === "ssh help" || (target === "ssh" && lower === "help")) {
        const sshHelp =
          `\x1b[1;36m🌐 VibeFlow Studio — Commandes SSH & Runners Distants :\x1b[0m\r\n` +
          `  \x1b[33mssh status\x1b[0m       Affiche l'état de l'hôte distant actif (Mac mini / VPS)\r\n` +
          `  \x1b[33mssh hosts\x1b[0m        Liste tous les hôtes SSH configurés\r\n` +
          `  \x1b[33mssh test\x1b[0m         Teste la connexion en direct et sonde l'hôte distant\r\n` +
          `  \x1b[32m<commande>\x1b[0m       Dans l'onglet SSH, toute commande s'exécute sur l'hôte distant\r\n`;
        return NextResponse.json({ success: true, output: sshHelp });
      }

      if (lower === "ssh hosts") {
        const hosts = await getSshHosts();
        if (hosts.length === 0) {
          return NextResponse.json({
            success: true,
            output: `\x1b[33mℹ Aucun hôte SSH configuré.\x1b[0m\r\nRendez-vous dans \x1b[36mParamètres → Hôtes SSH & Runners\x1b[0m pour ajouter votre Mac mini ou serveur.\r\n`,
          });
        }
        let out = `\x1b[1;36mHôtes SSH enregistrés (${hosts.length}) :\x1b[0m\r\n`;
        hosts.forEach((h, i) => {
          const defTag = h.isDefault ? " \x1b[32m[PAR DÉFAUT]\x1b[0m" : "";
          const statusDot =
            h.status === "ONLINE"
              ? "\x1b[32m●\x1b[0m"
              : h.status === "OFFLINE"
              ? "\x1b[31m●\x1b[0m"
              : "\x1b[33m●\x1b[0m";
          out += `  ${i + 1}. ${statusDot} \x1b[1m${h.name}\x1b[0m (${h.username}@${h.host}:${h.port})${defTag}\r\n`;
          if (h.systemInfo?.os) {
            out += `     OS: ${h.systemInfo.os} (${h.systemInfo.arch}) · Claude: ${h.systemInfo.hasClaudeCli ? "Oui" : "Non"} · AGY: ${h.systemInfo.hasAgyCli ? "Oui" : "Non"}\r\n`;
          }
        });
        return NextResponse.json({ success: true, output: out });
      }

      if (lower === "ssh status" || lower === "ssh test") {
        if (!defaultHost) {
          return NextResponse.json({
            success: true,
            output: `\x1b[33mℹ Aucun hôte SSH actif par défaut.\x1b[0m Configurez-le dans les Paramètres.\r\n`,
          });
        }

        const testRes = await testSshConnection(defaultHost);
        const color = testRes.success ? "\x1b[32m" : "\x1b[31m";
        let out = `${color}${testRes.message}\x1b[0m\r\n`;
        if (testRes.systemInfo) {
          out +=
            `  • Hôte : \x1b[36m${defaultHost.name}\x1b[0m (${defaultHost.username}@${defaultHost.host}:${defaultHost.port})\r\n` +
            `  • Système : \x1b[37m${testRes.systemInfo.os} [${testRes.systemInfo.arch}]\x1b[0m\r\n` +
            `  • Claude CLI : ${testRes.systemInfo.hasClaudeCli ? "\x1b[32mInstallé (" + (testRes.systemInfo.claudeVersion || "OK") + ")\x1b[0m" : "\x1b[33mNon détecté\x1b[0m"}\r\n` +
            `  • Antigravity CLI : ${testRes.systemInfo.hasAgyCli ? "\x1b[32mInstallé (" + (testRes.systemInfo.agyVersion || "OK") + ")\x1b[0m" : "\x1b[33mNon détecté\x1b[0m"}\r\n` +
            `  • Node / Git : ${testRes.systemInfo.nodeVersion || "N/A"} / ${testRes.systemInfo.gitVersion || "N/A"}\r\n`;
        }
        return NextResponse.json({ success: true, output: out });
      }

      // Execute on remote SSH host
      if (!defaultHost) {
        return NextResponse.json({
          success: true,
          output: `\x1b[33mℹ Aucun hôte SSH configuré.\x1b[0m Tapez \x1b[36mssh help\x1b[0m ou configurez votre Mac mini dans les Paramètres.\r\n`,
        });
      }

      const remoteCmd = lower.startsWith("ssh ") ? command.slice(4) : command;

      try {
        const { stdout, stderr, exitCode } = await executeSshCommand(
          defaultHost,
          remoteCmd,
          defaultHost.remoteWorkspace
        );
        let resText = (stdout || stderr || `✓ Exécuté sur ${defaultHost.name} (code ${exitCode})\r\n`).replace(/\n/g, "\r\n");
        if (exitCode !== 0 && !resText.includes("\x1b[")) {
          resText = `\x1b[31m${resText}\x1b[0m`;
        }
        return NextResponse.json({ success: true, output: resText });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          output: `\x1b[31m✖ Erreur SSH (${defaultHost.name}): ${err.message}\x1b[0m\r\n`,
        });
      }
    }

    // 7. Safe shell command execution
    const allowedPrefixes = [
      "git",
      "node",
      "npm",
      "npx",
      "pnpm",
      "ls",
      "dir",
      "echo",
      "cat",
      "whoami",
      "pwd",
      "date",
      "uptime",
      "ps",
      "env",
    ];

    const isAllowed = allowedPrefixes.some((p) => lower.startsWith(p));
    if (!isAllowed) {
      return NextResponse.json({
        success: true,
        output: `\x1b[31mCommande '${command}' non autorisée dans l'environnement bac à sable.\x1b[0m\r\nTapez \x1b[36mhelp\x1b[0m pour la liste des commandes autorisées.\r\n`,
      });
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 8000,
        maxBuffer: 1024 * 512,
      });

      const resText = (stdout || stderr || "✓ Commande exécutée avec succès.\r\n").replace(/\n/g, "\r\n");
      return NextResponse.json({ success: true, output: resText });
    } catch (cmdErr: any) {
      const errOut = (cmdErr.stderr || cmdErr.stdout || cmdErr.message || "Erreur d'exécution").replace(/\n/g, "\r\n");
      return NextResponse.json({ success: true, output: `\x1b[31m${errOut}\x1b[0m\r\n` });
    }
  } catch (error: any) {
    console.error("[POST /api/terminal/execute] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur terminal" },
      { status: 500 }
    );
  }
}
