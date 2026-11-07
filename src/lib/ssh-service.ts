// ============================================================
// VibeFlow Studio — SSH Remote Host & Runner Service
// Manages SSH connections to remote hosts (e.g. Mac mini, VPS)
// For remote terminal sessions and agent CLI executions
// ============================================================

import { Client, ConnectConfig } from "ssh2";
import { prisma } from "@/lib/prisma";
import type { SshHostConfig, SshSystemInfo } from "@/types";

// In-memory cache for standalone local execution / fallback
const globalSsh = global as unknown as {
  __vibeflowSshHosts?: SshHostConfig[];
};

if (!globalSsh.__vibeflowSshHosts) {
  globalSsh.__vibeflowSshHosts = [];
}

/**
 * Retrieves all configured SSH hosts from DB or memory fallback.
 */
export async function getSshHosts(): Promise<SshHostConfig[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ssh_hosts" },
    });
    if (setting?.value) {
      const parsed: SshHostConfig[] = JSON.parse(setting.value);
      globalSsh.__vibeflowSshHosts = parsed;
      return parsed;
    }
  } catch (err) {
    // DB not available, use in-memory cache
  }

  return globalSsh.__vibeflowSshHosts || [];
}

/**
 * Retrieves a single SSH host by ID.
 */
export async function getSshHost(id: string): Promise<SshHostConfig | null> {
  const hosts = await getSshHosts();
  return hosts.find((h) => h.id === id) || null;
}

/**
 * Retrieves the default SSH host (or first online host).
 */
export async function getDefaultSshHost(): Promise<SshHostConfig | null> {
  const hosts = await getSshHosts();
  return hosts.find((h) => h.isDefault) || hosts[0] || null;
}

/**
 * Persists the list of SSH hosts to the DB and memory cache.
 */
async function persistHosts(hosts: SshHostConfig[]): Promise<void> {
  globalSsh.__vibeflowSshHosts = hosts;
  try {
    await prisma.systemSetting.upsert({
      where: { key: "ssh_hosts" },
      create: {
        key: "ssh_hosts",
        value: JSON.stringify(hosts),
      },
      update: {
        value: JSON.stringify(hosts),
      },
    });
  } catch (err) {
    // Non-blocking in memory mode
  }
}

/**
 * Adds or updates an SSH host.
 */
