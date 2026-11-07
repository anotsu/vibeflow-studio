// ============================================================
// VibeFlow Studio — Real xterm.js Terminal Component
// Connected to WebSocket / Node-pty server with ANSI support
// ============================================================
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TerminalTarget } from "@/types";
import { io, Socket } from "socket.io-client";
import { Loader2, RefreshCw, Wifi, WifiOff, ShieldAlert, Sparkles, Check, X } from "lucide-react";
import { detectAgentState, type DetectedAgentStatus } from "@/lib/agent-state-detector";

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
  const [agentStatus, setAgentStatus] = useState<DetectedAgentStatus | null>(null);
  const terminalHistoryRef = useRef<string>("");
  const sessionIdRef = useRef<string>(`term-${target}-${Date.now()}`);
  const hasReportedFallbackRef = useRef<boolean>(false);

  const sendTerminalInput = (input: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("terminal:input", {
        sessionId: sessionIdRef.current,
        data: input,
      });
    } else if (xtermInstance.current) {
      // In standalone emulator mode, execute via API
      handleLocalSimulation(input, xtermInstance.current, target, projectId);
    }
  };

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
        if (target === "claude") {
          term.writeln(`\x1b[33mSession Claude Code Pro (0€ token)\x1b[0m`);
          term.writeln(`\x1b[2;37mCommandes utiles : 'claude login', 'claude key <sk-ant-...>', ou tapez votre question.\x1b[0m\r\n`);
        } else if (target === "antigravity") {
          term.writeln(`\x1b[35mSession Antigravity CLI — Gemini Pro (0€ token)\x1b[0m`);
          term.writeln(`\x1b[2;37mCommandes utiles : 'agy login', 'agy token <AIzaSy...>', ou tapez votre directive.\x1b[0m\r\n`);
        } else {
          term.writeln(`\x1b[2;37mSession Shell interactif. Tapez 'help' pour la liste des commandes.\x1b[0m\r\n`);
        }

        // Connect to Socket.IO server (optional local PTY server)
        const socket = io(wsUrl, {
          transports: ["websocket", "polling"],
          reconnectionAttempts: 2,
          timeout: 2000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
          term.writeln(`\x1b[32m✔ Connecté au serveur PTY natif.\x1b[0m\r\n`);

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
            terminalHistoryRef.current = (terminalHistoryRef.current + msg.data).slice(-4000);
            const pref = target === "claude" ? "claude" : target === "antigravity" ? "antigravity" : undefined;
            const detected = detectAgentState(terminalHistoryRef.current, pref);
            setAgentStatus(detected);
          }
        });

        socket.on("terminal:exit", () => {
          term.writeln(`\r\n\x1b[33m[Process completed]\x1b[0m\r\n`);
        });

        const showFallbackPrompt = () => {
          if (!isMounted || hasReportedFallbackRef.current) return;
          hasReportedFallbackRef.current = true;
          setIsConnected(false);
          term.writeln(`\x1b[36mÉmulateur interactif CloudCLI prêt.\x1b[0m Tapez vos commandes ci-dessous :`);
          term.write(`\x1b[32m${target}>\x1b[0m `);
        };

        socket.on("connect_error", () => {
          showFallbackPrompt();
        });

        // Fast fallback timer if PTY daemon is not active
        setTimeout(() => {
          if (!socket.connected) {
            showFallbackPrompt();
          }
        }, 1200);

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

          {/* Agent State Badge (calibrated from Herdr) */}
          {agentStatus && agentStatus.state !== "UNKNOWN" && (
            <div className="flex items-center gap-1 ml-2">
              {agentStatus.state === "WORKING" && (
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Working</span>
                </span>
              )}
              {agentStatus.state === "BLOCKED" && (
                <span className="flex items-center gap-1 text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>Bloqué (Action requise)</span>
                </span>
              )}
              {agentStatus.state === "IDLE" && (
                <span className="flex items-center gap-1 text-zinc-400 bg-secondary px-2 py-0.5 rounded-full text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span>Idle</span>
                </span>
              )}
            </div>
          )}
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

      {/* Interactive Action Alert Banner when Agent is BLOCKED (Herdr pattern) */}
      {agentStatus?.state === "BLOCKED" && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-amber-950/80 via-card to-background border-b border-amber-500/40 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-amber-200 font-bold block truncate">
                {agentStatus.reason}
              </span>
              {agentStatus.blockerDetails && (
                <span className="text-[10px] font-mono text-muted-foreground truncate block">
                  {agentStatus.blockerDetails}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {agentStatus.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendTerminalInput(action.input)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all shadow-sm ${
                  action.variant === "primary"
                    ? "bg-amber-500 hover:bg-amber-400 text-black"
                    : action.variant === "danger"
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
