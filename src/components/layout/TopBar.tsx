// ============================================================
// VibeFlow Studio — TopBar Component
// ============================================================
"use client";

import React, { useState } from "react";
import {
  GitBranch,
  Cloud,
  Zap,
  Handshake,
  ChevronDown,
  Settings,
  Bell,
  RefreshCw,
  ExternalLink,
  CircleDot,
  Play,
  Loader2,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";

interface TopBarProps {
  onOpenSettings?: () => void;
  onOpenCliSetup?: () => void;
}

export function TopBar({ onOpenSettings, onOpenCliSetup }: TopBarProps) {
  const { projects, selectedProject, toggleMode, fetchProjects } =
    useProjectStore();
  const { setSelectedProjectId, notifications, addNotification } = useUIStore();
  const [isTicking, setIsTicking] = useState(false);

  const isAuto = selectedProject?.mode === "AUTO";

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(e.target.value);
  };

  const handleModeToggle = () => {
    if (selectedProject) {
      toggleMode(selectedProject.id);
    }
  };

  const handleTriggerDaemon = async () => {
    if (!selectedProject) return;
    setIsTicking(true);
    try {
      const res = await fetch("/api/daemon/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });
      const data = await res.json();
      addNotification({
        type: "success",
        title: "Cycle Autonome Exécuté",
        message: data.message || "Tâches et optimisations analysées par les agents.",
        autoDismissMs: 3500,
      });
      await fetchProjects();
    } catch {
      addNotification({
        type: "error",
        title: "Erreur Daemon",
        message: "Impossible de déclencher le cycle autonome.",
        autoDismissMs: 3000,
      });
    } finally {
      setIsTicking(false);
    }
  };

  // Derive status badges
  const lastDeployment = Array.isArray(selectedProject?.deployments)
    ? selectedProject.deployments[0]
    : undefined;
  const coolifyStatus = lastDeployment?.status || "UNKNOWN";
  const coolifyStatusColor =
    coolifyStatus === "RUNNING"
      ? "text-green-400"
      : coolifyStatus === "BUILDING"
        ? "text-yellow-400"
        : coolifyStatus === "FAILED"
          ? "text-red-400"
          : "text-muted-foreground";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Left: Logo + Project Selector */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            VibeFlow<span className="text-primary">Studio</span>
          </span>
        </div>

        {/* Project Selector */}
        <div className="relative">
          <select
            value={selectedProject?.id || ""}
            onChange={handleProjectChange}
            className="appearance-none bg-secondary text-foreground text-sm rounded-md pl-3 pr-8 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="" disabled>
              Select a project...
            </option>
            {(Array.isArray(projects) ? projects : []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        <button
          onClick={() => fetchProjects()}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh projects"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center: GitHub & Coolify Status */}
      {selectedProject && (
        <div className="flex items-center gap-6 text-xs">
          {/* GitHub Status */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitBranch className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">
              {selectedProject.githubDefaultBranch}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>{selectedProject.githubRepo}</span>
          </div>

          {/* Coolify Status */}
          <div className="flex items-center gap-2">
            <Cloud className={`w-3.5 h-3.5 ${coolifyStatusColor}`} />
            <span className={`font-medium ${coolifyStatusColor}`}>
              {coolifyStatus === "RUNNING"
                ? "Live"
                : coolifyStatus === "BUILDING"
                  ? "Building..."
                  : coolifyStatus === "FAILED"
                    ? "Failed"
                    : "—"}
            </span>
            {lastDeployment?.previewUrl && (
              <a
                href={lastDeployment.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Right: Mode Toggle + Actions */}
      <div className="flex items-center gap-3">
        {/* Mode Toggle */}
        {selectedProject && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleModeToggle}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
                ${
                  isAuto
                    ? "bg-primary/20 text-primary border border-primary/30 mode-toggle-auto"
                    : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
                }
              `}
            >
              {isAuto ? (
                <>
                  <CircleDot className="w-3 h-3 animate-pulse" />
                  <span>Mode Auto 24/7</span>
                  <Zap className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Handshake className="w-3 h-3" />
                  <span>Mode Accompagné</span>
                </>
              )}
            </button>

            {isAuto && (
              <button
                onClick={handleTriggerDaemon}
                disabled={isTicking}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                title="Déclencher manuellement un cycle d'optimisation autonome"
              >
                {isTicking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span className="hidden sm:inline">Exécuter Cycle</span>
              </button>
            )}
          </div>
        )}

        {/* Assistance CLIs Pro */}
        <button
          onClick={onOpenCliSetup}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
          title="Assistance de configuration Claude Pro & Antigravity CLI (0€)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">CLIs Pro (0€)</span>
        </button>

        {/* Notifications */}
        <button className="relative p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full text-[9px] font-bold flex items-center justify-center text-primary-foreground">
              {notifications.length}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Paramètres & Intégrations API"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
