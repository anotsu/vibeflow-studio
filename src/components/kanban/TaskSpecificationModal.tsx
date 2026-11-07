// ============================================================
// VibeFlow Studio — Task Specification & BDD Gherkin Modal
// Phase 7.1 : Interactive Specification Preview with 1-Click Duel Launch
// ============================================================
"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  CheckCircle2,
  Rocket,
  Bot,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Code2,
  BookOpen,
  Sliders,
  Play,
  Check,
} from "lucide-react";
import type { TaskWithRelations } from "@/types";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface TaskSpecificationModalProps {
  task: TaskWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchDuel: (taskId: string) => void;
}

export function TaskSpecificationModal({
  task,
  isOpen,
  onClose,
  onLaunchDuel,
}: TaskSpecificationModalProps) {
  const [activeTab, setActiveTab] = useState<"gherkin" | "criteria" | "guardrails">("gherkin");
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});

  if (!isOpen || !task) return null;

  // Generate deterministic BDD Gherkin spec based on task info
  const featureName = task.title;
  const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const gherkinContent = `Feature: ${featureName}
  En tant qu'utilisateur de VibeFlow Platform
  Je souhaite bénéficier de : ${task.description}
  Afin de garantir une vélocité maximale sans compromettre la stabilité de production.

  Scenario: Exécution nominale et validation des fonctionnalités
    Given le système est déployé sur le conteneur Coolify avec base de données accessible
    When l'utilisateur déclenche l'action associée à "${task.title.slice(0, 32)}"
    Then le système renvoie un statut HTTP 200 avec payload JSON valide
    And les composants React sont rendus avec un framerate constant de 60fps
    And aucune erreur d'hydratation (hydration mismatch) n'apparaît dans la console

  Scenario: Gestion des erreurs et résilience aux pannes
    Given une indisponibilité momentanée des services dépendants
    When une requête est envoyée avec des paramètres erronés
    Then le système renvoie un message d'erreur explicite sans faire crasher l'application
    And l'événement est consigné dans le journal d'audit de sécurité`;

  const acceptanceCriteria = [
    "Architecture 100% sans mock conforme au schéma Prisma et migrations automatiques.",
    "Composants React 19 typés TypeScript strict (`npx tsc --noEmit` avec 0 erreur).",
    "Conformité accessibilité WCAG 2.1 AA (contrastes textuels >= 4.5:1, touch targets >= 44px).",
    "Score Core Web Vitals : LCP < 1.8s, CLS < 0.05, TTFB < 80ms.",
    "Isolation complète dans les Git Worktrees `/tmp/vibeflow-worktrees/` respectifs.",
  ];

  const guardrails = [
    { title: "Zéro Perte de Données", desc: "Transactions ACID sur PostgreSQL et rollback automatique en cas d'échec." },
    { title: "Budget Jetons 0€ (Pro-First)", desc: "Exécution exclusive via sessions CLI officielles Claude Pro et Antigravity Pro." },
    { title: "Audit Trail Systématique", desc: "Traçabilité de chaque action sensible dans la table AuditLog." },
    { title: "Auto-Healing Immédiat", desc: "Détection IA des erreurs de build Coolify et génération d'un patch de correction automatique." },
  ];

  const toggleCriteria = (idx: number) => {
    setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <VibeFlowLogo size="sm" showText={false} withGlow />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Spécification BDD &amp; Cadrage Tâche
                </h2>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  {task.status}
                </span>
                <span className="text-[10px] font-mono bg-secondary text-foreground border border-border px-2 py-0.5 rounded-full font-bold">
                  {task.priority}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 py-2.5 border-b border-border/80 bg-secondary/30 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("gherkin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "gherkin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Spécification Gherkin (BDD)</span>
          </button>
          <button
            onClick={() => setActiveTab("criteria")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "criteria"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Critères d&apos;Acceptation ({acceptanceCriteria.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("guardrails")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "guardrails"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Garde-fous Techniques</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: GHERKIN BDD */}
          {activeTab === "gherkin" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-mono">
                  <FileText className="w-3.5 h-3.5 text-primary" /> specs/{slug}.feature
                </span>
                <span className="text-[11px] bg-secondary px-2 py-0.5 rounded border border-border">
                  Cucumber / Playwright Compatible
                </span>
              </div>
              <div className="p-4 rounded-xl bg-black/60 border border-border font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner">
                {gherkinContent}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ce cahier des charges Gherkin est injecté dans les contextes de Claude Code et Antigravity CLI pour orienter la conception et les assertions E2E.
              </p>
            </div>
          )}

          {/* TAB 2: ACCEPTANCE CRITERIA */}
          {activeTab === "criteria" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Checklist de Validation par les Agents &amp; le Juge IA
              </h4>
              <div className="space-y-2">
                {acceptanceCriteria.map((crit, idx) => {
                  const isChecked = Boolean(checkedCriteria[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleCriteria(idx)}
                      className="p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                          isChecked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-muted-foreground/40 bg-card"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span className={`text-xs ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {crit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: GUARDRAILS */}
          {activeTab === "guardrails" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guardrails.map((g, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                  <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" /> {g.title}
                  </h5>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Origine :</span>
            <span className="font-semibold text-foreground uppercase">{task.origin}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                onClose();
                onLaunchDuel(task.id);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground text-xs font-bold transition-all shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Valider &amp; Lancer le Duel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
