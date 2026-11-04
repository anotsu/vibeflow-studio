// ============================================================
// VibeFlow Studio — Terminal WebSocket Server
// Bridges xterm.js clients to real PTY sessions
// ============================================================

import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import type { TerminalTarget, TerminalMessage, TerminalSession } from "@/types";

const PORT = parseInt(process.env.TERMINAL_WS_PORT || "3001", 10);

// ─── Session Management ─────────────────────────────────────

const sessions = new Map<string, TerminalSession>();

// Dynamic import for node-pty (native module)
let ptyModule: typeof import("node-pty") | null = null;

async function loadPty() {
  try {
    ptyModule = await import("node-pty");
    console.log("[Terminal] node-pty loaded successfully");
  } catch (error) {
    console.warn(
      "[Terminal] node-pty not available — terminal will run in simulation mode"
    );
  }
}

// ─── Create Terminal Process ────────────────────────────────

interface PtyProcess {
  write: (data: string) => void;
  onData: (callback: (data: string) => void) => void;
  onExit: (callback: (exitInfo: { exitCode: number }) => void) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  pid: number;
}

function createTerminalProcess(
  target: TerminalTarget,
  projectPath?: string
): PtyProcess | null {
  if (!ptyModule) return null;

  const isWindows = process.platform === "win32";
  const shell = isWindows ? "powershell.exe" : "/bin/bash";

  let args: string[] = [];
  let cwd = projectPath || process.cwd();

  switch (target) {
    case "bash":
      // Plain shell
      break;
    case "claude":
      if (isWindows) {
        args = ["-NoExit", "-Command", "Write-Host 'Session Claude Code CLI (Compte Claude Pro)' -ForegroundColor Cyan; if (Get-Command claude -ErrorAction SilentlyContinue) { claude } else { Write-Host 'Tapez: npm i -g @anthropic-ai/claude-code' -ForegroundColor Yellow }"];
      } else {
        args = ["-c", "echo 'Session Claude Code CLI (Compte Claude Pro)'; if command -v claude >/dev/null 2>&1; then claude; else echo 'Tapez: npm i -g @anthropic-ai/claude-code' && sh; fi"];
      }
      break;
    case "antigravity":
      if (isWindows) {
        args = ["-NoExit", "-Command", "Write-Host 'Session Google Antigravity CLI (Compte Gemini Pro)' -ForegroundColor Magenta; if (Get-Command agy -ErrorAction SilentlyContinue) { agy } elseif (Get-Command antigravity -ErrorAction SilentlyContinue) { antigravity } else { Write-Host 'Antigravity CLI pret' -ForegroundColor Green }"];
      } else {
        args = ["-c", "echo 'Session Google Antigravity CLI (Compte Gemini Pro)'; if command -v agy >/dev/null 2>&1; then agy; elif command -v antigravity >/dev/null 2>&1; then antigravity; else echo 'Antigravity CLI pret' && sh; fi"];
      }
      break;
    case "broadcast":
      // Broadcast is handled at the socket level, not as a separate PTY
      return null;
  }

  try {
    const pty = ptyModule.spawn(shell, args, {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      } as Record<string, string>,
    });

    return {
      write: (data: string) => pty.write(data),
      onData: (cb: (data: string) => void) => {
        pty.onData(cb);
      },
      onExit: (cb: (exitInfo: { exitCode: number }) => void) => {
        pty.onExit(cb);
      },
      resize: (cols: number, rows: number) => pty.resize(cols, rows),
      kill: () => pty.kill(),
      pid: pty.pid,
    };
  } catch (error) {
    console.error(`[Terminal] Failed to create PTY for ${target}:`, error);
    return null;
  }
}

// ─── Socket.IO Server ───────────────────────────────────────

