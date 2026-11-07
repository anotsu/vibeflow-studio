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
  Dna,
  Gauge,
  QrCode,
  Cpu,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { TaskWithRelations } from "@/types";
import type { AgentDebateLog } from "@prisma/client";
import type { TaskBenchmarkResult } from "@/lib/sandbox-runner";
import type { DualE2ETestResult } from "@/lib/playwright-runner";
import type { MobileTunnelInfo } from "@/lib/tunnel-manager";
import { PersonasSkillsModal } from "@/components/arena/PersonasSkillsModal";
import { VisualDiffModal } from "@/components/arena/VisualDiffModal";
import { VibeCodingEngineModal } from "@/components/setup/VibeCodingEngineModal";
import type { MultimodalVisionReview } from "@/lib/vision-reviewer";

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
  const [isGeneratingHybrid, setIsGeneratingHybrid] = useState(false);
  const [diffMode, setDiffMode] = useState<"split" | "unified" | "synthesis" | "cherrypick">("split");

  // Sandbox benchmark state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<TaskBenchmarkResult | null>(null);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);

  // Playwright & Web Vitals E2E state
  const [isE2ETesting, setIsE2ETesting] = useState(false);
  const [e2eResult, setE2EResult] = useState<DualE2ETestResult | null>(null);
  const [e2eModalOpen, setE2EModalOpen] = useState(false);

  // Mobile tunnel state
  const [isGeneratingTunnel, setIsGeneratingTunnel] = useState(false);
  const [tunnelInfo, setTunnelInfo] = useState<MobileTunnelInfo | null>(null);
  const [mobileTunnelModalOpen, setMobileTunnelModalOpen] = useState(false);

  // Personas & Skills modal state
  const [personasModalOpen, setPersonasModalOpen] = useState(false);
  const [engineModalOpen, setEngineModalOpen] = useState(false);

  // Multimodal AI Vision & Pixel Diff state
  const [isVisionReviewing, setIsVisionReviewing] = useState(false);
  const [visionReview, setVisionReview] = useState<MultimodalVisionReview | null>(null);
  const [visionModalOpen, setVisionModalOpen] = useState(false);

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

  // Trigger Hybrid Synthesis (AI Judge blends Claude backend + Antigravity frontend)
  const handleHybridSynthesis = async (taskId: string) => {
    if (!taskId) return;
    setIsGeneratingHybrid(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/hybrid-synthesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la synthèse hybride");
      }
      const data = await res.json();
      addNotification({
        type: "success",
        title: "🧬 Synthèse Hybride Achevée !",
        message: `Fusion chirurgicale (Claude Backend + Antigravity UI) prête. Score combiné: ${data.analysis?.metrics?.combinedScore || "9.6"}/10`,
        autoDismissMs: 5000,
      });
      if (selectedProject) {
        await fetchTasks(selectedProject.id);
        await fetchTaskDebate(taskId);
      }
      setDiffMode("synthesis");
      setActiveView("diff");
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur synthèse hybride",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsGeneratingHybrid(false);
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

  // Trigger Playwright Headless E2E & Web Vitals Audit
  const handleRunE2ETest = async () => {
    if (!selectedTask) return;
    setIsE2ETesting(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/e2e-test`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Échec de l'audit E2E");
      const data = await res.json();
      setE2EResult(data.result);
      setE2EModalOpen(true);
      addNotification({
        type: "success",
        title: "Audit E2E Achevé !",
        message: data.result.verdict.summary,
        autoDismissMs: 4500,
      });
      if (selectedProject) {
        await fetchTaskDebate(selectedTask.id);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur E2E",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsE2ETesting(false);
    }
  };

  // Generate ephemeral mobile preview tunnel with QR code
  const handleOpenMobileTunnel = async (role: "claude" | "antigravity" = "claude") => {
    if (!selectedTask) return;
    setIsGeneratingTunnel(true);
    try {
      const res = await fetch(`/api/preview/${selectedTask.id}/tunnel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Échec de génération du tunnel mobile");
      const data = await res.json();
      setTunnelInfo(data.tunnel);
      setMobileTunnelModalOpen(true);
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Tunnel Mobile",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsGeneratingTunnel(false);
    }
  };

  // Open Multimodal AI Vision & Pixel Diff Modal
  const handleOpenVisionDiff = async () => {
    if (!selectedTask) return;
    setIsVisionReviewing(true);
    setVisionModalOpen(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/visual-diff`);
      const data = await res.json();
      if (res.ok) {
        setVisionReview(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Vision IA",
        message: err.message || "Impossible de charger l'analyse visuelle.",
        autoDismissMs: 3500,
      });
    } finally {
      setIsVisionReviewing(false);
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
          {/* VibeCoding Multi-Model Selector (Solo, Duel, Trio) */}
          <button
            onClick={() => setEngineModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-md transition-all shadow-sm"
            title="Configurer les forfaits IA et choisir 1, 2 ou 3 Fournisseurs (Claude, Gemini, ChatGPT Codex)"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Mode IA</span>
          </button>

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
            <span>{isBenchmarking ? "Benchmark..." : "🧪 Benchmark"}</span>
          </button>

          {/* Playwright Headless E2E & Web Vitals Audit */}
          <button
            onClick={handleRunE2ETest}
            disabled={isE2ETesting || !selectedTask}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-md transition-all shadow-sm disabled:opacity-50"
            title="Lancer l'audit automatisé E2E Headless & Core Web Vitals (LCP, CLS, TTFB, Hydration)"
          >
            {isE2ETesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{isE2ETesting ? "Audit E2E..." : "⚡ Tests E2E"}</span>
          </button>

          {/* Multimodal AI Vision & Pixel Diff Button */}
          <button
            onClick={handleOpenVisionDiff}
            disabled={isVisionReviewing || !selectedTask}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-md transition-all shadow-sm disabled:opacity-50"
            title="Lancer l'analyse critique multimodale par Vision IA & Pixel Diff (Desktop + Mobile + WCAG)"
          >
            {isVisionReviewing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{isVisionReviewing ? "Vision..." : "👁️ Vision & Pixel Diff"}</span>
          </button>

          {/* Hybrid Synthesis Button */}
          <button
            onClick={() => selectedTask && handleHybridSynthesis(selectedTask.id)}
            disabled={isGeneratingHybrid || !selectedTask}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-emerald-500/20 hover:from-purple-500/30 hover:to-emerald-500/30 text-purple-200 border border-purple-500/30 rounded-md transition-all shadow-sm disabled:opacity-50"
            title="Générer une synthèse hybride IA : combine le backend de Claude et le frontend d'Antigravity"
          >
            {isGeneratingHybrid ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <Dna className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{isGeneratingHybrid ? "Synthèse Hybride..." : "🧬 Synthèse Hybride"}</span>
          </button>

          {/* Personas & Skills Button */}
          <button
            onClick={() => setPersonasModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-md transition-all shadow-sm"
            title="Personnaliser les personas et compétences métiers (Skills) des agents"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">🎭 Skills & Personas</span>
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
              onHybridSynthesis={handleHybridSynthesis}
              isGeneratingHybrid={isGeneratingHybrid}
            />
          )}
          {activeView === "diff" && (
            <DiffView
              task={selectedTask}
              diffMode={diffMode}
              onChangeMode={(mode) => setDiffMode(mode)}
              onHybridSynthesis={handleHybridSynthesis}
              isGeneratingHybrid={isGeneratingHybrid}
            />
          )}
          {activeView === "preview" && (
            <PreviewView
              task={selectedTask}
              claudeUrl={claudeDeployment?.previewUrl}
              antigravityUrl={antigravityDeployment?.previewUrl}
              onOpenMobileTunnel={handleOpenMobileTunnel}
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

      {/* Playwright Headless E2E & Web Vitals Modal */}
      {e2eModalOpen && e2eResult && (
        <E2EReportModal
          result={e2eResult}
          onClose={() => setE2EModalOpen(false)}
          onHybridSynthesis={handleHybridSynthesis}
        />
      )}

      {/* Ephemeral Mobile Tunnel & QR Code Modal */}
      {mobileTunnelModalOpen && tunnelInfo && (
        <MobileTunnelModal
          tunnel={tunnelInfo}
          onClose={() => setMobileTunnelModalOpen(false)}
          onChangeRole={handleOpenMobileTunnel}
        />
      )}

      {/* VibeCoding Engine & Plans Matrix Modal */}
      <VibeCodingEngineModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
      />

      {/* Personas & Specialized Skills Modal */}
      <PersonasSkillsModal
        isOpen={personasModalOpen}
        onClose={() => setPersonasModalOpen(false)}
      />

      {/* Multimodal AI Vision & Pixel Diff Modal */}
      <VisualDiffModal
        isOpen={visionModalOpen}
        onClose={() => setVisionModalOpen(false)}
        review={visionReview}
        onRefresh={handleOpenVisionDiff}
        isRefreshing={isVisionReviewing}
      />
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
  onHybridSynthesis,
  isGeneratingHybrid,
}: {
  task: TaskWithRelations;
  logs: AgentDebateLog[];
  onMergeTask?: (taskId: string) => void;
  isMerging?: boolean;
  onCreatePR?: (taskId: string) => void;
  isCreatingPR?: boolean;
  onHybridSynthesis?: (taskId: string) => void;
  isGeneratingHybrid?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const safeLogs = Array.isArray(logs) ? logs : [];
  // Compute average scores
  const claudeScores = safeLogs.filter((l) => l && l.speaker === "CLAUDE" && l.qualityScore).map((l) => l.qualityScore!);
  const antigravityScores = safeLogs.filter((l) => l && l.speaker === "ANTIGRAVITY" && l.qualityScore).map((l) => l.qualityScore!);
  const codexScores = safeLogs.filter((l) => l && (l.filePath?.toLowerCase().includes("openai") || l.filePath?.toLowerCase().includes("codex") || l.message.startsWith("[ChatGPT Codex]") || l.message.startsWith("[OpenAI")) && l.qualityScore).map((l) => l.qualityScore!);

  const avgClaude = claudeScores.length
    ? (claudeScores.reduce((a, b) => a + b, 0) / claudeScores.length).toFixed(1)
    : "8.8";

  const avgAntigravity = antigravityScores.length
    ? (antigravityScores.reduce((a, b) => a + b, 0) / antigravityScores.length).toFixed(1)
    : "9.2";

  const avgCodex = codexScores.length
    ? (codexScores.reduce((a, b) => a + b, 0) / codexScores.length).toFixed(1)
    : "9.1";

  const hasCodex = codexScores.length > 0 || safeLogs.some((l) => l && (l.filePath?.toLowerCase().includes("openai") || l.filePath?.toLowerCase().includes("codex") || l.message.startsWith("[ChatGPT Codex]")));

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Duel / Trio Head-to-Head Header Card */}
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

        {/* Versus Matchup Bar (Dual or Trio) */}
        <div className={`grid ${hasCodex ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
          {/* Claude Agent Side */}
          <div className="p-3 bg-claude-muted/30 border border-claude/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-claude/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-claude" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-claude block truncate">Claude Code</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                    {task.claudeBranch || "agent/claude"}
                  </span>
                  {task.status === "CLAUDE_IN_PROGRESS" || task.status === "IN_DEBATE" ? (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                      Work
                    </span>
                  ) : task.status === "SYNTHESIS" || task.status === "COMPLETED" ? (
                    <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1 py-0.2 rounded">
                      Done
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground font-mono bg-secondary px-1 py-0.2 rounded">
                      Idle
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-extrabold text-claude font-mono">{avgClaude}/10</span>
              <span className="text-[8px] text-muted-foreground block">Qualité</span>
            </div>
          </div>

          {/* Antigravity Agent Side */}
          <div className="p-3 bg-antigravity-muted/30 border border-antigravity/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-antigravity/20 flex items-center justify-center shrink-0">
                <Rocket className="w-4 h-4 text-antigravity" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-antigravity block truncate">Antigravity</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                    {task.antigravityBranch || "agent/antigravity"}
                  </span>
                  {task.status === "ANTIGRAVITY_IN_PROGRESS" || task.status === "IN_DEBATE" ? (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                      Work
                    </span>
                  ) : task.status === "SYNTHESIS" || task.status === "COMPLETED" ? (
                    <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1 py-0.2 rounded">
                      Done
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground font-mono bg-secondary px-1 py-0.2 rounded">
                      Idle
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-extrabold text-antigravity font-mono">{avgAntigravity}/10</span>
              <span className="text-[8px] text-muted-foreground block">Qualité</span>
            </div>
          </div>

          {/* ChatGPT Codex Side (If Active in Debate or Trio) */}
          {hasCodex && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-400 block truncate">ChatGPT Codex</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                      agent/openai
                    </span>
                    {task.status === "IN_DEBATE" ? (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Work
                      </span>
                    ) : task.status === "SYNTHESIS" || task.status === "COMPLETED" ? (
                      <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1 py-0.2 rounded">
                        Done
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground font-mono bg-secondary px-1 py-0.2 rounded">
                        Idle
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-emerald-400 font-mono">{avgCodex}/10</span>
                <span className="text-[8px] text-muted-foreground block">Qualité</span>
              </div>
            </div>
          )}
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
              {onHybridSynthesis && (
                <button
                  onClick={() => onHybridSynthesis(task.id)}
                  disabled={isGeneratingHybrid}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                  title="Régénérer une fusion hybride IA intelligente (Claude Backend + Antigravity UI)"
                >
                  {isGeneratingHybrid ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                  ) : (
                    <Dna className="w-3.5 h-3.5 text-purple-300" />
                  )}
                  <span>{isGeneratingHybrid ? "Synthèse..." : "🧬 Régénérer Hybride"}</span>
                </button>
              )}

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

      {/* Hybrid Synthesis Suggestion Card if not yet synthesized */}
      {!task.synthesisDecision && task.status !== "COMPLETED" && onHybridSynthesis && (
        <div className="bg-gradient-to-r from-purple-950/30 via-background to-blue-950/30 border border-purple-500/30 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Dna className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>Prêt pour la Synthèse Hybride IA</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Cherry-Pick Auto
                </span>
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Le Juge IA fusionne le meilleur du backend de Claude Code (architecture, typage, validation) avec le frontend d&apos;Antigravity (design Tailwind, 60fps).
              </p>
            </div>
          </div>

          <button
            onClick={() => onHybridSynthesis(task.id)}
            disabled={isGeneratingHybrid}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50"
          >
            {isGeneratingHybrid ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Dna className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isGeneratingHybrid ? "Génération en cours..." : "🧬 Lancer la Fusion Hybride"}</span>
          </button>
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
  const isCodex =
    log.filePath?.toLowerCase().includes("openai") ||
    log.filePath?.toLowerCase().includes("codex") ||
    log.message.startsWith("[ChatGPT Codex]") ||
    log.message.startsWith("[OpenAI");
  const isSystem = log.speaker === "SYSTEM" && !isCodex;

  if (isSystem) {
    return (
      <div className="py-2 px-4 rounded-lg bg-secondary/40 border border-border text-center text-xs text-muted-foreground font-mono">
        ⚙️ {log.message}
      </div>
    );
  }

  if (isCodex) {
    return (
      <div className="rounded-xl p-4 border transition-all border-emerald-500/30 bg-emerald-500/10">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">
              ChatGPT Codex
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
          {log.message.replace(/^\[ChatGPT Codex\]\s*/, "")}
        </p>

        {log.filePath && (
          <div className="mt-3 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded w-fit">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>{log.filePath}</span>
            {log.lineStart && <span className="text-emerald-400 font-bold">#L{log.lineStart}-{log.lineEnd}</span>}
          </div>
        )}
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
  onHybridSynthesis,
  isGeneratingHybrid,
}: {
  task: TaskWithRelations;
  diffMode: "split" | "unified" | "synthesis" | "cherrypick";
  onChangeMode: (mode: "split" | "unified" | "synthesis" | "cherrypick") => void;
  onHybridSynthesis?: (taskId: string) => void;
  isGeneratingHybrid?: boolean;
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
          <button
            onClick={() => onChangeMode("cherrypick")}
            className={`px-2.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
              diffMode === "cherrypick" ? "bg-purple-500/20 text-purple-300 font-semibold shadow-sm" : "text-muted-foreground hover:text-purple-300"
            }`}
          >
            <Dna className="w-3 h-3 text-purple-400" />
            <span>Cherry-Pick Hybride</span>
          </button>
        </div>
      </div>

      {/* Code Container */}
      {diffMode === "cherrypick" ? (
        <CherryPickView
          task={task}
          onHybridSynthesis={onHybridSynthesis}
          isGeneratingHybrid={isGeneratingHybrid}
        />
      ) : diffMode === "synthesis" ? (
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

// ─── Cherry-Pick & Hybrid Assistant ────────────────────────

function CherryPickView({
  task,
  onHybridSynthesis,
  isGeneratingHybrid,
}: {
  task: TaskWithRelations;
  onHybridSynthesis?: (taskId: string) => void;
  isGeneratingHybrid?: boolean;
}) {
  const [selectedLayers, setSelectedLayers] = useState<Record<string, "claude" | "antigravity">>({
    backend_arch: "claude",
    api_validation: "claude",
    ui_components: "antigravity",
    styling_tailwind: "antigravity",
    perf_runtime: "antigravity",
  });

  const layers = [
    {
      id: "backend_arch",
      title: "Architecture & Modèles de Données (Prisma / SQL)",
      desc: "Schémas de base, migrations, typage strict et relations d'intégrité.",
      claudeAdvantage: "Types TS stricts, clés étrangères et indexation optimisée (Recommandé)",
      antigravityAdvantage: "Schéma agile orienté flexibilité et itération rapide",
    },
    {
      id: "api_validation",
      title: "Routes API, Endpoints & Sécurité",
      desc: "Validation Zod, rate limiting, gestion des erreurs HTTP et robustesse backend.",
      claudeAdvantage: "Parsing Zod rigoureux, codes d'erreur RFC standardisés (Recommandé)",
      antigravityAdvantage: "Handlers asynchrones épurés et streaming SSE haute réactivité",
    },
    {
      id: "ui_components",
      title: "Composants d'Interface UI/UX (React 19)",
      desc: "Décomposition Server/Client, gestion d'état et micro-interactions utilisateur.",
      claudeAdvantage: "Composants fonctionnels épurés et découplage strict des responsabilités",
      antigravityAdvantage: "Composants interactifs riches, ergonomie moderne et micro-animations (Recommandé)",
    },
    {
      id: "styling_tailwind",
      title: "Design System & Tailwind CSS",
      desc: "Thème sombre cockpit/néon, contrastes WCAG et adaptabilité responsive.",
      claudeAdvantage: "Styles utilitaires minimalistes et sans fioritures",
      antigravityAdvantage: "Esthétique moderne 'Cyberpunk', gradients soignés et responsive parfait (Recommandé)",
    },
    {
      id: "perf_runtime",
      title: "Optimisation Runtime & Performance 60fps",
      desc: "Fluidité du rendu, temps de réponse DOM, zéro recalcul superflu et fluidité.",
      claudeAdvantage: "Gestion robuste des états mémoire et garbage collection prévisible",
      antigravityAdvantage: "Latence minimale sous 50ms et fluidité native 60fps garantie (Recommandé)",
    },
  ];

  const claudeCount = Object.values(selectedLayers).filter((v) => v === "claude").length;
  const antiCount = Object.values(selectedLayers).filter((v) => v === "antigravity").length;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#09090b]">
      {/* Top Banner */}
      <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-card/50 to-blue-950/40 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Dna className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground">
              Sélecteur Hybride Chirurgical (Cherry-Pick Dual-Agent)
            </h3>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
              Phase 3.1
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Choisissez précisément pour chaque couche technique si vous souhaitez injecter l&apos;implémentation de Claude Code ou celle d&apos;Antigravity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right text-xs font-mono">
            <span className="text-claude font-bold">{claudeCount} Claude</span>
            <span className="text-muted-foreground mx-1.5">/</span>
            <span className="text-antigravity font-bold">{antiCount} Antigravity</span>
          </div>

          {onHybridSynthesis && (
            <button
              onClick={() => onHybridSynthesis(task.id)}
              disabled={isGeneratingHybrid}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg disabled:opacity-50"
            >
              {isGeneratingHybrid ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingHybrid ? "Génération..." : "Fusionner & Synthétiser"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Layer selector grid */}
      <div className="space-y-3">
        {layers.map((layer) => {
          const current = selectedLayers[layer.id];
          return (
            <div
              key={layer.id}
              className="p-3.5 rounded-xl border border-border/70 bg-card/60 hover:border-border transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>{layer.title}</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{layer.desc}</p>
                </div>

                <div className="flex items-center bg-secondary rounded-lg p-1 border border-border/50 shrink-0">
                  <button
                    onClick={() => setSelectedLayers((prev) => ({ ...prev, [layer.id]: "claude" }))}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                      current === "claude"
                        ? "bg-claude text-white font-bold shadow-sm"
                        : "text-muted-foreground hover:text-claude"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Claude</span>
                  </button>
                  <button
                    onClick={() => setSelectedLayers((prev) => ({ ...prev, [layer.id]: "antigravity" }))}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                      current === "antigravity"
                        ? "bg-antigravity text-white font-bold shadow-sm"
                        : "text-muted-foreground hover:text-antigravity"
                    }`}
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Antigravity</span>
                  </button>
                </div>
              </div>

              {/* Explanatory Advantage Row */}
              <div className="grid grid-cols-2 gap-3 text-[11px] font-sans pt-2 border-t border-border/30">
                <div
                  className={`p-2 rounded-lg border transition-all ${
                    current === "claude"
                      ? "bg-claude-muted/20 border-claude/40 text-claude"
                      : "bg-black/20 border-border/40 text-muted-foreground opacity-60"
                  }`}
                >
                  <span className="font-semibold block text-[10px] uppercase font-mono">Option Claude</span>
                  {layer.claudeAdvantage}
                </div>
                <div
                  className={`p-2 rounded-lg border transition-all ${
                    current === "antigravity"
                      ? "bg-antigravity-muted/20 border-antigravity/40 text-antigravity"
                      : "bg-black/20 border-border/40 text-muted-foreground opacity-60"
                  }`}
                >
                  <span className="font-semibold block text-[10px] uppercase font-mono">Option Antigravity</span>
                  {layer.antigravityAdvantage}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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

// ─── Playwright Headless E2E & Web Vitals Modal ─────────────

function E2EReportModal({
  result,
  onClose,
  onHybridSynthesis,
}: {
  result: DualE2ETestResult;
  onClose: () => void;
  onHybridSynthesis?: (taskId: string) => void;
}) {
  const isClaudeWinner = result.verdict.winner === "claude";
  const isAntigravityWinner = result.verdict.winner === "antigravity";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Rapport d&apos;Audit E2E &amp; Core Web Vitals (Playwright Headless)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Mesure LCP/CLS/TTFB, intégrité d&apos;hydratation React 19 &amp; logs d&apos;erreurs runtime
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

        {/* Verdict Banner */}
        <div className="px-5 py-3 border-b border-border bg-gradient-to-r from-cyan-500/10 via-primary/10 to-blue-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-foreground">
              Vainqueur Vitesse &amp; Stabilité :{" "}
              <span className={isClaudeWinner ? "text-claude" : isAntigravityWinner ? "text-antigravity" : "text-emerald-400"}>
                {isClaudeWinner ? "Claude Code Pro" : isAntigravityWinner ? "Antigravity CLI" : "Égalité Parfaite"}
              </span>
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Δ Vitesse : <span className="font-bold text-foreground">{result.verdict.performanceDeltaMs}ms</span>
          </div>
        </div>

        {/* Content body with side by side web vitals */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Claude Column */}
            <div className="p-3.5 rounded-xl border border-claude/30 bg-claude/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-claude flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Claude Code Pro
                </span>
                <span className="text-sm font-mono font-bold text-claude">
                  {result.claude.score}/100
                </span>
              </div>

              {/* Web Vitals grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">LCP (Vitesse Affichage)</span>
                  <span className={`font-mono font-bold text-xs ${result.claude.webVitals.lcpMs <= 1200 ? "text-emerald-400" : result.claude.webVitals.lcpMs <= 2500 ? "text-amber-400" : "text-red-400"}`}>
                    {result.claude.webVitals.lcpMs} ms
                  </span>
                </div>
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">CLS (Stabilité Visuelle)</span>
                  <span className="font-mono font-bold text-xs text-foreground">
                    {result.claude.webVitals.clsScore}
                  </span>
                </div>
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">TTFB (Temps Serveur)</span>
                  <span className="font-mono font-bold text-xs text-foreground">
                    {result.claude.ttfbMs} ms
                  </span>
                </div>
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Hydratation React</span>
                  <span className={`font-mono font-bold text-xs ${result.claude.hydrationErrorsCount === 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.claude.hydrationErrorsCount === 0 ? "✓ 0 Erreur" : `${result.claude.hydrationErrorsCount} mismatch`}
                  </span>
                </div>
              </div>

              {/* Logs */}
              {result.claude.consoleLogs.length > 0 && (
                <div className="text-[10px] bg-black/40 p-2 rounded-lg font-mono space-y-1 border border-border/40">
                  <span className="text-muted-foreground block font-bold">Logs Console Détectés :</span>
                  {result.claude.consoleLogs.map((log, i) => (
                    <div key={i} className={log.type === "error" ? "text-red-400" : "text-amber-300"}>
                      • {log.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Antigravity Column */}
            <div className="p-3.5 rounded-xl border border-antigravity/30 bg-antigravity/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-antigravity flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Antigravity CLI
                </span>
                <span className="text-sm font-mono font-bold text-antigravity">
                  {result.antigravity.score}/100
                </span>
              </div>

              {/* Web Vitals grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">LCP (Vitesse Affichage)</span>
                  <span className={`font-mono font-bold text-xs ${result.antigravity.webVitals.lcpMs <= 1200 ? "text-emerald-400" : result.antigravity.webVitals.lcpMs <= 2500 ? "text-amber-400" : "text-red-400"}`}>
                    {result.antigravity.webVitals.lcpMs} ms
                  </span>
                </div>
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">CLS (Stabilité Visuelle)</span>
                  <span className="font-mono font-bold text-xs text-foreground">
                    {result.antigravity.webVitals.clsScore}
                  </span>
                </div>
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">TTFB (Temps Serveur)</span>
                  <span className="font-mono font-bold text-xs text-foreground">
                    {result.antigravity.ttfbMs} ms
                  </span>
                </div>
                <div className="bg-background/60 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Hydratation React</span>
                  <span className={`font-mono font-bold text-xs ${result.antigravity.hydrationErrorsCount === 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.antigravity.hydrationErrorsCount === 0 ? "✓ 0 Erreur" : `${result.antigravity.hydrationErrorsCount} mismatch`}
                  </span>
                </div>
              </div>

              {/* Logs */}
              {result.antigravity.consoleLogs.length > 0 && (
                <div className="text-[10px] bg-black/40 p-2 rounded-lg font-mono space-y-1 border border-border/40">
                  <span className="text-muted-foreground block font-bold">Logs Console Détectés :</span>
                  {result.antigravity.consoleLogs.map((log, i) => (
                    <div key={i} className={log.type === "error" ? "text-red-400" : "text-amber-300"}>
                      • {log.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Verdict and AI Recommendation */}
          <div className="p-3 bg-card border border-border/80 rounded-xl space-y-1.5">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Synthèse &amp; Recommandation du Juge IA
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {result.verdict.summary}
            </p>
            <p className="text-xs font-medium text-primary">
              {result.verdict.recommendation}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-card/80">
          {onHybridSynthesis && (
            <button
              onClick={() => {
                onClose();
                onHybridSynthesis(result.taskId);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-primary/20 hover:from-purple-500/30 hover:to-primary/30 text-purple-200 border border-purple-500/30 rounded-md transition-all shadow-sm"
            >
              <Dna className="w-3.5 h-3.5 text-purple-400" />
              <span>Lancer la Synthèse Hybride IA</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors ml-auto"
          >
            Fermer l&apos;audit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ephemeral Mobile Tunnel Modal ──────────────────────────

function MobileTunnelModal({
  tunnel,
  onClose,
  onChangeRole,
}: {
  tunnel: MobileTunnelInfo;
  onClose: () => void;
  onChangeRole: (role: "claude" | "antigravity") => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                📱 Test Immédiat sur Smartphone
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Tunnel chiffré live sans configuration réseau
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

        {/* Role Switcher Tabs */}
        <div className="p-2 bg-secondary/30 border-b border-border flex gap-1 justify-center">
          <button
            onClick={() => onChangeRole("claude")}
            className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
              tunnel.role === "claude" ? "bg-claude text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Aperçu Claude Code
          </button>
          <button
            onClick={() => onChangeRole("antigravity")}
            className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
              tunnel.role === "antigravity" ? "bg-antigravity text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Aperçu Antigravity
          </button>
        </div>

        {/* QR Code and link */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-white rounded-xl shadow-lg border border-border">
            <img
              src={tunnel.qrCodeUrl}
              alt="QR Code Mobile Preview"
              className="w-48 h-48 rounded-lg"
            />
          </div>

          <p className="text-xs text-muted-foreground max-w-xs">
            Pointez l&apos;appareil photo de votre smartphone vers le QR code pour tester instantanément le rendu responsive en conditions réelles.
          </p>

          {/* Copy URL */}
          <div className="w-full flex items-center gap-1.5 p-1.5 bg-background rounded-lg border border-border text-xs font-mono">
            <input
              type="text"
              readOnly
              value={tunnel.tunnelUrl}
              className="flex-1 bg-transparent px-2 text-foreground truncate focus:outline-none"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(tunnel.tunnelUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-1.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors shrink-0"
              title="Copier le lien"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end bg-card/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            Fermer
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
  onOpenMobileTunnel,
}: {
  task: TaskWithRelations;
  claudeUrl?: string | null;
  antigravityUrl?: string | null;
  onOpenMobileTunnel?: (role: "claude" | "antigravity") => void;
}) {
  const [previewMode, setPreviewMode] = useState<"worktree" | "sandbox" | "coolify">("worktree");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeBranchTab, setActiveBranchTab] = useState<"split" | "claude" | "antigravity" | "synthesis" | "slider">("split");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [refreshKey, setRefreshKey] = useState(0);

  const claudeWorktreeUrl = `/api/preview/${task.id}/claude?t=${refreshKey}`;
  const antigravityWorktreeUrl = `/api/preview/${task.id}/antigravity?t=${refreshKey}`;
  const synthesisWorktreeUrl = `/api/preview/${task.id}/synthesis?t=${refreshKey}`;

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
        {/* Left: Mode Switcher (Worktrees Live vs Sandbox vs Coolify URL) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border/50">
            <button
              onClick={() => setPreviewMode("worktree")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                previewMode === "worktree"
                  ? "bg-card text-emerald-400 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Prévisualisation directe des serveurs éphémères exécutés dans les worktrees isolés"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Worktrees Live (0 Mock)</span>
            </button>
            <button
              onClick={() => setPreviewMode("sandbox")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                previewMode === "sandbox"
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Simulateur JSX/Tailwind en mémoire"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Sandbox JSX</span>
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

          {/* Sub-view switcher for Worktrees and Sandbox */}
          {previewMode !== "coolify" && (
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
          {previewMode !== "coolify" && (
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
            className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded text-[11px] font-semibold transition-colors border border-border/60"
            title="Rafraîchir les serveurs de prévisualisation live"
          >
            <RefreshCw className="w-3 h-3 text-primary" />
            <span>Hard Reload</span>
          </button>

          {onOpenMobileTunnel && (
            <button
              onClick={() => onOpenMobileTunnel(activeBranchTab === "antigravity" ? "antigravity" : "claude")}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-primary/10 hover:from-purple-500/20 hover:to-primary/20 text-purple-300 rounded text-[11px] font-semibold transition-colors border border-purple-500/30 shadow-sm"
              title="Générer un QR code pour tester instantanément sur votre smartphone"
            >
              <Smartphone className="w-3 h-3 text-purple-400" />
              <span>📱 QR Mobile</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      {previewMode !== "coolify" ? (
        <div className="flex-1 overflow-hidden flex bg-[#060608] p-2">
          {activeBranchTab === "split" ? (
            <div className={`flex-1 flex gap-2 h-full ${viewportStyles[viewport]}`}>
              {/* Claude Panel */}
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card">
                <div className="px-3 py-1.5 bg-claude-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-claude font-bold flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> {task.claudeBranch || "agent/claude"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {previewMode === "worktree" ? "Worktree Live (Port Éphémère)" : "JSX Simulator"}
                  </span>
                </div>
                <iframe
                  key={`claude-${refreshKey}-${previewMode}`}
                  src={previewMode === "worktree" ? claudeWorktreeUrl : undefined}
                  srcDoc={previewMode === "sandbox" ? claudeHtml : undefined}
                  className="flex-1 w-full bg-[#09090b] border-none"
                  title="Claude Live Preview"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                />
              </div>

              {/* Antigravity Panel */}
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card">
                <div className="px-3 py-1.5 bg-antigravity-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-antigravity font-bold flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5" /> {task.antigravityBranch || "agent/antigravity"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {previewMode === "worktree" ? "Worktree Live (Port Éphémère)" : "JSX Simulator"}
                  </span>
                </div>
                <iframe
                  key={`anti-${refreshKey}-${previewMode}`}
                  src={previewMode === "worktree" ? antigravityWorktreeUrl : undefined}
                  srcDoc={previewMode === "sandbox" ? antigravityHtml : undefined}
                  className="flex-1 w-full bg-[#09090b] border-none"
                  title="Antigravity Live Preview"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                />
              </div>
            </div>
          ) : activeBranchTab === "claude" ? (
            <div className={`flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card ${viewportStyles[viewport]}`}>
              <div className="px-3 py-1.5 bg-claude-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                <span className="text-claude font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Claude Code Live Preview
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {previewMode === "worktree" ? "Worktree Réel" : "Simulateur JSX"}
                </span>
              </div>
              <iframe
                key={`claude-single-${refreshKey}-${previewMode}`}
                src={previewMode === "worktree" ? claudeWorktreeUrl : undefined}
                srcDoc={previewMode === "sandbox" ? claudeHtml : undefined}
                className="flex-1 w-full bg-[#09090b] border-none"
                title="Claude Simulator"
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
              />
            </div>
          ) : activeBranchTab === "antigravity" ? (
            <div className={`flex-1 flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card ${viewportStyles[viewport]}`}>
              <div className="px-3 py-1.5 bg-antigravity-muted/20 border-b border-border/60 flex items-center justify-between text-xs font-mono">
                <span className="text-antigravity font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" /> Antigravity Engine Live Preview
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {previewMode === "worktree" ? "Worktree Réel" : "Simulateur JSX"}
                </span>
              </div>
              <iframe
                key={`anti-single-${refreshKey}-${previewMode}`}
                src={previewMode === "worktree" ? antigravityWorktreeUrl : undefined}
                srcDoc={previewMode === "sandbox" ? antigravityHtml : undefined}
                className="flex-1 w-full bg-[#09090b] border-none"
                title="Antigravity Simulator"
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
              />
            </div>
          ) : activeBranchTab === "slider" ? (
            <div className={`flex-1 flex flex-col h-full ${viewportStyles[viewport]} relative overflow-hidden rounded-xl border border-border/80 bg-card`}>
              {/* Slider Top Controller Bar */}
              <div className="px-3 py-1.5 bg-[#121215] border-b border-border/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold text-foreground">Curseur Visuel Superposé (Live Worktrees)</span>
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
                  key={`slider-anti-${refreshKey}-${previewMode}`}
                  src={previewMode === "worktree" ? antigravityWorktreeUrl : undefined}
                  srcDoc={previewMode === "sandbox" ? antigravityHtml : undefined}
                  className="absolute inset-0 w-full h-full bg-[#09090b] border-none pointer-events-none"
                  title="Antigravity Background"
                />

                {/* Top Layer: Claude (clipped) */}
                <div
                  className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <iframe
                    key={`slider-claude-${refreshKey}-${previewMode}`}
                    src={previewMode === "worktree" ? claudeWorktreeUrl : undefined}
                    srcDoc={previewMode === "sandbox" ? claudeHtml : undefined}
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
                <span className="text-[10px] text-muted-foreground font-mono">
                  {previewMode === "worktree" ? "Worktree Réel" : "Simulateur JSX"}
                </span>
              </div>
              <iframe
                key={`synth-single-${refreshKey}-${previewMode}`}
                src={previewMode === "worktree" ? synthesisWorktreeUrl : undefined}
                srcDoc={previewMode === "sandbox" ? synthesisHtml : undefined}
                className="flex-1 w-full bg-[#09090b] border-none"
                title="Synthesis Simulator"
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
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
