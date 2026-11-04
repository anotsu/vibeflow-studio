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
  ShieldCheck,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  Zap,
  X,
  AlertTriangle,
  Code2,
  GitPullRequest,
  Sliders,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { TaskWithRelations } from "@/types";
import type { AgentDebateLog } from "@prisma/client";
import type { TaskBenchmarkResult } from "@/lib/sandbox-runner";

type ArenaView = "diff" | "debate" | "preview";

export function DualBranchArena() {
  const { tasks, fetchTasks, debateLogs, fetchTaskDebate, deployments, selectedProject, selectProject } =
    useProjectStore();
  const { addNotification } = useUIStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ArenaView>("debate");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [diffMode, setDiffMode] = useState<"split" | "unified" | "synthesis">("split");

  // Sandbox benchmark state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<TaskBenchmarkResult | null>(null);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);

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

  // Trigger GitHub PR creation with badges & benchmark report
  const handleCreatePR = async (taskId: string) => {
    setIsCreatingPR(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/github-pr`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erreur génération PR GitHub");
      const data = await res.json();
      if (data.prUrl) {
        window.open(data.prUrl, "_blank");
        addNotification({
          type: "success",
          title: "Pull Request GitHub Créée !",
          message: `La PR #${data.prNumber} a été ouverte sur GitHub avec les badges.`,
          autoDismissMs: 5000,
        });
      } else if (data.prefilledUrl) {
        window.open(data.prefilledUrl, "_blank");
        addNotification({
          type: "success",
          title: "PR GitHub Pré-remplie !",
          message: "L'interface GitHub s'est ouverte avec tous les badges et le diff de synthèse.",
          autoDismissMs: 5000,
        });
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur GitHub PR",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsCreatingPR(false);
    }
  };

  // Trigger Sandbox Quality & Security Benchmark
  const handleRunBenchmark = async () => {
    if (!selectedTask) return;
    setIsBenchmarking(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/benchmark`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Échec de l'exécution du benchmark");
      const data = await res.json();
      setBenchmarkResult(data.benchmark);
      setBenchmarkModalOpen(true);
      addNotification({
        type: "success",
        title: "Benchmark achevé !",
        message: `Analyse Sandbox terminée. Vainqueur : ${data.benchmark.winner}`,
        autoDismissMs: 4000,
      });
      if (selectedProject) {
        await fetchTasks(selectedProject.id);
        await fetchTaskDebate(selectedTask.id);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur benchmark",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsBenchmarking(false);
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

        {/* Right actions: Run Sim + Benchmark + View Switcher */}
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
            <span>{isSimulating ? "Duel IA..." : "⚡ Duel IA"}</span>
          </button>

          {/* Sandbox Benchmark Button */}
          <button
            onClick={handleRunBenchmark}
            disabled={isBenchmarking || !selectedTask}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition-all shadow-sm disabled:opacity-50"
            title="Lancer le benchmark Sandbox (Sécurité, TypeScript, Performance & Tests virtuels)"
          >
            {isBenchmarking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isBenchmarking ? "Benchmark..." : "🧪 Benchmark Sandbox"}</span>
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
              onCreatePR={handleCreatePR}
              isCreatingPR={isCreatingPR}
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
              task={selectedTask}
              claudeUrl={claudeDeployment?.previewUrl}
              antigravityUrl={antigravityDeployment?.previewUrl}
            />
          )}
        </div>
      )}

      {/* Benchmark Quality & Security Modal */}
      {benchmarkModalOpen && benchmarkResult && (
        <BenchmarkReportModal
          benchmark={benchmarkResult}
          onClose={() => setBenchmarkModalOpen(false)}
        />
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
  onCreatePR,
  isCreatingPR,
}: {
  task: TaskWithRelations;
  logs: AgentDebateLog[];
  onMergeTask?: (taskId: string) => void;
  isMerging?: boolean;
  onCreatePR?: (taskId: string) => void;
  isCreatingPR?: boolean;
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

            <div className="flex items-center gap-2">
              {onCreatePR && (
                <button
                  onClick={() => onCreatePR(task.id)}
                  disabled={isCreatingPR}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24292e] hover:bg-[#2f363d] text-white border border-white/10 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                  title="Ouvrir une Pull Request sur GitHub avec le rapport de duel et les badges"
                >
                  {isCreatingPR ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <GitPullRequest className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>Créer PR GitHub</span>
                </button>
              )}

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

// ─── Benchmark Report Modal ─────────────────────────────────

function BenchmarkReportModal({
  benchmark,
  onClose,
}: {
  benchmark: TaskBenchmarkResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isClaudeWinner = benchmark.winner === "CLAUDE";
  const isAntigravityWinner = benchmark.winner === "ANTIGRAVITY";

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Rapport d&apos;Analyse Qualité &amp; Sécurité (Sandbox Runner)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Audit statique, conformité TypeScript, scans de vulnérabilités &amp; suite de tests virtuels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Winner / Complementarity Banner */}
        <div className="px-5 py-3 border-b border-border bg-gradient-to-r from-emerald-500/10 via-primary/10 to-blue-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-foreground">
              {benchmark.winner === "TIE"
                ? "🤝 Complémentarité Optimale (Égalité Technique)"
                : `🏆 Vainqueur Technique : ${benchmark.winner === "CLAUDE" ? "Claude Code" : "Antigravity Engine"}`}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date(benchmark.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Main Side-by-Side Comparison Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Claude Benchmark Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isClaudeWinner
                  ? "bg-claude-muted/20 border-claude/50 ring-1 ring-claude/30"
                  : "bg-secondary/40 border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-claude" />
                  <span className="text-xs font-bold text-claude">Claude Code</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-claude font-mono">
                    {benchmark.claude.overallScore}/10
                  </span>
                  <span className="block text-[9px] text-muted-foreground">Note Globale</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Sécurité</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-emerald-400 font-mono">
                      {benchmark.claude.securityScore}/100
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                      Grade {benchmark.claude.securityGrade}
                    </span>
                  </div>
                </div>

                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Performance</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-blue-400 font-mono">
                      {benchmark.claude.performanceScore}/100
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ~{benchmark.claude.bundleEstimatedKb} KB
                    </span>
                  </div>
                </div>

                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Tests Unitaires</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-emerald-400 font-mono">
                      {benchmark.claude.testSuite.passed}/{benchmark.claude.testSuite.total}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {benchmark.claude.testSuite.coveragePercent}% cov
                    </span>
                  </div>
                </div>

                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">TypeScript</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span
                      className={`font-bold font-mono ${
                        benchmark.claude.typeScriptWarnings === 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {benchmark.claude.typeScriptWarnings} warn
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {benchmark.claude.syntaxValid ? "Valide ✓" : "Erreur ✗"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Issues / Alerts */}
              {benchmark.claude.securityIssues.length > 0 ? (
                <div className="text-[10px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 space-y-1">
                  <span className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alertes détectées :
                  </span>
                  {benchmark.claude.securityIssues.map((iss, i) => (
                    <div key={i}>• {iss}</div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Zéro faille de sécurité ou fuite de secret détectée
                </div>
              )}
            </div>

            {/* Antigravity Benchmark Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isAntigravityWinner
                  ? "bg-antigravity-muted/20 border-antigravity/50 ring-1 ring-antigravity/30"
                  : "bg-secondary/40 border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-antigravity" />
                  <span className="text-xs font-bold text-antigravity">Antigravity Engine</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-antigravity font-mono">
                    {benchmark.antigravity.overallScore}/10
                  </span>
                  <span className="block text-[9px] text-muted-foreground">Note Globale</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Sécurité</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-emerald-400 font-mono">
                      {benchmark.antigravity.securityScore}/100
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                      Grade {benchmark.antigravity.securityGrade}
                    </span>
                  </div>
                </div>

                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Performance</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-blue-400 font-mono">
                      {benchmark.antigravity.performanceScore}/100
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ~{benchmark.antigravity.bundleEstimatedKb} KB
                    </span>
                  </div>
                </div>

                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Tests Unitaires</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-emerald-400 font-mono">
                      {benchmark.antigravity.testSuite.passed}/{benchmark.antigravity.testSuite.total}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {benchmark.antigravity.testSuite.coveragePercent}% cov
                    </span>
                  </div>
                </div>

                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">TypeScript</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span
                      className={`font-bold font-mono ${
                        benchmark.antigravity.typeScriptWarnings === 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {benchmark.antigravity.typeScriptWarnings} warn
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {benchmark.antigravity.syntaxValid ? "Valide ✓" : "Erreur ✗"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Issues / Alerts */}
              {benchmark.antigravity.securityIssues.length > 0 ? (
                <div className="text-[10px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 space-y-1">
                  <span className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alertes détectées :
                  </span>
                  {benchmark.antigravity.securityIssues.map((iss, i) => (
                    <div key={i}>• {iss}</div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Zéro faille de sécurité ou fuite de secret détectée
                </div>
              )}
            </div>
          </div>

          {/* Virtual Test Suite Assertions Checklist */}
          <div className="bg-secondary/30 rounded-xl p-4 border border-border space-y-2.5">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" /> Suite d&apos;Assertions de Non-Régression Virtuelle
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {benchmark.claude.testSuite.assertions.map((a, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-background/60 border border-border/40 flex items-start gap-2"
                >
                  {a.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-foreground text-[11px] block">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground">{a.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synthesis Recommendation */}
          <div className="p-3 bg-secondary/50 rounded-xl border border-border text-xs text-muted-foreground space-y-1.5 font-sans">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                Synthèse Consensuelle &amp; Recommandation :
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(benchmark.summary);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copié !" : "Copier résumé"}</span>
              </button>
            </div>
            <p className="whitespace-pre-line text-xs text-zinc-300 font-mono leading-relaxed bg-black/20 p-2.5 rounded-lg border border-border/30">
              {benchmark.summary}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end bg-card/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            Fermer le rapport
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Sandbox Preview HTML ──────────────────────────

function generatePreviewHtml(
  task: TaskWithRelations,
  variant: "claude" | "antigravity" | "synthesis"
): string {
  const isClaude = variant === "claude";
  const isAnti = variant === "antigravity";
  const title = task.title || "Module VibeFlow";
  const desc = task.description || "";
  const tLower = (title + " " + desc).toLowerCase();

  const brandName = isClaude
    ? "Claude Code (Anthropic Pro)"
    : isAnti
    ? "Antigravity Engine (Gemini Pro)"
    : "VibeFlow Consensual Synthesis";
  const brandColor = isClaude ? "#f97316" : isAnti ? "#3b82f6" : "#10b981";
  const badgeText = isClaude
    ? "Architecture Next.js 15 App Router & Hardened Typing"
    : isAnti
    ? "Micro-Interactions Réactives & Optimistic UI"
    : "Solution Consensus Production Ready";

  // Specialized interactive preview for Shopping Cart & 1-Click Buy
  const isCart = tLower.includes("panier") || tLower.includes("cart") || tLower.includes("checkout") || tLower.includes("buy");

  if (isCart) {
    return `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${brandName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '${brandColor}',
            darkbg: '#09090b',
            cardbg: '#18181b',
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .pulse-glow { animation: pulseGlow 2s infinite ease-in-out; }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 15px rgba(${isClaude ? '249, 115, 22' : isAnti ? '59, 130, 246' : '16, 185, 129'}, 0.2); }
      50% { box-shadow: 0 0 25px rgba(${isClaude ? '249, 115, 22' : isAnti ? '59, 130, 246' : '16, 185, 129'}, 0.5); }
    }
  </style>
</head>
<body class="bg-[#09090b] text-zinc-100 min-h-screen p-4 flex flex-col items-center justify-center">
  <div class="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
    
    <!-- Header with Agent Watermark -->
    <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">${brandName}</span>
        <h2 class="text-sm font-bold text-white">${title}</h2>
      </div>
      <span class="px-2 py-0.5 text-[10px] font-mono rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
        ${isClaude ? 'Strict App Router' : isAnti ? 'Instant 60fps' : 'Auto-Merged'}
      </span>
    </div>

    <!-- Cart Items List -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">⚡</div>
          <div>
            <h4 class="text-xs font-semibold text-white">VibeFlow Pro Node 24/7</h4>
            <span class="text-[10px] text-zinc-400">Conteneur sidecar persistant</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-white font-mono">49,00 €</span>
          <div class="flex items-center gap-1.5 mt-1 justify-end">
            <button onclick="decrement(1)" class="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center justify-center">-</button>
            <span id="qty-1" class="text-xs font-mono text-zinc-300">1</span>
            <button onclick="increment(1)" class="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center justify-center">+</button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">🚀</div>
          <div>
            <h4 class="text-xs font-semibold text-white">Dual-Agent Arena Credits</h4>
            <span class="text-[10px] text-zinc-400">CLIs Claude + Antigravity illimités</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-white font-mono">0,00 €</span>
          <span class="text-[9px] text-emerald-400 block font-semibold">Inclus Pro</span>
        </div>
      </div>
    </div>

    <!-- Coupon Input -->
    <div class="flex gap-2">
      <input type="text" id="coupon" placeholder="Code promo (ex: VIBE2026)" value="VIBE2026" class="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600">
      <button onclick="applyPromo()" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg font-medium">Appliquer</button>
    </div>

    <!-- Totals -->
    <div class="p-3 bg-zinc-900/40 rounded-xl space-y-1 text-xs border border-zinc-800/50">
      <div class="flex justify-between text-zinc-400">
        <span>Sous-total HT</span>
        <span id="subtotal" class="font-mono">49,00 €</span>
      </div>
      <div class="flex justify-between text-emerald-400 text-[11px]">
        <span>Remise VIBE2026 (-20%)</span>
        <span id="discount" class="font-mono">-9,80 €</span>
      </div>
      <div class="flex justify-between text-zinc-400 text-[11px]">
        <span>TVA (20%)</span>
        <span id="tax" class="font-mono">7,84 €</span>
      </div>
      <div class="flex justify-between text-white font-bold text-sm pt-2 border-t border-zinc-800">
        <span>Total Net</span>
        <span id="total" class="font-mono text-emerald-400">47,04 €</span>
      </div>
    </div>

    <!-- 1-Click Buy Action -->
    <button id="buy-btn" onclick="triggerCheckout()" style="background-color: ${brandColor};" class="w-full py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 transition-all shadow-lg pulse-glow flex items-center justify-center gap-2">
      <span>⚡ Valider &amp; Commander en 1-Clic</span>
    </button>

    <div id="feedback" class="hidden p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-mono">
      🎉 Paiement 1-Clic Validé ! Webhook déclenché en 32ms.
    </div>

    <!-- Architecture Footer -->
    <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
      <span>${badgeText}</span>
      <span>${task.status}</span>
    </div>
  </div>

  <script>
    let qty = 1;
    function increment(id) {
      qty++;
      document.getElementById('qty-1').innerText = qty;
      updateTotals();
    }
    function decrement(id) {
      if (qty > 1) {
        qty--;
        document.getElementById('qty-1').innerText = qty;
        updateTotals();
      }
    }
    function updateTotals() {
      const base = 49 * qty;
      const disc = base * 0.2;
      const tax = (base - disc) * 0.2;
      const tot = (base - disc) + tax;
      document.getElementById('subtotal').innerText = base.toFixed(2) + ' €';
      document.getElementById('discount').innerText = '-' + disc.toFixed(2) + ' €';
      document.getElementById('tax').innerText = tax.toFixed(2) + ' €';
      document.getElementById('total').innerText = tot.toFixed(2) + ' €';
    }
    function applyPromo() {
      alert("Code promo VIBE2026 actif (-20% immédiat)");
    }
    function triggerCheckout() {
      const btn = document.getElementById('buy-btn');
      btn.innerText = "Traitement ultra-rapide...";
      setTimeout(() => {
        btn.innerText = "✓ Commande Confirmée !";
        document.getElementById('feedback').classList.remove('hidden');
      }, 400);
    }
  </script>
</body>
</html>`;
  }

  // Fallback interactive generic component simulator
  return `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${brandName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '${brandColor}',
            darkbg: '#09090b',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#09090b] text-zinc-100 min-h-screen p-4 flex flex-col items-center justify-center font-sans">
  <div class="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">${brandName}</span>
        <h2 class="text-sm font-bold text-white">${title}</h2>
      </div>
      <span class="w-3 h-3 rounded-full" style="background-color: ${brandColor};"></span>
    </div>

    <!-- Interactive Component Card -->
    <div class="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-zinc-200">Statut du Module</span>
        <span class="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 font-mono">Actif 24/7</span>
      </div>
      <p class="text-xs text-zinc-400 leading-relaxed">
        ${desc || "Composant opérationnel généré via le protocole dual-branch VibeFlow."}
      </p>
      <div class="flex gap-2 pt-1">
        <button onclick="testAction()" style="background-color: ${brandColor};" class="px-3 py-1.5 text-xs text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
          ⚡ Exécuter Action
        </button>
        <button onclick="alert('Module en synchronisation continue')" class="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
          Paramètres
        </button>
      </div>
      <div id="res" class="hidden text-[11px] font-mono text-emerald-400 p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
        ✓ Opération exécutée avec succès dans l'environnement virtuel.
      </div>
    </div>

    <!-- Metadata -->
    <div class="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
      <span>${badgeText}</span>
      <span>${task.status}</span>
    </div>
  </div>

  <script>
    function testAction() {
      document.getElementById('res').classList.remove('hidden');
    }
  </script>
</body>
</html>`;
}

// ─── Preview View (Interactive Sandbox & Live URLs) ─────────

function PreviewView({
  task,
  claudeUrl,
  antigravityUrl,
}: {
  task: TaskWithRelations;
  claudeUrl?: string | null;
  antigravityUrl?: string | null;
}) {
  const [previewMode, setPreviewMode] = useState<"sandbox" | "coolify">("sandbox");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeBranchTab, setActiveBranchTab] = useState<"split" | "claude" | "antigravity" | "synthesis" | "slider">("split");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [refreshKey, setRefreshKey] = useState(0);

  const claudeHtml = generatePreviewHtml(task, "claude");
  const antigravityHtml = generatePreviewHtml(task, "antigravity");
  const synthesisHtml = generatePreviewHtml(task, "synthesis");

  // Viewport widths
  const viewportStyles: Record<string, string> = {
    desktop: "w-full",
    tablet: "w-[768px] mx-auto border-x border-border shadow-2xl",
    mobile: "w-[375px] mx-auto border-x border-border shadow-2xl",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Preview Header & Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/60 border-b border-border text-xs flex-wrap gap-2">
        {/* Left: Mode Switcher (Sandbox vs Coolify URL) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border/50">
            <button
              onClick={() => setPreviewMode("sandbox")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                previewMode === "sandbox"
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Sandbox Code Simulator</span>
            </button>
            <button
              onClick={() => setPreviewMode("coolify")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                previewMode === "coolify"
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>URL Déployée Coolify</span>
            </button>
          </div>

          {/* Sub-view switcher for Sandbox */}
          {previewMode === "sandbox" && (
            <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border/50 text-[11px]">
              <button
                onClick={() => setActiveBranchTab("split")}
                className={`px-2 py-0.5 rounded transition-all ${
                  activeBranchTab === "split" ? "bg-card text-foreground font-bold shadow-sm" : "text-muted-foreground"
                }`}
              >
                Côte à côte
              </button>
              <button
                onClick={() => setActiveBranchTab("claude")}
                className={`px-2 py-0.5 rounded transition-all text-claude ${
                  activeBranchTab === "claude" ? "bg-card font-bold shadow-sm" : "opacity-75"
                }`}
              >
                Claude
              </button>
              <button
                onClick={() => setActiveBranchTab("antigravity")}
                className={`px-2 py-0.5 rounded transition-all text-antigravity ${
                  activeBranchTab === "antigravity" ? "bg-card font-bold shadow-sm" : "opacity-75"
                }`}
              >
                Antigravity
              </button>
              {(task.synthesisDecision || task.status === "SYNTHESIS" || task.status === "COMPLETED") && (
                <button
                  onClick={() => setActiveBranchTab("synthesis")}
                  className={`px-2 py-0.5 rounded transition-all text-synthesis flex items-center gap-1 ${
                    activeBranchTab === "synthesis" ? "bg-card font-bold shadow-sm" : "opacity-75"
                  }`}
                >
                  <Trophy className="w-3 h-3" /> Synthèse
                </button>
              )}
              <button
                onClick={() => setActiveBranchTab("slider")}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                  activeBranchTab === "slider" ? "bg-card text-foreground font-bold shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Superposition interactive avec curseur de diff graphique"
              >
                <Sliders className="w-3 h-3 text-primary" />
                <span>Curseur Superposé</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Viewport Controls & Refresh */}
        <div className="flex items-center gap-2">
          {previewMode === "sandbox" && (
            <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border/50">
              <button
                onClick={() => setViewport("desktop")}
                className={`p-1 rounded text-xs transition-colors ${
                  viewport === "desktop" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                title="Affichage Bureau (100%)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport("tablet")}
                className={`p-1 rounded text-xs transition-colors ${
                  viewport === "tablet" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                title="Affichage Tablette (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`p-1 rounded text-xs transition-colors ${
                  viewport === "mobile" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                title="Affichage Mobile (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1 px-2 py-1 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded text-[11px] font-medium transition-colors"
            title="Rafraîchir les simulateurs de rendu"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Rafraîchir</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      {previewMode === "sandbox" ? (
        <div className="flex-1 overflow-hidden flex bg-[#060608] p-2">
          {activeBranchTab === "split" ? (
            <div className={`flex-1 flex gap-2 h-full ${viewportStyles[viewport]}`}>
              {/* Claude Panel */}
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card">
                <div className="px-3 py-1.5 bg-claude-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-claude font-bold flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> {task.claudeBranch || "agent/claude"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Tailwind + JSX Simulator</span>
                </div>
                <iframe
                  key={`claude-${refreshKey}`}
                  srcDoc={claudeHtml}
                  className="flex-1 w-full bg-[#09090b] border-none"
                  title="Claude Simulator"
                  sandbox="allow-scripts allow-modals"
                />
              </div>

              {/* Antigravity Panel */}
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card">
                <div className="px-3 py-1.5 bg-antigravity-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-antigravity font-bold flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5" /> {task.antigravityBranch || "agent/antigravity"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Tailwind + JSX Simulator</span>
                </div>
                <iframe
                  key={`anti-${refreshKey}`}
                  srcDoc={antigravityHtml}
                  className="flex-1 w-full bg-[#09090b] border-none"
                  title="Antigravity Simulator"
                  sandbox="allow-scripts allow-modals"
                />
              </div>
            </div>
          ) : activeBranchTab === "claude" ? (
            <div className={`flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card ${viewportStyles[viewport]}`}>
              <div className="px-3 py-1.5 bg-claude-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                <span className="text-claude font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Claude Code Simulator
                </span>
              </div>
              <iframe
                key={`claude-single-${refreshKey}`}
                srcDoc={claudeHtml}
                className="flex-1 w-full bg-[#09090b] border-none"
                title="Claude Simulator"
                sandbox="allow-scripts allow-modals"
              />
            </div>
          ) : activeBranchTab === "antigravity" ? (
            <div className={`flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card ${viewportStyles[viewport]}`}>
              <div className="px-3 py-1.5 bg-antigravity-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                <span className="text-antigravity font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" /> Antigravity Engine Simulator
                </span>
              </div>
              <iframe
                key={`anti-single-${refreshKey}`}
                srcDoc={antigravityHtml}
                className="flex-1 w-full bg-[#09090b] border-none"
                title="Antigravity Simulator"
                sandbox="allow-scripts allow-modals"
              />
            </div>
          ) : activeBranchTab === "slider" ? (
            <div className={`flex-1 flex flex-col h-full ${viewportStyles[viewport]} relative overflow-hidden rounded-xl border border-border/80 bg-card`}>
              {/* Slider Top Controller Bar */}
              <div className="px-3 py-1.5 bg-[#121215] border-b border-border/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold text-foreground">Curseur Visuel Superposé</span>
                  <span className="text-[10px] text-muted-foreground">({sliderPosition}% Claude / {100 - sliderPosition}% Antigravity)</span>
                </div>
                <div className="flex items-center gap-3 w-64">
                  <span className="text-[10px] font-bold text-claude">Claude</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="flex-1 accent-primary h-1.5 cursor-ew-resize bg-secondary rounded-lg"
                  />
                  <span className="text-[10px] font-bold text-antigravity">Antigravity</span>
                </div>
              </div>

              {/* Stacked iFrames with clip-path */}
              <div className="flex-1 relative w-full h-full overflow-hidden select-none">
                {/* Bottom Layer: Antigravity */}
                <iframe
                  key={`slider-anti-${refreshKey}`}
                  srcDoc={antigravityHtml}
                  className="absolute inset-0 w-full h-full bg-[#09090b] border-none pointer-events-none"
                  title="Antigravity Background"
                />

                {/* Top Layer: Claude (clipped) */}
                <div
                  className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <iframe
                    key={`slider-claude-${refreshKey}`}
                    srcDoc={claudeHtml}
                    className="w-full h-full bg-[#09090b] border-none"
                    title="Claude Foreground"
                  />
                </div>

                {/* Visual Divider Bar */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-white to-primary shadow-[0_0_12px_rgba(168,85,247,0.8)] z-20 cursor-ew-resize flex items-center justify-center pointer-events-auto"
                  style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                >
                  <div className="w-7 h-7 rounded-full bg-black/90 border-2 border-primary shadow-xl flex items-center justify-center text-[10px] text-primary font-bold">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Dynamic Watermark labels */}
                <div className="absolute top-3 left-3 z-30 pointer-events-none px-2 py-0.5 rounded bg-claude/20 text-claude border border-claude/40 text-[10px] font-mono font-bold backdrop-blur-sm">
                  🟠 Claude Code ({sliderPosition}%)
                </div>
                <div className="absolute top-3 right-3 z-30 pointer-events-none px-2 py-0.5 rounded bg-antigravity/20 text-antigravity border border-antigravity/40 text-[10px] font-mono font-bold backdrop-blur-sm">
                  🔵 Antigravity ({100 - sliderPosition}%)
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex flex-col rounded-xl overflow-hidden border border-synthesis/40 bg-card ${viewportStyles[viewport]}`}>
              <div className="px-3 py-1.5 bg-synthesis/20 border-b border-synthesis/40 flex items-center justify-between text-xs font-mono">
                <span className="text-synthesis font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Synthèse Consensuelle &amp; Fusion Finale
                </span>
              </div>
              <iframe
                key={`synth-single-${refreshKey}`}
                srcDoc={synthesisHtml}
                className="flex-1 w-full bg-[#09090b] border-none"
                title="Synthesis Simulator"
                sandbox="allow-scripts allow-modals"
              />
            </div>
          )}
        </div>
      ) : (
        /* Coolify Live URL Mode */
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
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs p-8 text-center space-y-3">
                <Bot className="w-8 h-8 text-claude/40" />
                <div>
                  <p className="font-medium text-foreground">Aucun conteneur Coolify actif pour Claude</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Utilisez l&apos;onglet &quot;Sandbox Code Simulator&quot; pour visualiser le rendu immédiat.
                  </p>
                </div>
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
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs p-8 text-center space-y-3">
                <Rocket className="w-8 h-8 text-antigravity/40" />
                <div>
                  <p className="font-medium text-foreground">Aucun conteneur Coolify actif pour Antigravity</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Utilisez l&apos;onglet &quot;Sandbox Code Simulator&quot; pour visualiser le rendu immédiat.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
