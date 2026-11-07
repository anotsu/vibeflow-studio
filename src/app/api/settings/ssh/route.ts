// ============================================================
// VibeFlow Studio — API Route: /api/settings/ssh
// Manages Remote SSH Hosts & Runners (e.g. Mac mini, VPS)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getSshHosts,
  getSshHost,
  saveSshHost,
  deleteSshHost,
  setDefaultSshHost,
  testSshConnection,
} from "@/lib/ssh-service";
import type { SshHostConfig } from "@/types";

/**
 * Mask sensitive credentials for safe client rendering.
 */
function maskHost(host: SshHostConfig): SshHostConfig {
  return {
    ...host,
    password: host.password ? "••••••••" : "",
    privateKey: host.privateKey ? "•••••••• (clé configurée)" : "",
    passphrase: host.passphrase ? "••••••••" : "",
  };
}

export async function GET() {
  try {
    const hosts = await getSshHosts();
    const masked = hosts.map(maskHost);
    return NextResponse.json({ success: true, hosts: masked });
  } catch (err: any) {
    console.error("[SSH API] Error fetching hosts:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erreur de chargement" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── ACTION: TEST CONNECTION ─────────────────────────────
    if (action === "test") {
      let hostConfig: SshHostConfig;

      // If test by host ID
      if (body.id && !body.host) {
        const found = await getSshHost(body.id);
        if (!found) {
          return NextResponse.json(
            { success: false, error: "Hôte introuvable" },
            { status: 404 }
          );
        }
        hostConfig = found;
      } else {
        // Direct test from form data (before saving)
        hostConfig = {
          id: body.id || "",
          name: body.name || "Test Host",
          host: body.host || "",
          port: Number(body.port) || 22,
          username: body.username || "",
          authType: body.authType || "key",
          privateKey: body.privateKey || "",
          password: body.password || "",
          passphrase: body.passphrase || "",
          remoteWorkspace: body.remoteWorkspace || "",
        };

        // If editing existing and masked, grab real secret from DB
        if (body.id) {
          const existing = await getSshHost(body.id);
          if (existing) {
            if (hostConfig.password === "••••••••" || !hostConfig.password) {
              hostConfig.password = existing.password;
            }
            if (
              hostConfig.privateKey?.startsWith("••••••••") ||
              !hostConfig.privateKey
            ) {
              hostConfig.privateKey = existing.privateKey;
            }
            if (hostConfig.passphrase === "••••••••") {
              hostConfig.passphrase = existing.passphrase;
            }
          }
        }
      }

      if (!hostConfig.host || !hostConfig.username) {
        return NextResponse.json(
          { success: false, error: "Adresse hôte et nom d'utilisateur requis" },
          { status: 400 }
        );
      }

      const result = await testSshConnection(hostConfig);
      return NextResponse.json(result);
    }

    // ── ACTION: SAVE HOST ───────────────────────────────────
    if (action === "save") {
      const hostData = body.host;
      if (!hostData || !hostData.host || !hostData.username) {
        return NextResponse.json(
          { success: false, error: "Champs requis manquants (host, username)" },
          { status: 400 }
        );
      }

      const saved = await saveSshHost(hostData);
      return NextResponse.json({
        success: true,
        message: `Hôte SSH '${saved.name}' enregistré.`,
        host: maskHost(saved),
      });
    }

    // ── ACTION: DELETE HOST ─────────────────────────────────
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { success: false, error: "ID hôte requis" },
          { status: 400 }
        );
      }

      const deleted = await deleteSshHost(id);
      return NextResponse.json({
        success: deleted,
        message: deleted ? "Hôte supprimé." : "Hôte introuvable.",
      });
    }

    // ── ACTION: SET DEFAULT ─────────────────────────────────
    if (action === "set_default") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { success: false, error: "ID hôte requis" },
          { status: 400 }
        );
      }

      const success = await setDefaultSshHost(id);
      return NextResponse.json({
        success,
        message: success ? "Hôte par défaut mis à jour." : "Hôte introuvable.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Action non reconnue" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[SSH API] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
