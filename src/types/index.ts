// ============================================================
// VibeFlow Studio — TypeScript Type Definitions
// ============================================================

import type {
  Project,
  Task,
  ToolboxItem,
  AgentDebateLog,
  Deployment,
  Milestone,
  ChatMessage,
} from "@prisma/client";

// ─── Re-exports with full relations ─────────────────────────

export type ProjectWithRelations = Project & {
  milestones: Milestone[];
  toolboxItems: ToolboxItem[];
  tasks: TaskWithRelations[];
  deployments: Deployment[];
};

export type TaskWithRelations = Task & {
  debateLogs: AgentDebateLog[];
  milestone: Milestone | null;
};

export type MilestoneWithTasks = Milestone & {
  tasks: Task[];
};

// ─── API Request/Response Types ─────────────────────────────

export interface CreateProjectInput {
  name: string;
  vibeDescription: string;
  githubRepo: string;
  githubDefaultBranch?: string;
  coolifyAppUuid?: string;
  coolifyServerUrl?: string;
  githubToken?: string;
  anthropicApiKey?: string;
  coolifyApiToken?: string;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  milestoneId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  origin?: "USER" | "AI_GENERATED" | "AUTO_OPTIMIZATION";
}

export interface VibeMessage {
  role: "user" | "assistant" | "system";
  content: string;
  milestoneRef?: string;
  actionTaken?: string;
}

// ─── GitHub Types ───────────────────────────────────────────

export interface GitHubBranch {
  name: string;
  sha: string;
  protected: boolean;
}

export interface GitHubDiff {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  htmlUrl: string;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  mergeable: boolean | null;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

// ─── Coolify Types ──────────────────────────────────────────

export interface CoolifyDeployment {
  uuid: string;
  status: string;
  branch: string;
  previewUrl?: string;
  createdAt: string;
}

export interface CoolifyApplication {
  uuid: string;
  name: string;
  fqdn: string;
  status: string;
  repository: string;
  branch: string;
  buildPack: string;
}

export interface CoolifyEnvVar {
  key: string;
  value: string;
  isBuildTime: boolean;
  isPreview: boolean;
}

// ─── Orchestrator Types ─────────────────────────────────────

export type OrchestratorPhase =
  | "IDLE"
  | "BRANCHING"
  | "CLAUDE_IMPLEMENTING"
  | "ANTIGRAVITY_IMPLEMENTING"
  | "CROSS_REVIEW"
  | "DEBATE"
  | "SYNTHESIS"
  | "TESTING"
  | "MERGING"
  | "DEPLOYING"
  | "COMPLETE"
  | "FAILED";

export interface OrchestratorState {
  taskId: string;
  phase: OrchestratorPhase;
  claudeBranch: string;
  antigravityBranch: string;
  synthesisBranch: string;
  currentRound: number;
  maxRounds: number;
  claudeScore: number;
  antigravityScore: number;
  errors: string[];
}

export interface AgentReview {
  agent: "CLAUDE" | "ANTIGRAVITY";
  targetBranch: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallScore: number;
  codeSuggestions: CodeSuggestion[];
}

export interface CodeSuggestion {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  originalCode: string;
  suggestedCode: string;
  rationale: string;
}

// ─── Terminal / WebSocket Types ─────────────────────────────

export type TerminalTarget =
  | "bash"
  | "claude"
  | "antigravity"
  | "broadcast"
  | "coolify-logs";

export interface TerminalMessage {
  type: "input" | "output" | "resize" | "error" | "system";
  target: TerminalTarget;
  data: string;
  sessionId: string;
  timestamp: number;
}

export interface TerminalSession {
  id: string;
  target: TerminalTarget;
  projectId: string;
  pid?: number;
  active: boolean;
}

// ─── Toolbox Analysis Types ─────────────────────────────────

export interface ToolboxAnalysisResult {
  acquired: ToolboxDetectedItem[];
  missing: ToolboxDetectedItem[];
}

export interface ToolboxDetectedItem {
  name: string;
  category: string;
  version?: string;
  sourceFile?: string;
  reason: string;
  installCommand?: string;
  envVarsNeeded?: string[];
}

// ─── UI State Types ─────────────────────────────────────────

export type WorkspaceTab = "kanban" | "arena" | "toolbox";
export type CliTab = "bash" | "claude" | "antigravity" | "coolify-logs";

export interface UIState {
  activeWorkspaceTab: WorkspaceTab;
  activeCliTab: CliTab;
  sidebarOpen: boolean;
  cliPanelOpen: boolean;
  cliPanelPosition: "bottom" | "right";
  selectedProjectId: string | null;
}

// ─── Event Types ────────────────────────────────────────────

export interface WebhookEvent {
  source: "github" | "coolify";
  action: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface TaskEvent {
  type:
    | "task_created"
    | "phase_changed"
    | "debate_message"
    | "synthesis_complete"
    | "deploy_triggered"
    | "deploy_failed"
    | "deploy_success"
    | "healing_attempt";
  taskId: string;
  data: Record<string, unknown>;
  timestamp: number;
}
