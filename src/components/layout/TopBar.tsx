// ============================================================
// VibeFlow Studio — TopBar Component
// ============================================================
"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sliders,
  Compass,
  Store,
  LogOut,
  UserCircle,
  ShieldAlert,
  User,
  ShieldCheck,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { TokenSavingsBadge } from "@/components/dashboard/TokenSavingsTracker";
import { DaemonControllerModal } from "@/components/dashboard/DaemonControllerModal";
import { ProjectFramingGuide } from "@/components/dashboard/ProjectFramingGuide";
import { SkillsMpStoreModal } from "@/components/skills/SkillsMpStoreModal";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AdminConsoleModal } from "@/components/admin/AdminConsoleModal";

interface TopBarProps {
  onOpenSettings?: () => void;
  onOpenCliSetup?: () => void;
}

export function TopBar({ onOpenSettings, onOpenCliSetup }: TopBarProps) {
  const { projects, selectedProject, toggleMode, fetchProjects, toolboxItems } =
    useProjectStore();
  const { setSelectedProjectId, notifications, addNotification } = useUIStore();
  const { user, isAdmin, isAuthenticated, logout, fetchMe } = useAuthStore();
  const [isTicking, setIsTicking] = useState(false);
  const [daemonModalOpen, setDaemonModalOpen] = useState(false);
  const [framingGuideOpen, setFramingGuideOpen] = useState(false);
  const [skillsMpStoreOpen, setSkillsMpStoreOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [adminConsoleOpen, setAdminConsoleOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

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

        {/* Project Framing & Blueprint Guide */}
        <button
          onClick={() => setFramingGuideOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-primary/10 hover:from-purple-500/20 hover:to-primary/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all shadow-sm"
          title="Ouvrir le Guide de Cadrage Pré-VibeCoding & Blueprint Projet"
        >
          <Compass className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Cadrer Projet</span>
        </button>

        {/* SkillsMP Store */}
        <button
          onClick={() => setSkillsMpStoreOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition-all shadow-sm"
          title="Ouvrir le Store de Compétences SkillsMP (skillsmp.com)"
        >
          <Store className="w-3.5 h-3.5 text-primary" />
          <span className="hidden md:inline">SkillsMP Store</span>
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

          {/* Polyglot Tech Stack Badges */}
          {toolboxItems && toolboxItems.length > 0 && (
            <div className="hidden xl:flex items-center gap-1.5 border-l border-border/60 pl-4">
              {toolboxItems
                .filter(
                  (t) =>
                    t.status === "ACQUIRED" &&
                    (t.category === "FRAMEWORK" || t.category === "DATABASE" || t.category === "UI_KIT")
                )
                .slice(0, 3)
                .map((tool) => (
                  <span
                    key={tool.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-foreground/80 border border-border"
                    title={`${tool.name} (${tool.category})`}
                  >
                    {tool.name}
                  </span>
                ))}
            </div>
          )}
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

            {/* Daemon Autonomy Controller Settings */}
            <button
              onClick={() => setDaemonModalOpen(true)}
              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/50"
              title="Paramètres d'autonomie et limites de sécurité du Daemon 24/7"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Token Savings Tracker (0€ Cost) */}
        <TokenSavingsBadge />

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

        {/* User Account / Auth & Admin Console */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary border border-border transition-colors text-xs font-medium"
              title={`Compte: ${user.name} (${user.role})`}
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-foreground max-w-[90px] truncate">
                {user.name}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  user.role === "ADMIN"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                }`}
              >
                {user.role}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        user.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Statut: {user.status}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setAdminConsoleOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors text-left"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Console Administration</span>
                  </button>
                )}

                <button
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Se Déconnecter</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-sm"
            title="Connexion / Inscription à VibeFlow Studio"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Se Connecter</span>
          </button>
        )}
      </div>

      {/* Auth Modal */}
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />

      {/* Admin Console Modal */}
      <AdminConsoleModal
        isOpen={adminConsoleOpen}
        onClose={() => setAdminConsoleOpen(false)}
      />

      {/* Daemon 24/7 Autonomy Controller Modal */}
      <DaemonControllerModal
        isOpen={daemonModalOpen}
        onClose={() => setDaemonModalOpen(false)}
      />

      {/* Project Framing & Blueprint Guide */}
      {framingGuideOpen && (
        <ProjectFramingGuide onClose={() => setFramingGuideOpen(false)} />
      )}

      {/* SkillsMP Store Browser Modal */}
      <SkillsMpStoreModal
        isOpen={skillsMpStoreOpen}
        onClose={() => setSkillsMpStoreOpen(false)}
      />
    </header>
  );
}
