// ============================================================
// VibeFlow Studio — API Route: Reverse-Proxy Preview (Assets & Subpaths)
// GET /api/preview/[taskId]/[agent]/[...slug]
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getPreviewInstance,
  readWorktreeStaticFile,
  AgentWorktreeRole,
} from "@/lib/preview-orchestrator";

type RouteParams = {
  params: Promise<{
    taskId: string;
    agent: string;
    slug: string[];
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId, agent, slug } = await params;
    const role = (agent.toLowerCase() === "antigravity" || agent.toLowerCase() === "agy"
      ? "antigravity"
      : agent.toLowerCase() === "synthesis"
      ? "synthesis"
      : "claude") as AgentWorktreeRole;

    const subPath = (slug || []).join("/");

    // 1. Try static file in worktree
    const staticRes = readWorktreeStaticFile(taskId, role, subPath);
    if (staticRes.found && staticRes.content) {
      return new NextResponse(new Uint8Array(staticRes.content), {
        headers: {
          "Content-Type": staticRes.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 2. Try proxying to live preview server
    const instance = getPreviewInstance(taskId, role);
    if (instance && instance.status === "running" && instance.port) {
      const targetUrl = `http://127.0.0.1:${instance.port}/${subPath}`;
      try {
        const proxyRes = await fetch(targetUrl, {
          headers: {
            "Accept": request.headers.get("accept") || "*/*",
            "User-Agent": request.headers.get("user-agent") || "VibeFlow-Preview-Proxy",
          },
          signal: AbortSignal.timeout(4000),
        });

        const body = await proxyRes.arrayBuffer();
        const contentType = proxyRes.headers.get("content-type") || "application/octet-stream";

        return new NextResponse(body, {
          status: proxyRes.status,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
          },
        });
      } catch {}
    }

    return new NextResponse("Asset Not Found", { status: 404 });
  } catch (error: any) {
    return new NextResponse(`Preview error: ${error.message}`, { status: 500 });
  }
}
