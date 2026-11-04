// ============================================================
// VibeFlow Studio — Dual-Branch Arena (High-Fidelity Debate Viewer)
// Interactive Code Diffs, Quality Scoring, Inter-Agent Chat & Simulation
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Rocket,
  GitCompareArrows,
  MessageSquare,
  Sparkles,
  Eye,
  ExternalLink,
  FileCode,
  ArrowLeftRight,
  Trophy,
  Play,
  Loader2,
  CheckCircle2,
  GitMerge,
  Split,
  FileDiff,
  Layers,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { TaskWithRelations } from "@/types";
import type { AgentDebateLog } from "@prisma/client";

type ArenaView = "diff" | "debate" | "preview";

export function DualBranchArena() {
  const { tasks, debateLogs, fetchTaskDebate, deployments, selectedProject, selectProject } =
    useProjectStore();
  const { addNotification } = useUIStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ArenaView>("debate");
  const [isSimulating, setIsSimulating] = useState(false);
  const [diffMode, setDiffMode] = useState<"split" | "unified">("split");

  // Filter tasks that have dual branches
  const duelTasks = tasks.filter(
    (t) => t.claudeBranch || t.antigravityBranch || t.status === "IN_DEBATE" || t.status === "SYNTHESIS"
  );

  const selectedTask = duelTasks.find((t) => t.id === selectedTaskId) || duelTasks[0];

  useEffect(() => {
    if (selectedTask?.id) {
      setSelectedTaskId(selectedTask.id);
      fetchTaskDebate(selectedTask.id);
    }
  }, [selectedTask?.id, fetchTaskDebate]);

  // Preview deployments
  const claudeDeployment = deployments.find(
    (d) => d.branch === selectedTask?.claudeBranch
  );
  const antigravityDeployment = deployments.find(
    (d) => d.branch === selectedTask?.antigravityBranch
  );

  // Trigger live simulation
  const handleRunSimulation = async () => {
    if (!selectedProject) return;
    setIsSimulating(true);

    try {
      const targetId = selectedTask ? selectedTask.id : `task_sim_${Date.now()}`;
      const res = await fetch("/api/agents/simulate-duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: targetId,
          projectId: selectedProject.id,
        }),
      });

      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();

      addNotification({
        type: "success",
        title: "Duel achevé !",
        message: "Claude et Antigravity ont terminé leur challenge croisé et synthétisé la solution.",
        autoDismissMs: 4000,
      });

      // Reload project and task debates
      await selectProject(selectedProject.id);
      if (data.taskId) {
        setSelectedTaskId(data.taskId);
        await fetchTaskDebate(data.taskId);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur simulation",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Bar inside Arena */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/40">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <GitCompareArrows className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Arène Dual-Branch
          </span>

          {/* Task selector chips */}
          <div className="flex items-center gap-1.5 ml-2 overflow-x-auto max-w-[420px]">
            {duelTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all truncate max-w-[180px] ${
                  selectedTaskId === task.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                title={task.title}
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>

        {/* Right actions: Run Sim + View Switcher */}
        <div className="flex items-center gap-2">
          {/* Simulate Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-orange-500/20 via-primary/20 to-blue-500/20 hover:from-orange-500/30 hover:to-blue-500/30 text-foreground border border-border rounded-md transition-all shadow-sm disabled:opacity-50"
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Simuler Duel</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border/50">
            {(
              [
                { id: "debate", icon: <MessageSquare className="w-3 h-3" />, label: "Débat IA" },
                { id: "diff", icon: <FileCode className="w-3 h-3" />, label: "Code Diff" },
                { id: "preview", icon: <Eye className="w-3 h-3" />, label: "Preview Live" },
              ] as const
            ).map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  activeView === view.id
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view.icon}
                <span>{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Arena Content */}
      {!selectedTask ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
          <div className="text-center max-w-sm">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30 animate-pulse" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Aucun duel actif sélectionné</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Cliquez ci-dessous pour déclencher une simulation complète de duel entre Claude Code &amp; Antigravity.
            </p>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Lancer une Démo de Duel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeView === "debate" && <DebateView task={selectedTask} logs={debateLogs} />}
          {activeView === "diff" && (
            <DiffView
              task={selectedTask}
              diffMode={diffMode}
              onToggleMode={() => setDiffMode(diffMode === "split" ? "unified" : "split")}
            />
          )}
          {activeView === "preview" && (
            <PreviewView
              claudeUrl={claudeDeployment?.previewUrl}
              antigravityUrl={antigravityDeployment?.previewUrl}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Debate View ────────────────────────────────────────────

function DebateView({
  task,
  logs,
}: {
  task: TaskWithRelations;
  logs: AgentDebateLog[];
}) {
  // Compute average scores
  const claudeScores = logs.filter((l) => l.speaker === "CLAUDE" && l.qualityScore).map((l) => l.qualityScore!);
  const antigravityScores = logs.filter((l) => l.speaker === "ANTIGRAVITY" && l.qualityScore).map((l) => l.qualityScore!);

  const avgClaude = claudeScores.length
    ? (claudeScores.reduce((a, b) => a + b, 0) / claudeScores.length).toFixed(1)
    : "8.8";

  const avgAntigravity = antigravityScores.length
    ? (antigravityScores.reduce((a, b) => a + b, 0) / antigravityScores.length).toFixed(1)
    : "9.2";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Duel Head-to-Head Header Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
            <p className="text-xs text-muted-foreground">{task.description}</p>
          </div>
          <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
            Status: {task.status}
          </span>
        </div>

        {/* Versus Matchup Bar */}
        <div className="grid grid-cols-2 gap-4">
          {/* Claude Agent Side */}
          <div className="p-3 bg-claude-muted/30 border border-claude/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-claude/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-claude" />
              </div>
              <div>
                <span className="text-xs font-bold text-claude block">Claude Code Agent</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {task.claudeBranch || "agent/claude-branch"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-claude font-mono">{avgClaude}/10</span>
              <span className="text-[9px] text-muted-foreground block">Score Qualité</span>
            </div>
          </div>

          {/* Antigravity Agent Side */}
          <div className="p-3 bg-antigravity-muted/30 border border-antigravity/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-antigravity/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-antigravity" />
              </div>
              <div>
                <span className="text-xs font-bold text-antigravity block">Antigravity Agent</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {task.antigravityBranch || "agent/antigravity-branch"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-antigravity font-mono">{avgAntigravity}/10</span>
              <span className="text-[9px] text-muted-foreground block">Score Qualité</span>
            </div>
          </div>
        </div>
      </div>

      {/* Synthesis Decision Banner */}
      {task.synthesisDecision && (
        <div className="bg-synthesis/10 border-2 border-synthesis/40 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-synthesis" />
              <span className="text-xs font-bold uppercase tracking-wide text-synthesis">
                Synthèse Consensuelle &amp; Fusion Validée
              </span>
            </div>
            <span className="text-[11px] font-mono text-synthesis bg-synthesis/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <GitMerge className="w-3 h-3" /> {task.synthesisBranch || "synthesis/ready"}
            </span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {task.synthesisDecision}
          </p>
        </div>
      )}

      {/* Inter-Agent Debate Timeline */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> Fil de Challenge Croisé ({logs.length} messages)
        </h4>

        {logs.map((log) => (
          <DebateMessageCard key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

function DebateMessageCard({ log }: { log: AgentDebateLog }) {
  const isClaude = log.speaker === "CLAUDE";
  const isAntigravity = log.speaker === "ANTIGRAVITY";
  const isSystem = log.speaker === "SYSTEM";

  if (isSystem) {
    return (
      <div className="py-2 px-4 rounded-lg bg-secondary/40 border border-border text-center text-xs text-muted-foreground font-mono">
        ⚙️ {log.message}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        isClaude
          ? "border-claude/30 bg-claude-muted/20"
          : "border-antigravity/30 bg-antigravity-muted/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {isClaude ? (
            <Bot className="w-4 h-4 text-claude" />
          ) : (
            <Rocket className="w-4 h-4 text-antigravity" />
          )}
          <span className={`text-xs font-bold ${isClaude ? "text-claude" : "text-antigravity"}`}>
            {isClaude ? "Claude Code" : "Antigravity"}
          </span>
          {log.phase && (
            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              {log.phase} {log.round ? `· Round ${log.round}` : ""}
            </span>
          )}
        </div>

        {log.qualityScore && (
          <span className="text-xs font-mono font-bold text-foreground bg-secondary px-2 py-0.5 rounded">
            Score: {log.qualityScore.toFixed(1)}/10
          </span>
        )}
      </div>

      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
        {log.message}
      </p>

      {log.filePath && (
        <div className="mt-3 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded w-fit">
          <FileCode className="w-3.5 h-3.5 text-primary" />
          <span>{log.filePath}</span>
          {log.lineStart && <span className="text-primary font-bold">#L{log.lineStart}-{log.lineEnd}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Visual Code Diff Viewer ────────────────────────────────

function DiffView({
  task,
  diffMode,
  onToggleMode,
}: {
  task: TaskWithRelations;
  diffMode: "split" | "unified";
  onToggleMode: () => void;
}) {
  const claudeLines = (task.claudeImplementation || "// Aucun code généré").split("\n");
  const antigravityLines = (task.antigravityImplementation || "// Aucun code généré").split("\n");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Diff Controls Subheader */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card/60 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <FileDiff className="w-3.5 h-3.5 text-primary" /> Comparateur de Diffs Git
          </span>
          <span className="text-green-400 font-mono text-[11px]">+48 lignes</span>
          <span className="text-red-400 font-mono text-[11px]">-12 lignes</span>
        </div>

        <button
          onClick={onToggleMode}
          className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-[11px] font-mono"
        >
          <Split className="w-3 h-3" />
          Vue: {diffMode === "split" ? "Côte à côte" : "Unifiée"}
        </button>
      </div>

      {/* Code Container */}
      <div className="flex-1 overflow-hidden flex">
        {/* Claude Code Panel */}
        <div className="flex-1 border-r border-border flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 bg-claude-muted/30 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="text-claude font-bold flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> {task.claudeBranch || "agent/claude"}
            </span>
            <span className="text-[10px] text-muted-foreground">{claudeLines.length} lignes</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-5 bg-[#09090b]">
            {claudeLines.map((line, idx) => {
              const isAdded = line.includes("import") || line.includes("export") || line.includes("verify");
              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded ${
                    isAdded ? "bg-green-500/10 text-green-300" : "text-zinc-300"
                  }`}
                >
                  <span className="w-8 shrink-0 text-zinc-600 select-none text-[10px]">{idx + 1}</span>
                  <span className="whitespace-pre">{line}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Antigravity Code Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 bg-antigravity-muted/30 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="text-antigravity font-bold flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" /> {task.antigravityBranch || "agent/antigravity"}
            </span>
            <span className="text-[10px] text-muted-foreground">{antigravityLines.length} lignes</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-5 bg-[#09090b]">
            {antigravityLines.map((line, idx) => {
              const isAdded = line.includes("immer") || line.includes("haptic") || line.includes("triggerQuickBuy");
              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded ${
                    isAdded ? "bg-blue-500/10 text-blue-300" : "text-zinc-300"
                  }`}
                >
                  <span className="w-8 shrink-0 text-zinc-600 select-none text-[10px]">{idx + 1}</span>
                  <span className="whitespace-pre">{line}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview View (Side-by-Side iFrames) ────────────────────

function PreviewView({
  claudeUrl,
  antigravityUrl,
}: {
  claudeUrl?: string | null;
  antigravityUrl?: string | null;
}) {
  return (
    <div className="flex-1 flex gap-0 overflow-hidden">
      {/* Claude Preview */}
      <div className="flex-1 border-r border-border flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 bg-card/80 border-b border-border text-xs">
          <Bot className="w-4 h-4 text-claude" />
          <span className="font-semibold text-claude">Claude Preview Environment</span>
          {claudeUrl && (
            <a
              href={claudeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        {claudeUrl ? (
          <iframe src={claudeUrl} className="flex-1 bg-white" title="Claude Preview" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-8 text-center">
            Aucun déploiement Preview actif pour Claude sur cette tâche.
          </div>
        )}
      </div>

      {/* Antigravity Preview */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 bg-card/80 border-b border-border text-xs">
          <Rocket className="w-4 h-4 text-antigravity" />
          <span className="font-semibold text-antigravity">Antigravity Preview Environment</span>
          {antigravityUrl && (
            <a
              href={antigravityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        {antigravityUrl ? (
          <iframe src={antigravityUrl} className="flex-1 bg-white" title="Antigravity Preview" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-8 text-center">
            Aucun déploiement Preview actif pour Antigravity sur cette tâche.
          </div>
        )}
      </div>
    </div>
  );
}