export async function saveSshHost(hostInput: Partial<SshHostConfig>): Promise<SshHostConfig> {
  const hosts = await getSshHosts();
  const now = new Date().toISOString();

  let targetHost: SshHostConfig;

  if (hostInput.id) {
    const idx = hosts.findIndex((h) => h.id === hostInput.id);
    if (idx !== -1) {
      const existing = hosts[idx];
      // Preserve secrets if not updated
      const password =
        hostInput.password && hostInput.password !== "••••••••"
          ? hostInput.password
          : existing.password;

      const privateKey =
        hostInput.privateKey && !hostInput.privateKey.startsWith("••••••••")
          ? hostInput.privateKey
          : existing.privateKey;

      targetHost = {
        ...existing,
        ...hostInput,
        password,
        privateKey,
        updatedAt: now,
      } as SshHostConfig;

      hosts[idx] = targetHost;
    } else {
      targetHost = {
        id: hostInput.id,
        name: hostInput.name || "Hôte distant",
        host: hostInput.host || "localhost",
        port: hostInput.port || 22,
        username: hostInput.username || "root",
        authType: hostInput.authType || "key",
        privateKey: hostInput.privateKey || "",
        password: hostInput.password || "",
        passphrase: hostInput.passphrase || "",
        remoteWorkspace: hostInput.remoteWorkspace || "~/vibeflow-workspace",
        isDefault: Boolean(hostInput.isDefault),
        status: "UNKNOWN",
        createdAt: now,
        updatedAt: now,
      };
      hosts.push(targetHost);
    }
  } else {
    // New host
    targetHost = {
      id: `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: hostInput.name || "Mac mini Distant",
      host: hostInput.host || "192.168.1.50",
      port: hostInput.port || 22,
      username: hostInput.username || "user",
      authType: hostInput.authType || "key",
      privateKey: hostInput.privateKey || "",
      password: hostInput.password || "",
      passphrase: hostInput.passphrase || "",
      remoteWorkspace: hostInput.remoteWorkspace || "~/vibeflow-workspace",
      isDefault: hosts.length === 0 || Boolean(hostInput.isDefault),
      status: "UNKNOWN",
      createdAt: now,
      updatedAt: now,
    };
    hosts.push(targetHost);
  }

  // If this host is default, remove default from others
  if (targetHost.isDefault) {
    for (const h of hosts) {
      if (h.id !== targetHost.id) {
        h.isDefault = false;
      }
    }
  }

  await persistHosts(hosts);
  return targetHost;
}

/**
 * Deletes an SSH host by ID.
 */
export async function deleteSshHost(id: string): Promise<boolean> {
  const hosts = await getSshHosts();
  const filtered = hosts.filter((h) => h.id !== id);
  if (filtered.length !== hosts.length) {
    if (filtered.length > 0 && !filtered.some((h) => h.isDefault)) {
      filtered[0].isDefault = true;
    }
    await persistHosts(filtered);
    return true;
  }
  return false;
}

/**
 * Sets a specific SSH host as default.
 */
export async function setDefaultSshHost(id: string): Promise<boolean> {
  const hosts = await getSshHosts();
  let found = false;
  for (const h of hosts) {
    if (h.id === id) {
      h.isDefault = true;
      found = true;
    } else {
      h.isDefault = false;
    }
  }
  if (found) {
    await persistHosts(hosts);
  }
  return found;
}

/**
 * Helper to build ssh2 connect options from config.
 */
function buildConnectConfig(config: SshHostConfig): ConnectConfig {
  const opts: ConnectConfig = {
    host: config.host,
    port: config.port || 22,
    username: config.username,
    readyTimeout: 10000,
    keepaliveInterval: 10000,
  };

  if (config.authType === "key") {
    if (config.privateKey) {
      opts.privateKey = config.privateKey;
      if (config.passphrase) {
        opts.passphrase = config.passphrase;
      }
    }
  } else if (config.authType === "password") {
    opts.password = config.password || "";
  }

  return opts;
}

/**
 * Tests the SSH connection and runs diagnostic checks to discover the host's system and installed CLIs.
 */
export async function testSshConnection(
  config: SshHostConfig
): Promise<{ success: boolean; message: string; systemInfo?: SshSystemInfo }> {
  return new Promise((resolve) => {
    const conn = new Client();
    let hasReturned = false;

    const timeout = setTimeout(() => {
      if (!hasReturned) {
        hasReturned = true;
        conn.end();
        resolve({
          success: false,
          message: `Délai d'attente dépassé (10s) pour joindre ${config.username}@${config.host}:${config.port}`,
        });
      }
    }, 12000);

    conn.on("ready", () => {
      // Run diagnostic commands in one combined script
      const probeScript = `
echo "===UNAME==="
uname -sm 2>/dev/null || echo "UNKNOWN"
echo "===HOSTNAME==="
hostname 2>/dev/null || echo "UNKNOWN"
echo "===CLAUDE==="
(command -v claude >/dev/null 2>&1 && claude --version 2>/dev/null) || echo "NOT_FOUND"
echo "===AGY==="
(command -v agy >/dev/null 2>&1 && agy --version 2>/dev/null) || (command -v antigravity >/dev/null 2>&1 && antigravity --version 2>/dev/null) || echo "NOT_FOUND"
echo "===NODE==="
node -v 2>/dev/null || echo "NOT_FOUND"
echo "===GIT==="
git --version 2>/dev/null || echo "NOT_FOUND"
`;

      conn.exec(probeScript, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          hasReturned = true;
          conn.end();
          resolve({
            success: true,
            message: "Connecté avec succès, mais impossible d'exécuter la sonde système.",
          });
          return;
        }

        let output = "";
        stream.on("data", (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          output += data.toString();
        });

        stream.on("close", async () => {
          clearTimeout(timeout);
          if (hasReturned) return;
          hasReturned = true;
          conn.end();

          // Parse probe results
          const systemInfo = parseProbeOutput(output);

          // Update host in memory & DB if host already has an ID
          if (config.id) {
            const hosts = await getSshHosts();
            const host = hosts.find((h) => h.id === config.id);
            if (host) {
              host.status = "ONLINE";
              host.lastTestedAt = new Date().toISOString();
              host.systemInfo = systemInfo;
              await persistHosts(hosts);
            }
          }

          let summary = `Connexion réussie à ${config.username}@${config.host} !`;
          if (systemInfo.os) summary += ` [${systemInfo.os} - ${systemInfo.arch}]`;
          if (systemInfo.hasClaudeCli) summary += " · Claude CLI détecté ✅";
          if (systemInfo.hasAgyCli) summary += " · AGY CLI détecté ✅";

          resolve({
            success: true,
            message: summary,
            systemInfo,
          });
        });
      });
    });

    conn.on("error", (err: Error) => {
      clearTimeout(timeout);
      if (!hasReturned) {
        hasReturned = true;
        // Mark as offline if existing
        if (config.id) {
          getSshHosts().then((hosts) => {
            const host = hosts.find((h) => h.id === config.id);
            if (host) {
              host.status = "OFFLINE";
              host.lastTestedAt = new Date().toISOString();
              persistHosts(hosts);
            }
          });
        }
        resolve({
          success: false,
          message: `Erreur SSH: ${err.message}`,
        });
      }
    });

    try {
      conn.connect(buildConnectConfig(config));
    } catch (err: any) {
      clearTimeout(timeout);
      if (!hasReturned) {
        hasReturned = true;
        resolve({
          success: false,
          message: `Configuration invalide: ${err.message}`,
        });
      }
    }
  });
}

