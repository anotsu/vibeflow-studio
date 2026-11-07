// ============================================================
// VibeFlow Studio — Agent State Detection Engine
// Calibrated from official Herdr manifests (claude.toml & antigravity.toml)
// Detects real-time states (WORKING, BLOCKED, IDLE) from terminal output
// ============================================================

export type AgentState = "WORKING" | "BLOCKED" | "IDLE" | "UNKNOWN";

export interface AgentActionSuggestion {
  label: string;
  input: string; // Terminal input characters to deliver (e.g. "1\r", "y\r", "\r", "\x1b")
  variant: "primary" | "danger" | "secondary";
}

export interface DetectedAgentStatus {
  agent: "claude" | "antigravity" | "unknown";
  state: AgentState;
  ruleId: string;
  reason: string;
  timestamp: number;
  blockerDetails?: string;
  suggestedActions: AgentActionSuggestion[];
}

/**
 * Strips ANSI escape sequences to inspect clean terminal text.
 */
export function stripAnsi(text: string): string {
  // Matches standard CSI and OSC ANSI codes
  return text.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

/**
 * Extract the last N non-empty lines from terminal buffer.
 */
function getLastNonEmptyLines(text: string, count: number): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(-count);
}

// ────────────────────────────────────────────────────────────
// Claude Code Detection Rules (calibrated from herdr claude.toml)
// ────────────────────────────────────────────────────────────

function detectClaudeState(cleanText: string, recentLines: string[]): DetectedAgentStatus | null {
  const lower = cleanText.toLowerCase();
  const recentLower = recentLines.join("\n").toLowerCase();

  // 1. BLOCKED : Bash or Tool Permission Prompt
  if (
    (lower.includes("do you want to proceed?") || lower.includes("waiting for permission")) &&
    (lower.includes("bash command") ||
      lower.includes("bash(") ||
      lower.includes("contains expansion") ||
      lower.includes("tab to amend") ||
      lower.includes("ctrl+e to explain") ||
      recentLower.includes("yes") ||
      recentLower.includes("1. yes") ||
      recentLower.includes("esc to cancel"))
  ) {
    return {
      agent: "claude",
      state: "BLOCKED",
      ruleId: "claude_bash_permission_prompt",
      reason: "Claude Code attend votre approbation pour exécuter une commande.",
      timestamp: Date.now(),
      blockerDetails: recentLines.slice(-3).join(" "),
      suggestedActions: [
        { label: "Autoriser (1. Yes)", input: "1\r", variant: "primary" },
        { label: "Refuser (No)", input: "2\r", variant: "danger" },
        { label: "Annuler (Esc)", input: "\x1b", variant: "secondary" },
      ],
    };
  }

  // 2. BLOCKED : Form / MCP Elicitation / Confirmation
  if (
    lower.includes("esc to cancel") &&
    (lower.includes("enter to confirm") ||
      lower.includes("enter to select") ||
      lower.includes("tab/arrow keys") ||
      lower.includes("arrow keys to navigate") ||
      lower.includes("mcp server") ||
      lower.includes("run a dynamic workflow?"))
  ) {
    return {
      agent: "claude",
      state: "BLOCKED",
      ruleId: "claude_form_blocked",
      reason: "Claude Code requiert une sélection ou confirmation interactive.",
      timestamp: Date.now(),
      blockerDetails: recentLines.slice(-2).join(" "),
      suggestedActions: [
        { label: "Confirmer (Enter)", input: "\r", variant: "primary" },
        { label: "Annuler (Esc)", input: "\x1b", variant: "secondary" },
      ],
    };
  }

  // 3. WORKING : Turn in progress, spinner or background agents
  // Matches braille spinner [\u2800-\u28FF] or thinking markers
  const hasBrailleSpinner = /[\u2800-\u28FF]/.test(cleanText);
  const hasInterruptFooter = /esc to interrupt/i.test(recentLower);
  const hasThinkingMarker = /[\u2722\u2733\u2736\u273B\u273D·*]/.test(recentLower) && recentLower.includes("…");
  const hasBackgroundAgents = /waiting for \d+ background agent/i.test(recentLower);
  const hasRunningMcp = /\d+\s*mcp\s*tasks?\s*still\s*running/i.test(recentLower);

  if (hasBrailleSpinner || hasInterruptFooter || hasThinkingMarker || hasBackgroundAgents || hasRunningMcp) {
    return {
      agent: "claude",
      state: "WORKING",
      ruleId: "claude_working_turn",
      reason: "Claude Code génère du code ou exécute des agents en arrière-plan.",
      timestamp: Date.now(),
      suggestedActions: [
        { label: "Interrompre (Esc)", input: "\x1b", variant: "secondary" },
      ],
    };
  }

  // 4. IDLE : Prompt ready for input
  const lastLine = recentLines[recentLines.length - 1] || "";
  if (/^\s*❯/.test(lastLine) || (lastLine.endsWith(">") && !lower.includes("esc to cancel"))) {
    return {
      agent: "claude",
      state: "IDLE",
      ruleId: "claude_prompt_ready",
      reason: "Claude Code est prêt à recevoir vos instructions.",
      timestamp: Date.now(),
      suggestedActions: [],
    };
  }

  return null;
}

