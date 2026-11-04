// ============================================================
// VibeFlow Studio — Real xterm.js Terminal Component
// Connected to WebSocket / Node-pty server with ANSI support
// ============================================================
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TerminalTarget } from "@/types";
import { io, Socket } from "socket.io-client";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface XtermTerminalProps {
  target: TerminalTarget;
  projectId?: string;
  projectPath?: string;
  contextPrompt?: string;
}

export function XtermTerminal({
  target,
  projectId = "",
  projectPath = "",
  contextPrompt,
}: XtermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<any>(null);
  const fitAddonInstance = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const sessionIdRef = useRef<string>(`term-${target}-${Date.now()}`);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

  useEffect(() => {
    let isMounted = true;

    async function initTerminal() {
      if (!terminalRef.current) return;

      try {
        // Dynamically load xterm & addons on client side
        const { Terminal } = await import("@xterm/xterm");
        const { FitAddon } = await import("@xterm/addon-fit");
        const { WebLinksAddon } = await import("@xterm/addon-web-links");

        if (!isMounted) return;

        // Clean container
        terminalRef.current.innerHTML = "";

        // Determine agent theme colors
        const cursorColor =
          target === "claude"
            ? "#f97316"
            : target === "antigravity"
            ? "#3b82f6"
            : "#10b981";

        const term = new Terminal({
          cursorBlink: true,
          fontFamily: 'var(--font-jetbrains), "JetBrains Mono", Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.25,
          theme: {
            background: "#09090b",
            foreground: "#f4f4f5",
            cursor: cursorColor,
            selectionBackground: "rgba(168, 85, 247, 0.3)",
            black: "#18181b",
            red: "#ef4444",
            green: "#22c55e",
            yellow: "#eab308",
            blue: "#3b82f6",
            magenta: "#a855f7",
            cyan: "#06b6d4",
            white: "#f4f4f5",
            brightBlack: "#71717a",
            brightRed: "#f87171",
            brightGreen: "#4ade80",
            brightYellow: "#fde047",
            brightBlue: "#60a5fa",
            brightMagenta: "#c084fc",
            brightCyan: "#22d3ee",
            brightWhite: "#ffffff",
          },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermInstance.current = term;
        fitAddonInstance.current = fitAddon;

        // Welcome banner
        term.writeln(`\x1b[1;35m⚡ VibeFlow CloudCLI\x1b[0m [Session: \x1b[36m${target.toUpperCase()}\x1b[0m]`);
        if (contextPrompt) {
          term.writeln(`\x1b[2;37mContext: ${contextPrompt}\x1b[0m`);
        }
        term.writeln(`\x1b[2;37mConnecting to backend terminal daemon at ${wsUrl}...\x1b[0m\r\n`);

        // Connect to Socket.IO server
        const socket = io(wsUrl, {
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
          timeout: 4000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
          term.writeln(`\x1b[32m✔ Connected to CloudCLI backend server.\x1b[0m\r\n`);

          // Request pty session
          socket.emit("terminal:create", {
            target,
            projectPath,
            sessionId: sessionIdRef.current,
          });
        });

        socket.on("terminal:output", (msg: { sessionId: string; data: string }) => {
          if (msg.sessionId === sessionIdRef.current) {
            term.write(msg.data);
          }
        });

        socket.on("terminal:exit", () => {
          term.writeln(`\r\n\x1b[33m[Process completed]\x1b[0m\r\n`);
        });

        socket.on("connect_error", () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Local fallback prompt if WS is not running yet
          term.writeln(
            `\x1b[33m[CloudCLI Info] Standalone Mode: Backend PTY daemon unreachable.\x1b[0m\r\n` +
            `\x1b[36mVibeFlow Interactive Emulator ready.\x1b[0m Tapez vos commandes ci-dessous :\r\n` +
            `\x1b[32m${target}>\x1b[0m `
          );
        });

        // User input handling
        let localBuffer = "";
        term.onData(async (data: string) => {
          if (socket.connected) {
            socket.emit("terminal:input", {
              sessionId: sessionIdRef.current,
              data,
            });
          } else {
            // Emulate basic local echo for immediate responsiveness
            if (data === "\r") {
              term.writeln("");
              const cmd = localBuffer.trim();
              if (cmd) {
                await handleLocalSimulation(cmd, term, target, projectId);
              }
              localBuffer = "";
              term.write(`\x1b[32m${target}>\x1b[0m `);
            } else if (data === "\u007F") {
              // Backspace
              if (localBuffer.length > 0) {
                localBuffer = localBuffer.slice(0, -1);
                term.write("\b \b");
              }
            } else {
              localBuffer += data;
              term.write(data);
            }
          }
        });

        // Resize handling
        const handleResize = () => {
          if (fitAddonInstance.current && xtermInstance.current) {
            fitAddonInstance.current.fit();
            const { cols, rows } = xtermInstance.current;
            if (socket.connected) {
              socket.emit("terminal:resize", {
                sessionId: sessionIdRef.current,
                cols,
                rows,
              });
            }
          }
        };

        window.addEventListener("resize", handleResize);

        setIsInitializing(false);
      } catch (err) {
        console.error("Failed to initialize xterm:", err);
        setIsInitializing(false);
      }
    }

    initTerminal();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit("terminal:kill", { sessionId: sessionIdRef.current });
        socketRef.current.disconnect();
      }
      if (xtermInstance.current) {
        xtermInstance.current.dispose();
      }
    };
  }, [target, projectPath, wsUrl]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#09090b] overflow-hidden">
      {/* Top status bar inside terminal */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#121214] border-b border-border text-[11px] font-mono text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-400">
              <Wifi className="w-3 h-3" /> Live PTY
            </span>
          ) : (
            <span className="flex items-center gap-1 text-yellow-400">
              <WifiOff className="w-3 h-3" /> Interactive Emulator
            </span>
          )}
          <span>|</span>
          <span className="text-foreground font-semibold">
            Target: {target.toUpperCase()}
          </span>
          {projectId && <span className="opacity-70">Project: #{projectId.slice(0, 8)}</span>}
        </div>

        <button
          onClick={() => {
            if (fitAddonInstance.current) fitAddonInstance.current.fit();
          }}
          className="hover:text-foreground transition-colors flex items-center gap-1"
          title="Fit terminal to container"
        >
          <RefreshCw className="w-3 h-3" /> Fit
        </button>
      </div>

      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* xterm DOM Mount point */}
      <div
        ref={terminalRef}
        className="flex-1 w-full h-full p-2 overflow-hidden"
        style={{ minHeight: "180px" }}
      />
    </div>
  );
}

// Interactive command runner connected to /api/terminal/execute
async function handleLocalSimulation(
  cmd: string,
  term: any,
  target: TerminalTarget,
  projectId?: string
) {
  const lower = cmd.toLowerCase();
  if (lower === "clear" || lower === "cls") {
    term.clear();
    return;
  }

  try {
    const res = await fetch("/api/terminal/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmd, target, projectId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.output) {
        term.write(data.output);
        return;
      }
    }
  } catch (err) {
    // Fall through to offline handling
  }

  // Fallback offline responses if API is unreachable
  if (lower === "help") {
    term.writeln(`\x1b[36mCommandes disponibles :\x1b[0m`);
    term.writeln(`  claude <prompt>      - Envoyer un prompt d'analyse à Claude`);
    term.writeln(`  antigravity <prompt> - Envoyer une directive à Antigravity`);
    term.writeln(`  git status           - Statut du dépôt Git local`);
    term.writeln(`  coolify status       - Vérifier l'état du serveur Coolify`);
    term.writeln(`  status               - Résumé global`);
    return;
  }

  term.writeln(`\x1b[2;37mExecuted:\x1b[0m ${cmd}\r\n`);
}
