// ============================================================
// VibeFlow Studio — Daemon 24/7 Master Controller Modal
// Autonomy settings, tick frequency, task safety caps & manual trigger
// ============================================================
"use client";

import React, { useState } from "react";
import {
  X,
  Zap,
  Play,
  Loader2,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Sparkles,
  Bot,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";

interface DaemonControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DaemonControllerModal({ isOpen, onClose }: DaemonControllerModalProps) {
  const { selectedProject, toggleMode, fetchProjects } = useProjectStore();
  const { addNotification } = useUIStore();

  const [tickIntervalMinutes, setTickIntervalMinutes] = useState(15);
  const [maxTasksWithoutApproval, setMaxTasksWithoutApproval] = useState(3);
  const [requireHumanSynthesisMerge, setRequireHumanSynthesisMerge] = useState(true);
  const [autoHealOnCoolifyFailure, setAutoHealOnCoolifyFailure] = useState(true);
  const [isTicking, setIsTicking] = useState(false);

  if (!isOpen || !selectedProject) return null;

  const isAuto = selectedProject.mode === "AUTO";

  const handleToggleAuto = async () => {
    try {
      await toggleMode(selectedProject.id);
      addNotification({
        type: "success",
        title: isAuto ? "Mode Accompagné activé" : "Mode Autonome 24/7 activé",
        message: isAuto
          ? "Les agents attendent désormais une validation humaine à chaque étape."
          : "Les agents Claude et Antigravity optimisent désormais le backlog en continu.",
        autoDismissMs: 4000,
      });
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de modifier le mode du projet.",
        autoDismissMs: 3000,
      });
    }
  };

  const handleManualTick = async () => {
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
        title: "Cycle Autonome Exécuté !",
        message: data.message || "Analyse et traitement du backlog achevés.",
        autoDismissMs: 4000,
      });
      await fetchProjects();
    } catch {
      addNotification({
        type: "error",
        title: "Erreur Daemon",
        message: "Échec du déclenchement du tick autonome.",
        autoDismissMs: 3000,
      });
    } finally {
      setIsTicking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Contrôleur Maître Daemon 24/7</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isAuto
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  {isAuto ? "ACTIF (24/7)" : "ACCOMPAGNÉ"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Gouvernance, cadencement et barrières de sécurité pour l&apos;autonomie des agents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Master Switch Banner */}
          <div
            className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
              isAuto
                ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                : "bg-secondary/40 border-border"
            }`}
          >
            <div>
              <span className="text-xs font-bold text-foreground block">
                🤖 Interrupteur Maître : Mode Autonome 24/7
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAuto
                  ? "Les agents parcourent le backlog, exécutent le duel et préparent les synthèses en tâche de fond."
                  : "Le mode autonome est désactivé. Chaque tâche nécessite un déclenchement manuel."}
              </p>
            </div>

            <button
              onClick={handleToggleAuto}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 ${
                isAuto
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
              }`}
            >
              <span>{isAuto ? "Désactiver" : "Activer 24/7"}</span>
            </button>
          </div>

          {/* Safety Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" /> Paramètres d&apos;Autonomie &amp; Sécurité
            </h4>

            {/* Cadence */}
            <div className="bg-secondary/30 p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Fréquence des Cycles (Heartbeat)
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Périodicité d&apos;analyse du backlog et détection de dette technique
                </span>
              </div>
              <select
                value={tickIntervalMinutes}
                onChange={(e) => setTickIntervalMinutes(Number(e.target.value))}
                className="bg-card text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
              >
                <option value={5}>Toutes les 5 min</option>
                <option value={15}>Toutes les 15 min</option>
                <option value={30}>Toutes les 30 min</option>
                <option value={60}>Toutes les heures</option>
              </select>
            </div>

            {/* Max Tasks Without Approval */}
            <div className="bg-secondary/30 p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Limite de Tâches sans Validation
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Nombre max de tâches complétées consécutivement avant pause de sécurité
                </span>
              </div>
              <select
                value={maxTasksWithoutApproval}
                onChange={(e) => setMaxTasksWithoutApproval(Number(e.target.value))}
                className="bg-card text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
              >
                <option value={1}>1 tâche max</option>
                <option value={3}>3 tâches max</option>
                <option value={5}>5 tâches max</option>
                <option value={999}>Illimité (Autonomie Pure)</option>
              </select>
            </div>

            {/* Require Human Merge */}
            <div className="bg-secondary/30 p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Validation Humaine de la Synthèse
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Exiger un clic humain pour merge sur main (empêche les fusions silencieuses)
                </span>
              </div>
              <input
                type="checkbox"
                checked={requireHumanSynthesisMerge}
                onChange={(e) => setRequireHumanSynthesisMerge(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Auto-Heal */}
            <div className="bg-secondary/30 p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Auto-Guérison Coolify Webhook
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Patch automatique et relance de build si le conteneur Coolify échoue
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoHealOnCoolifyFailure}
                onChange={(e) => setAutoHealOnCoolifyFailure(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Manual Trigger */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-foreground block">
                ⚡ Déclencheur Manuel Immédiat
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Force l&apos;exécution d&apos;un cycle maintenant sans attendre la période du heartbeat
              </span>
            </div>

            <button
              onClick={handleManualTick}
              disabled={isTicking}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
            >
              {isTicking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isTicking ? "Cycle en cours..." : "Exécuter un Cycle"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[10px]">
            Projet: #{selectedProject.id.slice(0, 8)} ({selectedProject.name})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
