// ============================================================
// VibeFlow Studio — TopBar Component (UX Refonte v2)
// Inspiré Linear / Vercel / Cursor — Minimaliste & Efficace
// ============================================================
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  Cloud,
  Zap,
  ChevronDown,
  Settings,
  Bell,
  ExternalLink,
  CircleDot,
  Play,
  Loader2,
  Compass,
  Store,
  LogOut,
  UserCircle,
  ShieldAlert,
  KeyRound,
  Terminal,
  MoreHorizontal,
  Handshake,
  Sliders,
  RefreshCw,
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
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface TopBarProps {
  onOpenSettings?: () => void;
  onOpenCliSetup?: () => void;
}

export function TopBar({ onOpenSettings, onOpenCliSetup }: TopBarProps) {
  const { projects, selectedProject, toggleMode, fetchProjects, toolboxItems } =
    useProjectStore();
  const {
    setSelectedProjectId,
    notifications,
    addNotification,
    setActiveCliTab,
    setCliPanelOpen,
    setCliPanelMaximized,
    toggleSidebar,
  } = useUIStore();
  const { user, isAdmin, isAuthenticated, logout, fetchMe } = useAuthStore();
  const [hasCliAssociated, setHasCliAssociated] = useState(false);
  const [isTicking, setIsTicking] = useState(false);
  const [daemonModalOpen, setDaemonModalOpen] = useState(false);
  const [framingGuideOpen, setFramingGuideOpen] = useState(false);
  const [skillsMpStoreOpen, setSkillsMpStoreOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [adminConsoleOpen, setAdminConsoleOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMe();
    fetch("/api/settings/cli-setup")
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          setHasCliAssociated(Boolean(d.claude?.authenticated || d.antigravity?.authenticated));
        }
      })
      .catch(() => {});
  }, [fetchMe]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const openTerminal = () => {
    setActiveCliTab("bash");
    setCliPanelOpen(true);
    setCliPanelMaximized(false);
  };

  // Deployment badge
  const lastDeployment = Array.isArray(selectedProject?.deployments)
    ? selectedProject.deployments[0]
    : undefined;
  const coolifyStatus = lastDeployment?.status || "UNKNOWN";
  const deployBadge =
    coolifyStatus === "RUNNING"
      ? { label: "Live", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" }
      : coolifyStatus === "BUILDING"
        ? { label: "Build...", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" }
        : coolifyStatus === "FAILED"
          ? { label: "Échec", cls: "text-red-400 bg-red-500/10 border-red-500/30" }
          : null;

  const unreadNotifs = notifications.length;

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-3 gap-3 shrink-0">
      {/* ── LEFT: Logo + Project ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo */}
        <VibeFlowLogo size="sm" withGlow href="/dashboard" />

        {/* Separator */}
        <div className="h-5 w-px bg-border" />

        {/* Project Selector */}
        <div className="relative flex items-center gap-1">
          <select
            value={selectedProject?.id || ""}
            onChange={handleProjectChange}
            className="appearance-none bg-transparent text-foreground text-sm font-medium pl-0 pr-6 py-1 focus:outline-none cursor-pointer hover:text-primary transition-colors max-w-[160px] truncate"
          >
            <option value="" disabled>
              Sélectionner un projet...
            </option>
            {(Array.isArray(projects) ? projects : []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Git branch + Deploy status (compact) */}
        {selectedProject && (
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span className="font-mono">{selectedProject.githubDefaultBranch}</span>
            </div>
            {deployBadge && (
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${deployBadge.cls}`}
              >
                <span className="w-1 h-1 rounded-full bg-current" />
                {deployBadge.label}
              </span>
            )}
            {lastDeployment?.previewUrl && (
              <a
                href={lastDeployment.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Ouvrir l'URL de prévisualisation"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── CENTER: Primary Actions ── */}
      <div className="flex items-center gap-1.5">
        {/* Cadrer Projet — CTA primaire */}
        <button
          onClick={() => setFramingGuideOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20"
          title="Guide de cadrage Pré-VibeCoding & Blueprint Projet"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Cadrer</span>
        </button>

        {/* Terminal — accès rapide */}
        <button
          onClick={openTerminal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          title="Ouvrir le terminal CloudCLI"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Terminal</span>
        </button>

        {/* Mode Toggle */}
        {selectedProject && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleModeToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                isAuto
                  ? "bg-primary/15 text-primary border border-primary/25 mode-toggle-auto"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              title={isAuto ? "Mode Auto 24/7 — Cliquer pour passer en Accompagné" : "Mode Accompagné — Cliquer pour activer l'Auto 24/7"}
            >
              {isAuto ? (
                <>
                  <CircleDot className="w-3 h-3 animate-pulse" />
                  <span className="hidden lg:inline">Auto 24/7</span>
                </>
              ) : (
                <>
                  <Handshake className="w-3 h-3" />
                  <span className="hidden lg:inline">Accompagné</span>
                </>
              )}
            </button>

            {isAuto && (
              <button
                onClick={handleTriggerDaemon}
                disabled={isTicking}
                className="p-1.5 rounded-md text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                title="Déclencher manuellement un cycle autonome"
              >
                {isTicking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Status + User ── */}
      <div className="flex items-center gap-2">
        {/* Token Savings */}
        <TokenSavingsBadge />

        {/* CLI Status Badge */}
        <button
          onClick={onOpenCliSetup}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            hasCliAssociated
              ? "text-emerald-400 hover:bg-emerald-500/10"
              : "text-amber-400 hover:bg-amber-500/10"
          }`}
          title={hasCliAssociated ? "CLIs Pro connectés (0€)" : "Associer vos CLIs Pro (0€)"}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasCliAssociated ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{hasCliAssociated ? "CLIs (0€)" : "Config CLIs"}</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full text-[9px] font-bold flex items-center justify-center text-primary-foreground">
                {unreadNotifs}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-xs font-semibold text-foreground">Notifications</p>
              </div>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">Aucune notification</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.slice().reverse().map((n) => (
                    <div key={n.id} className="px-3 py-2 border-b border-border/40 last:border-0">
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* More actions (Settings + SkillsMP + Daemon) */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen((v) => !v)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Plus d'options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {moreMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => { setMoreMenuOpen(false); onOpenSettings?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
              >
                <Settings className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Paramètres & Intégrations</span>
              </button>
              <button
                onClick={() => { setMoreMenuOpen(false); setSkillsMpStoreOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
              >
                <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>SkillsMP Store</span>
              </button>
              {selectedProject && (
                <>
                  <div className="border-t border-border/60 my-1" />
                  <button
                    onClick={() => { setMoreMenuOpen(false); setDaemonModalOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <Sliders className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>Paramètres Daemon 24/7</span>
                  </button>
                  <button
                    onClick={() => { setMoreMenuOpen(false); fetchProjects(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>Actualiser les projets</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* User Account */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-secondary transition-colors"
              title={`${user.name} · ${user.role}`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs text-foreground font-medium max-w-[80px] truncate">
                {user.name.split(" ")[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                {/* User info header */}
                <div className="px-3 py-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      user.role === "ADMIN"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                    }`}
                  >
                    {user.role === "ADMIN" ? "👑 Administrateur" : "👤 Utilisateur"}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => { setUserMenuOpen(false); setAdminConsoleOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors text-left"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Console Administration</span>
                  </button>
                )}

                <button
                  onClick={() => { setUserMenuOpen(false); setChangePasswordOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Changer mon mot de passe</span>
                </button>

                <div className="border-t border-border/60 my-1" />
                <button
                  onClick={async () => { setUserMenuOpen(false); await logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Se Déconnecter</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-sm"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span>Connexion</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <AuthDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
      <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
      <AdminConsoleModal isOpen={adminConsoleOpen} onClose={() => setAdminConsoleOpen(false)} />
      <DaemonControllerModal isOpen={daemonModalOpen} onClose={() => setDaemonModalOpen(false)} />
      {framingGuideOpen && <ProjectFramingGuide onClose={() => setFramingGuideOpen(false)} />}
      <SkillsMpStoreModal isOpen={skillsMpStoreOpen} onClose={() => setSkillsMpStoreOpen(false)} />
    </header>
  );
}
