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
  Copy,
  Check,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { TaskWithRelations } from "@/types";
import type { AgentDebateLog } from "@prisma/client";

type ArenaView = "diff" | "debate" | "preview";

export function DualBranchArena() {
  const { tasks, fetchTasks, debateLogs, fetchTaskDebate, deployments, selectedProject, selectProject } =
    useProjectStore();
  const { addNotification } = useUIStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ArenaView>("debate");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [diffMode, setDiffMode] = useState<"split" | "unified" | "synthesis">("split");

  // Filter tasks that have dual branches or candidate tasks
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const duelTasks = safeTasks.filter(
    (t) => t && (t.claudeBranch || t.antigravityBranch || t.status === "IN_DEBATE" || t.status === "SYNTHESIS")
  );

  // If duel tasks exist, show them; otherwise allow challenging any project task
  const displayTasks = duelTasks.length > 0 ? duelTasks : safeTasks;
  const selectedTask = safeTasks.find((t) => t.id === selectedTaskId) || displayTasks[0];

  useEffect(() => {
    if (selectedTask?.id) {
      setSelectedTaskId(selectedTask.id);
      fetchTaskDebate(selectedTask.id);
    }
  }, [selectedTask?.id, fetchTaskDebate]);

  // Preview deployments
  const safeDeployments = Array.isArray(deployments) ? deployments : [];
  const claudeDeployment = safeDeployments.find(
    (d) => d.branch === selectedTask?.claudeBranch
  );
  const antigravityDeployment = safeDeployments.find(
    (d) => d.branch === selectedTask?.antigravityBranch
  );

  // Trigger task merge & completion
  const handleMergeTask = async (taskId: string) => {
    if (!selectedProject) return;
    setIsMerging(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge" }),
      });
      if (!res.ok) throw new Error("Erreur lors de la validation et fusion");
      const data = await res.json();
      addNotification({
        type: "success",
        title: "Synthèse Fusionnée !",
        message: "La tâche est validée et fusionnée dans la branche principale.",
        autoDismissMs: 4000,
      });
      await fetchTasks(selectedProject.id);
      await fetchTaskDebate(taskId);
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur fusion",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsMerging(false);
    }
  };

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
      await fetchTasks(selectedProject.id);
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
            {displayTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all truncate max-w-[180px] flex items-center gap-1 ${
                  selectedTaskId === task.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                title={task.title}
              >
                {task.status === "SYNTHESIS" && <span>🏆</span>}
                {task.status === "IN_DEBATE" && <span>⚔️</span>}
                <span className="truncate">{task.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right actions: Run Sim + View Switcher */}
        <div className="flex items-center gap-2">
          {/* Real AI Duel Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-orange-500/20 via-primary/20 to-blue-500/20 hover:from-orange-500/30 hover:to-blue-500/30 text-foreground border border-border rounded-md transition-all shadow-sm disabled:opacity-50"
            title="Lancer le duel croisé Claude Pro × Antigravity Pro sur cette tâche"
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{isSimulating ? "Duel IA en cours..." : "⚡ Lancer Duel IA"}</span>
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
          {activeView === "debate" && (
            <DebateView
              task={selectedTask}
              logs={debateLogs}
              onMergeTask={handleMergeTask}
              isMerging={isMerging}
            />
          )}
          {activeView === "diff" && (
            <DiffView
              task={selectedTask}
              diffMode={diffMode}
              onChangeMode={(mode) => setDiffMode(mode)}
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
  onMergeTask,
  isMerging,
}: {
  task: TaskWithRelations;
  logs: AgentDebateLog[];
  onMergeTask?: (taskId: string) => void;
  isMerging?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const safeLogs = Array.isArray(logs) ? logs : [];
  // Compute average scores
  const claudeScores = safeLogs.filter((l) => l && l.speaker === "CLAUDE" && l.qualityScore).map((l) => l.qualityScore!);
  const antigravityScores = safeLogs.filter((l) => l && l.speaker === "ANTIGRAVITY" && l.qualityScore).map((l) => l.qualityScore!);

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
          <div className="flex items-center gap-2">
            {task.status === "COMPLETED" && (
              <span className="text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Fusionné
              </span>
            )}
            <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
              Status: {task.status}
            </span>
          </div>
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
        <div className="bg-synthesis/10 border-2 border-synthesis/40 rounded-xl p-4 shadow-sm animate-in fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-synthesis" />
              <span className="text-xs font-bold uppercase tracking-wide text-synthesis">
                Synthèse Consensuelle & Fusion
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.synthesisDecision || "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 px-2 py-1 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded text-[11px] font-medium transition-colors"
                title="Copier la décision de synthèse"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copié !" : "Copier"}</span>
              </button>

              <span className="text-[11px] font-mono text-synthesis bg-synthesis/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <GitMerge className="w-3 h-3" /> {task.synthesisBranch || "synthesis/ready"}
              </span>
            </div>
          </div>

          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg border border-border/40 font-sans">
            {task.synthesisDecision}
          </p>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <span className="text-[11px] text-muted-foreground">
              {task.status === "COMPLETED"
                ? "✨ Cette solution a été fusionnée et validée pour la branche principale."
                : "💡 Vérifiez la décision ci-dessus avant de fusionner dans la branche principale."}
            </span>

            {task.status !== "COMPLETED" && onMergeTask && (
              <button
                onClick={() => onMergeTask(task.id)}
                disabled={isMerging}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50"
              >
                {isMerging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitMerge className="w-3.5 h-3.5" />
                )}
                <span>Valider & Fusionner dans main</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inter-Agent Debate Timeline */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> Fil de Challenge Croisé ({safeLogs.length} messages)
        </h4>

        {safeLogs.map((log) => (
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
  onChangeMode,
}: {
  task: TaskWithRelations;
  diffMode: "split" | "unified" | "synthesis";
  onChangeMode: (mode: "split" | "unified" | "synthesis") => void;
}) {
  const [copied, setCopied] = useState(false);
  const claudeLines = (task.claudeImplementation || "// Aucun code généré pour Claude").split("\n");
  const antigravityLines = (task.antigravityImplementation || "// Aucun code généré pour Antigravity").split("\n");
  const synthesisContent = task.synthesisDecision || "// En attente de la décision de synthèse...";
  const synthesisLines = synthesisContent.split("\n");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Diff Controls Subheader */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card/60 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <FileDiff className="w-3.5 h-3.5 text-primary" /> Comparateur & Synthèse de Code
          </span>
          <span className="text-green-400 font-mono text-[11px]">+{claudeLines.length + antigravityLines.length} lignes générées</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border/50 text-[11px]">
          <button
            onClick={() => onChangeMode("split")}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              diffMode === "split" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Côte à côte
          </button>
          <button
            onClick={() => onChangeMode("unified")}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              diffMode === "unified" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vue unifiée
          </button>
          <button
            onClick={() => onChangeMode("synthesis")}
            className={`px-2.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
              diffMode === "synthesis" ? "bg-synthesis/20 text-synthesis font-semibold shadow-sm" : "text-muted-foreground hover:text-synthesis"
            }`}
          >
            <Trophy className="w-3 h-3 text-synthesis" />
            <span>Synthèse Finale</span>
          </button>
        </div>
      </div>

      {/* Code Container */}
      {diffMode === "synthesis" ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
          <div className="px-4 py-2 bg-synthesis/10 border-b border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-synthesis" />
              <span className="text-synthesis font-bold font-mono">
                {task.synthesisBranch || "synthesis/solution"} — Décision & Solution Consensuelle
              </span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(synthesisContent);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded text-[11px] font-medium transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copié !" : "Copier la solution"}</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-5 text-zinc-200">
            {synthesisLines.map((line, idx) => (
              <div key={idx} className="flex items-start hover:bg-white/[0.02] px-2 py-0.5 rounded">
                <span className="w-10 shrink-0 text-zinc-600 select-none text-[10px]">{idx + 1}</span>
                <span className="whitespace-pre font-sans text-xs text-zinc-300">{line}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
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
      )}
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
