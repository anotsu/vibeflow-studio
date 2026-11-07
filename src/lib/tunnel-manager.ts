// ============================================================
// VibeFlow Studio — Ephemeral Mobile Tunnel Manager
// Phase 6.2 : Instant Mobile Testing via Tunnels & QR Codes
// Provides secure public access for testing dual-branch implementations
// on real mobile devices without DNS or port-forwarding.
// ============================================================

import { ensurePreviewServer, getPreviewInstance, AgentWorktreeRole } from "@/lib/preview-orchestrator";

export interface MobileTunnelInfo {
  taskId: string;
  role: AgentWorktreeRole;
  localPort: number;
  tunnelUrl: string;
  qrCodeUrl: string;
  expiresAt: number;
  active: boolean;
}

// Global registry of active tunnels
const globalTunnels = global as unknown as {
  __vibeflowTunnels?: Map<string, MobileTunnelInfo>;
};

if (!globalTunnels.__vibeflowTunnels) {
  globalTunnels.__vibeflowTunnels = new Map<string, MobileTunnelInfo>();
}

const tunnelRegistry = globalTunnels.__vibeflowTunnels;

/**
 * Creates or retrieves an active mobile testing tunnel for a task preview.
 */
export async function getOrCreateMobileTunnel(
  taskId: string,
  role: AgentWorktreeRole = "claude"
): Promise<MobileTunnelInfo> {
  const key = `${taskId}:${role}`;
  const existing = tunnelRegistry.get(key);

  if (existing && existing.active && existing.expiresAt > Date.now()) {
    return existing;
  }

  // Ensure underlying preview server is running
  const preview = await ensurePreviewServer(taskId, role);
  const port = preview.port || 3000;

  // Determine public URL
  // If hosted in production (Coolify / Capstation), use public reverse proxy
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vibeflow.capstation.fr";
  const tunnelUrl = `${appBaseUrl.replace(/\/+$/, "")}/api/preview/${taskId}/${role}`;

  // Generate lightweight Google Charts or QuickChart QR Code API URL for instant mobile scanning
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tunnelUrl)}`;

  const tunnelInfo: MobileTunnelInfo = {
    taskId,
    role,
    localPort: port,
    tunnelUrl,
    qrCodeUrl,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiry
    active: true,
  };

  tunnelRegistry.set(key, tunnelInfo);
  return tunnelInfo;
}

/**
 * Closes an active mobile tunnel.
 */
export function closeMobileTunnel(taskId: string, role: AgentWorktreeRole): boolean {
  const key = `${taskId}:${role}`;
  return tunnelRegistry.delete(key);
}
