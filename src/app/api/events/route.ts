// ============================================================
// VibeFlow Studio — Server-Sent Events (SSE) Route
// Streaming real-time updates to the frontend without polling
// ============================================================

import { NextRequest } from "next/server";
import { subscribeVibeEvents, type VibeEventPayload } from "@/lib/event-bus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId") || undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      const initMessage = `data: ${JSON.stringify({
        type: "CONNECTED",
        message: "VibeFlow Realtime SSE Stream Connected",
        projectId,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initMessage));

      // Subscribe to internal event bus
      const unsubscribe = subscribeVibeEvents((payload: VibeEventPayload) => {
        try {
          const message = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error("[SSE] Failed to enqueue event:", err);
        }
      }, projectId);

      // Heartbeat interval to keep connection alive through proxies
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // Cleanup when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
