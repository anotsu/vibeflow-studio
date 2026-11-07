// ============================================================
// VibeFlow Studio — Dashboard Page (Main Workspace)
// UX Refonte v2 — Inspiré Linear / Vercel / Cursor
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutGrid,
  GitCompareArrows,
  Wrench,
  TrendingUp,
  Plus,
  Loader2,
  Compass,
  FolderGit2,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { CloudCLI } from "@/components/layout/CloudCLI";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { DualBranchArena } from "@/components/arena/DualBranchArena";
import { Toolbox } from "@/components/toolbox/Toolbox";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { WorkspaceTab } from "@/types";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { ProjectFramingGuide } from "@/components/dashboard/ProjectFramingGuide";
import { SettingsDialog } from "@/components/dashboard/SettingsDialog";
import { CliSetupWizard } from "@/components/setup/CliSetupWizard";

const WORKSPACE_TABS: Array<{
  id: WorkspaceTab;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: "kanban",
    label: "Tâches",
    shortLabel: "Tâches",
    icon: <LayoutGrid className="w-3.5 h-3.5" />,
    description: "Suivi des tâches en flux Kanban",
  },
  {
    id: "arena",
    label: "Arène IA",
    shortLabel: "Arène",
    icon: <GitCompareArrows className="w-3.5 h-3.5" />,
    description: "Duel Claude × Antigravity sur vos branches",
  },
  {
    id: "toolbox",
    label: "Outils",
    shortLabel: "Outils",
    icon: <Wrench className="w-3.5 h-3.5" />,
    description: "Stack technique et dépendances du projet",
  },
  {
    id: "analytics",
    label: "Statistiques",
    shortLabel: "Stats",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    description: "Vélocité, économies et métriques",
  },
];

