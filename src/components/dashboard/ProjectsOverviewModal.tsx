// ============================================================
// VibeFlow Studio — Projects Overview & Daemon Fleet Modal
// Multi-tenancy dashboard: view all projects, monitor daemons,
// trigger autonomous cycles, and manage isolated worktrees
// ============================================================
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Layers,
  CircleDot,
  Play,
  Loader2,
  RefreshCw,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  FolderGit2,
  Plus,
  ShieldCheck,
  Compass,
  Zap,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectOverviewItem, FleetStats } from "@/app/api/projects/overview/route";

interface ProjectsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProject?: () => void;
  onOpenFramingGuide?: () => void;
}

export function ProjectsOverviewModal({
  isOpen,
  onClose,
  onOpenCreateProject,
  onOpenFramingGuide,
}: ProjectsOverviewModalProps) {
  const { setSelectedProjectId, addNotification } = useUIStore();
  const { fetchProjects } = useProjectStore();

  const [loading, setLoading] = useState(true);
  const [fleetStats, setFleetStats] = useState<FleetStats | null>(null);
  const [projects, setProjects] = useState<ProjectOverviewItem[]>([]);
  const [tickingProjectId, setTickingProjectId] = useState<string | null>(null);
  const [cleaningProjectId, setCleaningProjectId] = useState<string | null>(null);
  const [tickingAll, setTickingAll] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects/overview");
      if (!res.ok) throw new Error("Échec de chargement de l'aperçu multi-projets");
      const data = await res.json();
      if (data.success) {
        setFleetStats(data.fleetStats);
        setProjects(data.projects || []);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur de chargement",
        message: err?.message || "Impossible de récupérer la flotte de projets.",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
    }
  }, [isOpen, fetchOverview]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleMode = async (projectId: string, currentMode: "AUTO" | "ASSISTED") => {
    const newMode = currentMode === "AUTO" ? "ASSISTED" : "AUTO";
    try {
      const res = await fetch("/api/projects/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_mode",
          projectId,
          mode: newMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "success",
          title: "Mode mis à jour",
          message: data.message || `Projet passé en mode ${newMode}`,
          autoDismissMs: 3000,
        });
        await fetchOverview();
        await fetchProjects();
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de modifier le mode du projet.",
      });
    }
  };

  const handleTriggerDaemon = async (projectId?: string) => {
    if (projectId) {
      setTickingProjectId(projectId);
    } else {
      setTickingAll(true);
    }

    try {
      const res = await fetch("/api/projects/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger_daemon",
          projectId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "success",
          title: "Cycle Autonome Exécuté",
          message: data.message || "Analyse et optimisation lancées.",
          autoDismissMs: 3500,
        });
        await fetchOverview();
        await fetchProjects();
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur Daemon",
        message: "Impossible de déclencher le cycle autonome.",
      });
    } finally {
      setTickingProjectId(null);
      setTickingAll(false);
    }
  };

  const handleCleanWorktrees = async (projectId: string) => {
    setCleaningProjectId(projectId);
    try {
      const res = await fetch("/api/projects/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clean_worktrees",
          projectId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "success",
          title: "Bacs à sable nettoyés",
          message: data.message || "Worktrees et previews supprimés avec succès.",
          autoDismissMs: 3000,
        });
        await fetchOverview();
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur de nettoyage",
        message: "Impossible de purger les worktrees du projet.",
      });
    } finally {
      setCleaningProjectId(null);
    }
  };

  const handleSelectAndOpen = (projectId: string) => {
    setSelectedProjectId(projectId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Vue d&apos;ensemble Multi-Projets & Daemons
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
                  Flotte VibeFlow
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Isolation étanche des environnements de dev & pilotage des agents autonomes 24/7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOverview()}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Rafraîchir les données de la flotte"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Fleet Stats Bar ── */}
        {fleetStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-secondary/40 border-b border-border shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/70">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Projets Gérés</p>
                <p className="text-sm font-bold text-foreground">{fleetStats.totalProjects}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/70">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <CircleDot className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Daemons Auto 24/7</p>
                <p className="text-sm font-bold text-emerald-400">
                  {fleetStats.autoDaemonsCount} / {fleetStats.totalProjects}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/70">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Tâches en Cours</p>
                <p className="text-sm font-bold text-foreground">{fleetStats.activeTasksCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Worktrees Isolés</p>
                  <p className="text-sm font-bold text-foreground">{fleetStats.totalIsolatedWorktrees}</p>
                </div>
              </div>

              {fleetStats.autoDaemonsCount > 0 && (
                <button
                  onClick={() => handleTriggerDaemon()}
                  disabled={tickingAll}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Déclencher un cycle sur tous les projets en mode Auto 24/7"
                >
                  {tickingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden lg:inline">Exécuter Tous</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Projects Grid Body ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && projects.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-foreground">Inspection de la flotte...</p>
              <p className="text-xs text-muted-foreground">Collecte des états des daemons et des worktrees</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center">
              <FolderGit2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Aucun projet configuré</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Commencez par cadrer votre première application avec l&apos;IA ou importez un dépôt GitHub.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => {
                    onClose();
                    onOpenFramingGuide?.();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Cadrer avec l&apos;IA
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((p) => {
                const isAuto = p.mode === "AUTO";
                const isTickingThis = tickingProjectId === p.id;
                const isCleaningThis = cleaningProjectId === p.id;
                const deploy = p.latestDeployment;

                return (
                  <div
                    key={p.id}
                    className="flex flex-col bg-card/60 hover:bg-card border border-border/80 hover:border-primary/40 rounded-xl p-4 transition-all shadow-sm group"
                  >
                    {/* Top Row: Name + Mode Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {p.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {p.vibeDescription || "Aucune description fournie"}
                        </p>
                      </div>

                      {/* Mode Badge */}
                      <button
                        onClick={() => handleToggleMode(p.id, p.mode)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                          isAuto
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                        }`}
                        title={
                          isAuto
                            ? "Mode Auto 24/7 actif. Cliquer pour repasser en mode Accompagné"
                            : "Mode Accompagné. Cliquer pour activer le Daemon 24/7"
                        }
                      >
                        <CircleDot className={`w-2.5 h-2.5 ${isAuto ? "animate-pulse" : ""}`} />
                        <span>{isAuto ? "Auto 24/7" : "Accompagné"}</span>
                      </button>
                    </div>

                    {/* GitHub Repo + Branch */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <a
                        href={`https://github.com/${p.githubRepo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground truncate font-mono text-[11px]"
                      >
                        <FolderGit2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.githubRepo}</span>
                      </a>
                      <span className="text-border">•</span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <GitBranch className="w-2.5 h-2.5 shrink-0" />
                        {p.githubDefaultBranch}
                      </span>
                    </div>

                    {/* Daemon Heartbeat & Active Task Card */}
                    <div className="rounded-lg p-2.5 bg-secondary/50 border border-border/70 mb-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAuto ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                            }`}
                          />
                          {p.daemon.stateLabel}
                        </span>

                        {isAuto && (
                          <button
                            onClick={() => handleTriggerDaemon(p.id)}
                            disabled={isTickingThis}
                            className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                            title="Déclencher manuellement un cycle d'optimisation"
                          >
                            {isTickingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            <span>Cycle</span>
                          </button>
                        )}
                      </div>

                      {p.daemon.activeTask ? (
                        <div className="p-2 rounded-md bg-card border border-primary/20 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-primary truncate">
                              ⚔️ TÂCHE ACTIVE
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                              {p.daemon.activeTask.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground line-clamp-1">
                            {p.daemon.activeTask.title}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Backlog en attente :</span>
                          <span className="font-semibold text-foreground">{p.taskStats.backlog} tâche(s)</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar & Task Counters */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Avancement Tâches</span>
                        <span className="font-semibold text-foreground">
                          {p.taskStats.completionRate}% ({p.taskStats.completed}/{p.taskStats.total})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${p.taskStats.completionRate}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {p.taskStats.completed} terminées
                        </span>
                        {p.taskStats.inProgress > 0 && (
                          <span className="flex items-center gap-1 text-purple-400 font-semibold">
                            <Zap className="w-2.5 h-2.5" />
                            {p.taskStats.inProgress} en cours
                          </span>
                        )}
                        {p.taskStats.failed > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {p.taskStats.failed} échecs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Isolation & Sandboxes status */}
                    <div className="flex items-center justify-between py-2 border-t border-border/60 text-xs mb-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {p.isolation.activeWorktrees > 0
                            ? `${p.isolation.activeWorktrees} worktree(s) isolé(s)`
                            : "Bac à sable propre"}
                        </span>
                      </div>

                      {p.isolation.activeWorktrees > 0 && (
                        <button
                          onClick={() => handleCleanWorktrees(p.id)}
                          disabled={isCleaningThis}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Supprimer les dossiers de travail isolés et libérer la mémoire"
                        >
                          {isCleaningThis ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Purger</span>
                        </button>
                      )}
                    </div>

                    {/* Deployment preview row */}
                    {deploy && (
                      <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-secondary/30 mb-3 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              deploy.status === "RUNNING"
                                ? "bg-emerald-400"
                                : deploy.status === "BUILDING"
                                ? "bg-amber-400 animate-spin"
                                : "bg-red-400"
                            }`}
                          />
                          <span className="font-medium text-foreground">{deploy.status}</span>
                        </span>
                        {deploy.previewUrl && (
                          <a
                            href={deploy.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-[10px]"
                          >
                            <span>Ouvrir URL</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleSelectAndOpen(p.id)}
                        className="flex-1 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-colors text-center"
                      >
                        Ouvrir l&apos;espace
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add New Project Card */}
              <div className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors min-h-[220px]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Ajouter un Projet</h4>
                <p className="text-[11px] text-muted-foreground mt-1 mb-4 max-w-xs">
                  Intégrez un nouveau dépôt ou cadrez une application de zéro
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFramingGuide?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Cadrer IA
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCreateProject?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 border border-border transition-colors"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    Dépôt Git
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