/**
 * Parses the raw output from the diagnostic probe script into structured SshSystemInfo.
 */
function parseProbeOutput(raw: string): SshSystemInfo {
  const getSection = (name: string): string => {
    const regex = new RegExp(`===${name}===\\r?\\n([\\s\\S]*?)(?:===|$)`);
    const match = raw.match(regex);
    return match ? match[1].trim() : "";
  };

  const uname = getSection("UNAME");
  const hostname = getSection("HOSTNAME");
  const claudeRaw = getSection("CLAUDE");
  const agyRaw = getSection("AGY");
  const nodeRaw = getSection("NODE");
  const gitRaw = getSection("GIT");

  let os = "Linux";
  let arch = "x86_64";

  if (uname.includes("Darwin")) {
    os = "macOS (Apple)";
  } else if (uname.includes("Linux")) {
    os = "Linux";
  }

  if (uname.includes("arm64") || uname.includes("aarch64")) {
    arch = "arm64 (Apple Silicon)";
  } else if (uname.includes("x86_64") || uname.includes("amd64")) {
    arch = "x86_64";
  }

  const hasClaudeCli = claudeRaw !== "NOT_FOUND" && claudeRaw.length > 0;
  const hasAgyCli = agyRaw !== "NOT_FOUND" && agyRaw.length > 0;

  return {
    os,
    arch,
    hostname,
    hasClaudeCli,
    claudeVersion: hasClaudeCli ? claudeRaw.split("\n")[0] : undefined,
    hasAgyCli,
    agyVersion: hasAgyCli ? agyRaw.split("\n")[0] : undefined,
    nodeVersion: nodeRaw !== "NOT_FOUND" ? nodeRaw : undefined,
    gitVersion: gitRaw !== "NOT_FOUND" ? gitRaw : undefined,
  };
}

/**
 * Executes a one-off command on an SSH host and returns stdout/stderr/code.
 */
export async function executeSshCommand(
  config: SshHostConfig,
  command: string,
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      const fullCmd = cwd ? `cd "${cwd}" && ${command}` : command;

      conn.exec(fullCmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let stdout = "";
        let stderr = "";

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("close", (code: number) => {
          conn.end();
          resolve({
            stdout,
            stderr,
            exitCode: typeof code === "number" ? code : 0,
          });
        });
      });
    });

    conn.on("error", (err: Error) => {
      reject(err);
    });

    try {
      conn.connect(buildConnectConfig(config));
    } catch (err) {
      reject(err);
    }
  });
}