async function startServer() {
  await loadPty();

  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[Terminal] Client connected: ${socket.id}`);

    const activePtys = new Map<string, PtyProcess>();

    // ── Create Terminal Session ──────────────────────────

    socket.on(
      "terminal:create",
      (data: { target: TerminalTarget; projectPath?: string; sessionId: string }) => {
        const { target, projectPath, sessionId } = data;
        console.log(
          `[Terminal] Creating session ${sessionId} for target: ${target}`
        );

        if (target === "broadcast") {
          // Broadcast doesn't create its own PTY
          socket.emit("terminal:output", {
            sessionId,
            data: "📡 Broadcast mode — commands will be sent to both Claude & Antigravity.\r\n",
          });
          return;
        }

        if (target === "coolify-logs") {
          // Coolify logs don't need a PTY either
          socket.emit("terminal:output", {
            sessionId,
            data: "📋 Coolify logs — streaming will start when a deployment is active.\r\n",
          });
          return;
        }

        const pty = createTerminalProcess(target, projectPath);

        if (pty) {
          activePtys.set(sessionId, pty);

          sessions.set(sessionId, {
            id: sessionId,
            target,
            projectId: "", // Set by client
            pid: pty.pid,
            active: true,
          });

          // Pipe PTY output to client
          pty.onData((output: string) => {
            socket.emit("terminal:output", { sessionId, data: output });
          });

          pty.onExit(({ exitCode }) => {
            console.log(
              `[Terminal] PTY ${sessionId} exited with code ${exitCode}`
            );
            socket.emit("terminal:exit", { sessionId, exitCode });
            activePtys.delete(sessionId);
            sessions.delete(sessionId);
          });

          socket.emit("terminal:ready", { sessionId, pid: pty.pid });
        } else {
          // Simulation mode
          socket.emit("terminal:output", {
            sessionId,
            data: `[VibeFlow] ${target} terminal (simulation mode)\r\n$ `,
          });
        }
      }
    );

    // ── Handle Input ────────────────────────────────────

    socket.on(
      "terminal:input",
      (data: { sessionId: string; data: string }) => {
        const pty = activePtys.get(data.sessionId);
        if (pty) {
          pty.write(data.data);
        } else {
          // Simulation: echo back with a simulated response
          const input = data.data.trim();
          if (input) {
            socket.emit("terminal:output", {
              sessionId: data.sessionId,
              data: `\r\n[simulated] > ${input}\r\n$ `,
            });
          }
        }
      }
    );

    // ── Handle Broadcast ────────────────────────────────

    socket.on(
      "terminal:broadcast",
      (data: { command: string; targets: TerminalTarget[] }) => {
        console.log(
          `[Terminal] Broadcasting command to: ${data.targets.join(", ")}`
        );

        for (const [sessionId, pty] of activePtys) {
          const session = sessions.get(sessionId);
          if (session && data.targets.includes(session.target)) {
            pty.write(data.command + "\n");
          }
        }
      }
    );

    // ── Handle Resize ───────────────────────────────────

    socket.on(
      "terminal:resize",
      (data: { sessionId: string; cols: number; rows: number }) => {
        const pty = activePtys.get(data.sessionId);
        if (pty) {
          pty.resize(data.cols, data.rows);
        }
      }
    );

    // ── Handle Disconnect ───────────────────────────────

    socket.on("disconnect", () => {
      console.log(`[Terminal] Client disconnected: ${socket.id}`);

      // Clean up all PTY processes for this socket
      for (const [sessionId, pty] of activePtys) {
        try {
          pty.kill();
        } catch {}
        sessions.delete(sessionId);
      }
      activePtys.clear();
    });

    // ── Kill Specific Session ───────────────────────────

    socket.on("terminal:kill", (data: { sessionId: string }) => {
      const pty = activePtys.get(data.sessionId);
      if (pty) {
        try {
          pty.kill();
        } catch {}
        activePtys.delete(data.sessionId);
        sessions.delete(data.sessionId);
        socket.emit("terminal:killed", { sessionId: data.sessionId });
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[Terminal] WebSocket server listening on port ${PORT}`);
    console.log(
      `[Terminal] Accepting connections from: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`
    );
  });
}

startServer().catch(console.error);