// ────────────────────────────────────────────────────────────
// Antigravity Detection Rules (calibrated from herdr antigravity.toml)
// ────────────────────────────────────────────────────────────

function detectAntigravityState(cleanText: string, recentLines: string[]): DetectedAgentStatus | null {
  const lower = cleanText.toLowerCase();
  const recentLower = recentLines.join("\n").toLowerCase();

  // 1. BLOCKED : Trust confirmation
  if (
    lower.includes("do you trust the contents of this project?") ||
    (lower.includes("yes, i trust this folder") && lower.includes("enter confirm"))
  ) {
    return {
      agent: "antigravity",
      state: "BLOCKED",
      ruleId: "antigravity_trust_prompt",
      reason: "Antigravity attend la confirmation de confiance sur le dossier.",
      timestamp: Date.now(),
      suggestedActions: [
        { label: "Faire confiance (Enter)", input: "\r", variant: "primary" },
        { label: "Annuler (Esc)", input: "\x1b", variant: "secondary" },
      ],
    };
  }

  // 2. BLOCKED : Permission or Question Dialog
  if (
    (lower.includes("navigate") && lower.includes("tab amend")) ||
    (lower.includes("navigate") && lower.includes("esc skip")) ||
    lower.includes("requesting permission for:")
  ) {
    return {
      agent: "antigravity",
      state: "BLOCKED",
      ruleId: "antigravity_permission_prompt",
      reason: "Antigravity attend votre validation pour appliquer les modifications.",
      timestamp: Date.now(),
      blockerDetails: recentLines.slice(-2).join(" "),
      suggestedActions: [
        { label: "Accepter (Enter)", input: "\r", variant: "primary" },
        { label: "Passer (Esc)", input: "\x1b", variant: "secondary" },
      ],
    };
  }

  // 3. WORKING : Spinner or task running
  const hasBraille = /[\u2801-\u28FF]/.test(cleanText);
  const hasCancelFooter = /─{3,}\s*esc to cancel/i.test(cleanText);

  if (hasBraille || (hasCancelFooter && !lower.includes("tab amend"))) {
    return {
      agent: "antigravity",
      state: "WORKING",
      ruleId: "antigravity_working",
      reason: "Antigravity synthétise l'architecture et génère les composants.",
      timestamp: Date.now(),
      suggestedActions: [
        { label: "Annuler (Esc)", input: "\x1b", variant: "secondary" },
      ],
    };
  }

  // 4. IDLE : Ready
  if (lower.includes("? for shortcuts") || lower.includes("tab complete") || recentLower.includes("agy>")) {
    return {
      agent: "antigravity",
      state: "IDLE",
      ruleId: "antigravity_idle",
      reason: "Antigravity CLI est prêt pour la prochaine tâche.",
      timestamp: Date.now(),
      suggestedActions: [],
    };
  }

  return null;
}

// ────────────────────────────────────────────────────────────
// Main Detection Engine (with Program Status Protocol OSC 7501)
// ────────────────────────────────────────────────────────────

export function detectAgentState(
  rawBuffer: string,
  preferredAgent?: "claude" | "antigravity"
): DetectedAgentStatus {
  // Check for explicit OSC 7501 sequence: \x1b]7501;state=working;agent=claude\x07
  const oscMatch = rawBuffer.match(/\x1b\]7501;([^;\x07]+)(?:;([^\x07]+))?\x07/);
  if (oscMatch) {
    const params = new URLSearchParams(oscMatch[1].replace(/;/g, "&"));
    const stateStr = (params.get("state") || "working").toUpperCase();
    const state: AgentState =
      stateStr === "BLOCKED" ? "BLOCKED" : stateStr === "IDLE" ? "IDLE" : "WORKING";
    const agent = (params.get("agent") || preferredAgent || "claude") as "claude" | "antigravity";

    return {
      agent,
      state,
      ruleId: "osc_7501_protocol",
      reason: params.get("reason") || `Statut déclaré via OSC 7501 : ${state}`,
      timestamp: Date.now(),
      suggestedActions:
        state === "BLOCKED"
          ? [{ label: "Confirmer (Enter)", input: "\r", variant: "primary" }]
          : [],
    };
  }

  const cleanText = stripAnsi(rawBuffer);
  const recentLines = getLastNonEmptyLines(cleanText, 15);

  if (preferredAgent === "antigravity") {
    const anti = detectAntigravityState(cleanText, recentLines);
    if (anti) return anti;
  } else if (preferredAgent === "claude") {
    const claude = detectClaudeState(cleanText, recentLines);
    if (claude) return claude;
  }

  // Auto-detect based on matched agent patterns
  const claudeResult = detectClaudeState(cleanText, recentLines);
  if (claudeResult) return claudeResult;

  const antiResult = detectAntigravityState(cleanText, recentLines);
  if (antiResult) return antiResult;

  return {
    agent: preferredAgent || "unknown",
    state: "UNKNOWN",
    ruleId: "fallback_unknown",
    reason: "En attente d'activité dans le terminal",
    timestamp: Date.now(),
    suggestedActions: [],
  };
}
