// ============================================================
// VibeFlow Studio — Real-Time Event Bus (Server-Sent Events)
// Broadcasts inter-agent debates, task updates & deployment events
// ============================================================

import { EventEmitter } from "events";
import type { TaskEvent } from "@/types";

declare global {
  // eslint-disable-next-line no-var
  var __vibeflow_event_bus: EventEmitter | undefined;
}

const eventBus = globalThis.__vibeflow_event_bus ?? new EventEmitter();
eventBus.setMaxListeners(100);

if (process.env.NODE_ENV !== "production") {
  globalThis.__vibeflow_event_bus = eventBus;
}

export type VibeEventType =
  | "TASK_UPDATED"
  | "DEBATE_MESSAGE"
  | "PHASE_CHANGED"
  | "DEPLOYMENT_STATUS"
  | "TOOLBOX_UPDATED"
  | "MILESTONE_UPDATED"
  | "AUTO_MODE_TICK";

export interface VibeEventPayload {
  type: VibeEventType;
  projectId: string;
  taskId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/** Broadcast an event across all active SSE client streams */
export function broadcastVibeEvent(
  type: VibeEventType,
  projectId: string,
  data: Record<string, unknown>,
  taskId?: string
) {
  const payload: VibeEventPayload = {
    type,
    projectId,
    taskId,
    data,
    timestamp: Date.now(),
  };

  eventBus.emit("vibe-event", payload);
  eventBus.emit(`vibe-event:${projectId}`, payload);
  return payload;
}

/** Subscribe to all events or events for a specific project */
export function subscribeVibeEvents(
  callback: (payload: VibeEventPayload) => void,
  projectId?: string
): () => void {
  const eventName = projectId ? `vibe-event:${projectId}` : "vibe-event";
  eventBus.on(eventName, callback);
  return () => {
    eventBus.off(eventName, callback);
  };
}

export { eventBus };