export default function DashboardPage() {
  const {
    projects,
    selectedProject,
    loading,
    fetchProjects,
    selectProject,
    fetchTasks,
    fetchToolbox,
    fetchDeployments,
  } = useProjectStore();

  const {
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    cliPanelPosition,
    cliPanelOpen,
    sidebarOpen,
    toggleSidebar,
    selectedProjectId,
    setSelectedProjectId,
    addNotification,
  } = useUIStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFramingGuide, setShowFramingGuide] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showCliSetupWizard, setShowCliSetupWizard] = useState(false);

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-select project when selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      selectProject(selectedProjectId);
    }
  }, [selectedProjectId, selectProject]);

  // Auto-select first project if none selected
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  // ── Real-Time SSE Listener ─────────────────────────────────
  useEffect(() => {
    if (!selectedProjectId) return;

    const eventSource = new EventSource(`/api/events?projectId=${selectedProjectId}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "DEBATE_MESSAGE") {
          addNotification({
            type: "info",
            title: `Débat ${payload.data.log?.speaker || "Agent"}`,
            message: payload.data.log?.message?.slice(0, 80) + "...",
            autoDismissMs: 3000,
          });
        } else if (payload.type === "PHASE_CHANGED") {
          fetchTasks(selectedProjectId);
        } else if (payload.type === "DEPLOYMENT_STATUS") {
          fetchDeployments(selectedProjectId);
        } else if (payload.type === "TOOLBOX_UPDATED") {
          fetchToolbox(selectedProjectId);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedProjectId, fetchTasks, fetchDeployments, fetchToolbox, addNotification]);

  // ── Loading State ──────────────────────────────────────────
  if (loading && projects.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground">VibeFlow Studio</p>
          <p className="text-xs text-muted-foreground mt-1">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Empty State — No Projects ──────────────────────────────
  if (projects.length === 0 && !loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <TopBar
          onOpenSettings={() => setShowSettingsDialog(true)}
          onOpenCliSetup={() => setShowCliSetupWizard(true)}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            {/* Hero Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20 shadow-lg">
                  <Rocket className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                  <span className="text-[10px]">✨</span>
                </div>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Bienvenue dans VibeFlow Studio
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Orchestrez Claude et Antigravity pour vos projets de VibeCoding.
                Commencez par cadrer votre idée ou connectez un dépôt GitHub existant.
              </p>
            </div>

            {/* Primary CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setShowFramingGuide(true)}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/5 border border-primary/20 hover:border-primary/40 hover:bg-primary/15 transition-all shadow-sm text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                  <Compass className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Nouveau projet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cadrer votre vision avec l&apos;IA
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowCreateDialog(true)}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl bg-secondary border border-border hover:border-border/80 hover:bg-secondary/80 transition-all shadow-sm text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center group-hover:bg-secondary transition-colors border border-border">
                  <FolderGit2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Dépôt GitHub</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connecter un projet existant
                  </p>
                </div>
              </button>
            </div>

            {/* Features hint */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                Orchestration duale Claude × Antigravity
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                0€ de tokens
              </span>
            </div>
          </div>
        </div>

        {showCreateDialog && <CreateProjectDialog onClose={() => setShowCreateDialog(false)} />}
        {showFramingGuide && <ProjectFramingGuide onClose={() => setShowFramingGuide(false)} />}
        {showSettingsDialog && (
          <SettingsDialog
            onClose={() => setShowSettingsDialog(false)}
            onOpenCliSetup={() => setShowCliSetupWizard(true)}
          />
        )}
        <CliSetupWizard isOpen={showCliSetupWizard} onClose={() => setShowCliSetupWizard(false)} />
        <CloudCLI />
      </div>
    );
  }

  const mainLayout = cliPanelPosition === "bottom" ? "flex-col" : "flex-row";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <TopBar
        onOpenSettings={() => setShowSettingsDialog(true)}
        onOpenCliSetup={() => setShowCliSetupWizard(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Vibe Guide & Roadmap */}
        <Sidebar />

        {/* Sidebar Toggle (collapsed state) */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-5 hover:w-6 border-r border-border bg-card/50 hover:bg-secondary transition-all shrink-0 group"
            title="Ouvrir le panneau Vibe Guide"
          >
            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
          </button>
        )}

        {/* Center Workspace + CLI */}
        <div className={`flex-1 flex ${mainLayout} overflow-hidden`}>
          {/* Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center border-b border-border px-2 bg-card/30 shrink-0">
              {/* Sidebar toggle when open */}
              {sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 mr-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Réduire le panneau Vibe Guide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Tabs */}
              <div className="flex items-center flex-1">
                {WORKSPACE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveWorkspaceTab(tab.id)}
                    title={tab.description}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeWorkspaceTab === tab.id
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Quick Actions right side */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setShowFramingGuide(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                  title="Cadrer un nouveau projet ou étape"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Cadrer</span>
                </button>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Importer ou créer un projet"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Projet</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeWorkspaceTab === "kanban" && <KanbanBoard />}
              {activeWorkspaceTab === "arena" && <DualBranchArena />}
              {activeWorkspaceTab === "toolbox" && <Toolbox />}
              {activeWorkspaceTab === "analytics" && <AnalyticsDashboard />}
            </div>
          </div>

          {/* CloudCLI Panel (right position) */}
          {cliPanelPosition === "right" && cliPanelOpen && <CloudCLI />}
        </div>

        {/* CloudCLI Panel (bottom position) */}
        {cliPanelPosition === "bottom" && cliPanelOpen && (
          <div className="shrink-0">
            <CloudCLI />
          </div>
        )}
      </div>

      {/* Floating CloudCLI toggle when panel is closed */}
      {!cliPanelOpen && <CloudCLI />}

      {/* Dialogs */}
      {showCreateDialog && <CreateProjectDialog onClose={() => setShowCreateDialog(false)} />}
      {showFramingGuide && <ProjectFramingGuide onClose={() => setShowFramingGuide(false)} />}
      {showSettingsDialog && (
        <SettingsDialog
          onClose={() => setShowSettingsDialog(false)}
          onOpenCliSetup={() => setShowCliSetupWizard(true)}
        />
      )}
      <CliSetupWizard isOpen={showCliSetupWizard} onClose={() => setShowCliSetupWizard(false)} />
    </div>
  );
}
