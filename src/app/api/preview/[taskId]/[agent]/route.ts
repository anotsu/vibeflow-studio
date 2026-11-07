// ============================================================
// VibeFlow Studio — API Route: Reverse-Proxy Preview (Root)
// GET /api/preview/[taskId]/[agent]
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  ensurePreviewServer,
  readWorktreeStaticFile,
  AgentWorktreeRole,
} from "@/lib/preview-orchestrator";

type RouteParams = {
  params: Promise<{
    taskId: string;
    agent: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId, agent } = await params;
    const role = (agent.toLowerCase() === "antigravity" || agent.toLowerCase() === "agy"
      ? "antigravity"
      : agent.toLowerCase() === "synthesis"
      ? "synthesis"
      : "claude") as AgentWorktreeRole;

    // 1. Try serving static file if worktree has an index.html directly
    const staticRes = readWorktreeStaticFile(taskId, role, "");
    if (staticRes.found && staticRes.content) {
      return new NextResponse(new Uint8Array(staticRes.content), {
        headers: {
          "Content-Type": staticRes.contentType || "text/html; charset=utf-8",
          "Cache-Control": "no-store, must-revalidate",
        },
      });
    }

    // 2. Ensure preview server is started
    const instance = await ensurePreviewServer(taskId, role);

    // 3. Proxy to ephemeral localhost port
    if (instance.status === "running" && instance.port) {
      try {
        const targetUrl = `http://127.0.0.1:${instance.port}/`;
        const proxyRes = await fetch(targetUrl, {
          headers: {
            "Accept": request.headers.get("accept") || "*/*",
            "User-Agent": request.headers.get("user-agent") || "VibeFlow-Preview-Proxy",
          },
          signal: AbortSignal.timeout(4000),
        });

        const body = await proxyRes.arrayBuffer();
        const contentType = proxyRes.headers.get("content-type") || "text/html; charset=utf-8";

        return new NextResponse(body, {
          status: proxyRes.status,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
          },
        });
      } catch {
        // Fall through to waiting/splash page
      }
    }

    // 4. Return clean live loading/status page while dev server warms up
    const agentLabel = role === "claude" ? "Claude Code Pro" : "Antigravity CLI";
    const agentColor = role === "claude" ? "#d97757" : "#4285f4";

    const loadingHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prévisualisation Live — ${agentLabel}</title>
  <style>
    body {
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .badge {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid ${agentColor}40;
      color: ${agentColor};
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: ${agentColor};
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 { font-size: 16px; margin: 0 0 8px 0; }
    p { font-size: 12px; color: #a1a1aa; max-width: 360px; line-height: 1.5; margin: 0; }
  </style>
  <script>
    // Auto-refresh until server is live
    setTimeout(() => window.location.reload(), 2000);
  </script>
</head>
<body>
  <div class="badge">${agentLabel} · Port ${instance?.port || "Init"}</div>
  <div class="spinner"></div>
  <h2>Serveur de Prévisualisation Éphémère</h2>
  <p>Compilation et démarrage de l'environnement isolé dans le worktree dédié...</p>
</body>
</html>`;

    return new NextResponse(loadingHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/preview] Error:", error);
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#09090b;color:#f87171;font-family:monospace;padding:24px;">Erreur prévisualisation: ${error.message}</body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
