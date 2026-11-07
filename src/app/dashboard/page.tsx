// ============================================================
// VibeFlow Studio — Dashboard Page (Main Workspace)
// Real-time SSE integration, Settings modal & Reactive Updates
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutGrid,
  GitCompareArrows,
  Package,
  Plus,
  Loader2,
  FolderGit2,
  Compass,
  TrendingUp,
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
  icon: React.ReactNode;
}> = [
  {
    id: "kanban",
    label: "Kanban & Tâches",
    icon: <LayoutGrid className="w-3.5 h-3.5" />,
  },
  {
    id: "arena",
    label: "Arène Dual-Branch",
    icon: <GitCompareArrows className="w-3.5 h-3.5" />,
  },
  {
    id: "toolbox",
    label: "Boîte à Outils",
    icon: <Package className="w-3.5 h-3.5" />,
  },
  {
    id: "analytics",
    label: "Analytics & Vélocité",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
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

  // ── Real-Time Server-Sent Events (SSE) Listener ─────────────
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

  if (loading && projects.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Chargement de VibeFlow Studio...
          </p>
        </div>
      </div>
    );
  }

  // Empty state — no projects
  if (projects.length === 0 && !loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <TopBar
          onOpenSettings={() => setShowSettingsDialog(true)}
          onOpenCliSetup={() => setShowCliSetupWizard(true)}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <LayoutGrid className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Bienvenue dans VibeFlow Studio
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Créez votre premier projet pour commencer le VibeCoding avec
              l&apos;orchestration duale Claude × Antigravity.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowFramingGuide(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md"
              >
                <Compass className="w-4 h-4 text-purple-200" />
                🧭 Cadrer un Nouveau Projet (Guide Pré-VibeCoding)
              </button>

              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground border border-border rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors shadow-sm"
              >
                <FolderGit2 className="w-4 h-4" />
                Lire un GitHub Existant
              </button>
            </div>
          </div>
        </div>
        {showCreateDialog && (
          <CreateProjectDialog onClose={() => setShowCreateDialog(false)} />
        )}
        {showFramingGuide && (
          <ProjectFramingGuide onClose={() => setShowFramingGuide(false)} />
        )}
        {showSettingsDialog && (
          <SettingsDialog
            onClose={() => setShowSettingsDialog(false)}
            onOpenCliSetup={() => setShowCliSetupWizard(true)}
          />
        )}
        <CliSetupWizard
          isOpen={showCliSetupWizard}
          onClose={() => setShowCliSetupWizard(false)}
        />
      </div>
    );
  }

  const mainLayout =
    cliPanelPosition === "bottom" ? "flex-col" : "flex-row";

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

        {/* Center Workspace + CLI */}
        <div className={`flex-1 flex ${mainLayout} overflow-hidden`}>
          {/* Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center border-b border-border px-4">
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveWorkspaceTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeWorkspaceTab === tab.id
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}

              {/* Action Buttons on right */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors"
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Importer / Nouveau projet</span>
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

          {/* CloudCLI Panel */}
          {cliPanelOpen && <CloudCLI />}
        </div>
      </div>

      {/* Floating CLI toggle when panel is closed */}
      {!cliPanelOpen && <CloudCLI />}

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <CreateProjectDialog onClose={() => setShowCreateDialog(false)} />
      )}

      {/* Project Framing & Blueprint Guide */}
      {showFramingGuide && (
        <ProjectFramingGuide onClose={() => setShowFramingGuide(false)} />
      )}

      {/* Global Settings Dialog */}
      {showSettingsDialog && (
        <SettingsDialog
          onClose={() => setShowSettingsDialog(false)}
          onOpenCliSetup={() => setShowCliSetupWizard(true)}
        />
      )}

      {/* Pro CLIs Setup & Diagnostics Wizard */}
      <CliSetupWizard
        isOpen={showCliSetupWizard}
        onClose={() => setShowCliSetupWizard(false)}
      />
    </div>
  );
}
