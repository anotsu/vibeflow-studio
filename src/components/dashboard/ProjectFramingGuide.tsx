// ============================================================
// VibeFlow Studio — Project Framing & Blueprint Guide
// Interactive Step-by-Step Wizard to Scaffolding Projects Before Vibe Coding
// Integrates with Obsidian Vault and Prepares Backlog & Milestones
// ============================================================
"use client";

import React, { useState } from "react";
import {
  Compass,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Database,
  ShieldCheck,
  CreditCard,
  Palette,
  Cloud,
  BookOpen,
  Loader2,
  X,
  FileText,
  Check,
  GitBranch,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";

interface ProjectFramingGuideProps {
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export function ProjectFramingGuide({ onClose, onProjectCreated }: ProjectFramingGuideProps) {
  const { createProject, fetchProjects } = useProjectStore();
  const { setSelectedProjectId, addNotification } = useUIStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    pitch: "",
    problemAndTarget: "",
    coreFeature: "",
    githubRepo: "",
    frontend: "Next.js 15 App Router (React 19)",
    database: "PostgreSQL avec Prisma ORM",
    auth: "NextAuth.js v5 (Sessions JWT)",
    payment: "Stripe Checkout & Webhooks",
    styling: "Tailwind CSS (Thème Sombre Cyberpunk)",
    hosting: "VPS Coolify (Docker multi-stage)",
    entities: "User, Workspace, Task, Subscription, AuditLog",
    agentRules:
      "Typage strict TypeScript (zéro any), isolation Git Worktree, fluidité 60fps et architecture Zéro-Mock.",
  });

  // Generated Blueprint State
  const [blueprintResult, setBlueprintResult] = useState<any>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Quick stack presets
  const stackOptions = {
    frontend: [
      "Next.js 15 App Router (React 19)",
      "Vite React 19 (SPA)",
      "SvelteKit 2",
      "Nuxt 3 (Vue)",
    ],
    database: [
      "PostgreSQL avec Prisma ORM",
      "Supabase (PostgreSQL + RLS)",
      "SQLite / Drizzle ORM",
      "MongoDB / Mongoose",
    ],
    auth: [
      "NextAuth.js v5 (Sessions JWT)",
      "Clerk Authentication",
      "Supabase Auth",
      "Aucun / API Keys",
    ],
    payment: [
      "Stripe Checkout & Webhooks",
      "Lemon Squeezy",
      "Paddle",
      "Aucun (Application Gratuite)",
    ],
    styling: [
      "Tailwind CSS (Thème Sombre Cyberpunk)",
      "Shadcn UI + Radix Primitives",
      "Tailwind Minimaliste Clean",
      "CSS Modules épurés",
    ],
    hosting: [
      "VPS Coolify (Docker multi-stage)",
      "Vercel Cloud",
      "Railway",
      "Docker Standalone",
    ],
  };

  // Step 4 -> 5 : Trigger AI Blueprint Synthesis
  const handleGenerateBlueprint = async () => {
    if (!formData.name || !formData.pitch) {
      addNotification({
        type: "error",
        title: "Champs requis",
        message: "Veuillez renseigner le nom et le pitch de votre projet.",
        autoDismissMs: 3000,
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/projects/frame-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur de génération du cadrage");
      }

      const data = await res.json();
      setBlueprintResult(data);
      setStep(5);
      addNotification({
        type: "success",
        title: "Dossier de Cadrage Généré !",
        message: `Le Blueprint a été synchronisé dans Obsidian (${data.obsidianPath}).`,
        autoDismissMs: 5000,
      });
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Cadrage",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 5 : Create project in database with the generated blueprint
  const handleLaunchVibeCoding = async () => {
    setIsFinalizing(true);
    try {
      const repoName =
        formData.githubRepo.trim() ||
        `anotsu/${formData.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const payload = {
        name: formData.name,
        vibeDescription: `${formData.pitch}. Résout : ${formData.problemAndTarget}. Fonctionnalité clé : ${formData.coreFeature}`,
        githubRepo: repoName,
        githubDefaultBranch: "main",
        milestones: blueprintResult?.blueprint?.milestones,
        initialTasks: blueprintResult?.blueprint?.initialTasks,
        toolboxItems: blueprintResult?.blueprint?.toolboxItems,
      };

      const project = await createProject(payload);
      await fetchProjects();
      setSelectedProjectId(project.id);

      addNotification({
        type: "success",
        title: "🚀 Projet Prêt pour le Vibe Coding !",
        message: `"${project.name}" a été initialisé avec ${payload.initialTasks?.length || 4} tâches Kanban et 4 jalons.`,
        autoDismissMs: 5000,
      });

      if (onProjectCreated) onProjectCreated(project.id);
      onClose();
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Création",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary rounded-xl border border-primary/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Guide de Cadrage Pré-VibeCoding</span>
                <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                  Étape {step}/5
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Cadrez précisément la vision, l&apos;architecture et les règles avant de lancer les agents
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

        {/* Step Progress Bar */}
        <div className="px-6 py-2 bg-secondary/30 border-b border-border flex items-center justify-between text-xs">
          {[
            { s: 1, label: "Vision & Cible" },
            { s: 2, label: "Stack Technique" },
            { s: 3, label: "Modèle de Données" },
            { s: 4, label: "Règles des Agents" },
            { s: 5, label: "Synthèse & Lancement" },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex items-center gap-1.5 font-medium ${
                step === item.s
                  ? "text-primary font-bold"
                  : step > item.s
                  ? "text-emerald-400"
                  : "text-muted-foreground opacity-60"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                  step === item.s
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : step > item.s
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > item.s ? "✓" : item.s}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ── STEP 1 : VISION & CIBLE ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary leading-relaxed">
                <span className="font-bold block mb-0.5">🎯 Clarifier l&apos;Intention Produit</span>
                Un projet bien cadré commence par une proposition de valeur limpide. Ces informations
                alimenteront le prompt système de Claude Code et Antigravity.
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nom du Projet *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="ex: TaskFlow AI, HyperCRM, VibeCommerce..."
                  className="w-full bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pitch en 1 phrase (Le &quot;One-Liner&quot;) *
                </label>
                <input
                  type="text"
                  value={formData.pitch}
                  onChange={(e) => updateField("pitch", e.target.value)}
                  placeholder="ex: Plateforme SaaS d'automatisation des factures récurrentes pour développeurs indépendants"
                  className="w-full bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Cible & Problème Résolu
                  </label>
                  <textarea
                    rows={3}
                    value={formData.problemAndTarget}
                    onChange={(e) => updateField("problemAndTarget", e.target.value)}
                    placeholder="Pour qui ? Quel est le point de douleur critique résolu ?"
                    className="w-full bg-secondary text-foreground text-xs rounded-lg p-2.5 border border-border focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Fonctionnalité Reine (Killer Feature du MVP)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.coreFeature}
                    onChange={(e) => updateField("coreFeature", e.target.value)}
                    placeholder="La brique centrale qui apporte 80% de la valeur dès la v1"
                    className="w-full bg-secondary text-foreground text-xs rounded-lg p-2.5 border border-border focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  <GitBranch className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  Dépôt GitHub Cible (Optionnel, auto-généré si vide)
                </label>
                <input
                  type="text"
                  value={formData.githubRepo}
                  onChange={(e) => updateField("githubRepo", e.target.value)}
                  placeholder="ex: anotsu/mon-projet (laissez vide pour générer un repo par défaut)"
                  className="w-full bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2 : STACK TECHNIQUE ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 leading-relaxed">
                <span className="font-bold block mb-0.5">🛠️ Matrice Technique &amp; Choix d&apos;Architecture</span>
                Sélectionnez les briques technologiques qui formeront le socle du projet. Les agents
                respecteront strictement ces choix sans improviser de librairies tierces redondantes.
              </div>

              {/* Grid of selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Frontend */}
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Framework Frontend
                  </span>
                  <div className="space-y-1">
                    {stackOptions.frontend.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("frontend", opt)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between ${
                          formData.frontend === opt
                            ? "bg-card text-blue-400 border-blue-500/40 font-semibold shadow-sm"
                            : "text-muted-foreground border-transparent hover:bg-card/50"
                        }`}
                      >
                        <span>{opt}</span>
                        {formData.frontend === opt && <Check className="w-3 h-3 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Database */}
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" /> Base de Données &amp; ORM
                  </span>
                  <div className="space-y-1">
                    {stackOptions.database.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("database", opt)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between ${
                          formData.database === opt
                            ? "bg-card text-emerald-400 border-emerald-500/40 font-semibold shadow-sm"
                            : "text-muted-foreground border-transparent hover:bg-card/50"
                        }`}
                      >
                        <span>{opt}</span>
                        {formData.database === opt && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auth */}
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Authentification
                  </span>
                  <div className="space-y-1">
                    {stackOptions.auth.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("auth", opt)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between ${
                          formData.auth === opt
                            ? "bg-card text-purple-400 border-purple-500/40 font-semibold shadow-sm"
                            : "text-muted-foreground border-transparent hover:bg-card/50"
                        }`}
                      >
                        <span>{opt}</span>
                        {formData.auth === opt && <Check className="w-3 h-3 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Monétisation &amp; Paiement
                  </span>
                  <div className="space-y-1">
                    {stackOptions.payment.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("payment", opt)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between ${
                          formData.payment === opt
                            ? "bg-card text-amber-400 border-amber-500/40 font-semibold shadow-sm"
                            : "text-muted-foreground border-transparent hover:bg-card/50"
                        }`}
                      >
                        <span>{opt}</span>
                        {formData.payment === opt && <Check className="w-3 h-3 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Styling */}
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-400" /> Design System &amp; UI
                  </span>
                  <div className="space-y-1">
                    {stackOptions.styling.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("styling", opt)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between ${
                          formData.styling === opt
                            ? "bg-card text-pink-400 border-pink-500/40 font-semibold shadow-sm"
                            : "text-muted-foreground border-transparent hover:bg-card/50"
                        }`}
                      >
                        <span>{opt}</span>
                        {formData.styling === opt && <Check className="w-3 h-3 text-pink-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hosting */}
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-cyan-400" /> Hébergement Cible
                  </span>
                  <div className="space-y-1">
                    {stackOptions.hosting.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("hosting", opt)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between ${
                          formData.hosting === opt
                            ? "bg-card text-cyan-400 border-cyan-500/40 font-semibold shadow-sm"
                            : "text-muted-foreground border-transparent hover:bg-card/50"
                        }`}
                      >
                        <span>{opt}</span>
                        {formData.hosting === opt && <Check className="w-3 h-3 text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 : MODÉLISATION DE DONNÉES ─────────────────────── */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 leading-relaxed">
                <span className="font-bold block mb-0.5">🧱 Modélisation Conceptuelle &amp; Entités Clés</span>
                Définissez les tables et modèles principaux nécessaires à l&apos;application. Le Juge IA
                et Claude Code s&apos;appuieront sur cette liste pour générer le schéma Prisma initial.
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Entités Clés du Modèle de Données (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.entities}
                  onChange={(e) => updateField("entities", e.target.value)}
                  placeholder="ex: User, Organization, Subscription, Invoice, Product, Order..."
                  className="w-full bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              {/* Suggestions chips */}
              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground block">
                  Suggestions d&apos;entités courantes à ajouter en 1 clic :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Workspace",
                    "MemberRole",
                    "ApiKey",
                    "Notification",
                    "WebhookEndpoint",
                    "AuditTrail",
                    "PaymentTransaction",
                    "AttachmentFile",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (!formData.entities.includes(chip)) {
                          updateField(
                            "entities",
                            formData.entities ? `${formData.entities}, ${chip}` : chip
                          );
                        }
                      }}
                      className="px-2.5 py-1 rounded-md bg-secondary text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-card border border-border/60 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 : RÈGLES D'OR DES AGENTS ──────────────────────── */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 leading-relaxed">
                <span className="font-bold block mb-0.5">⚖️ Règles d&apos;Or &amp; Contraintes d&apos;Ingénierie</span>
                Définissez les exigences strictes qui s&apos;imposent à **Claude Code Pro** (Architecture &amp; Sécurité)
                et **Antigravity Pro** (UI &amp; Expérience).
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Directives Générales pour les Agents IA
                </label>
                <textarea
                  rows={4}
                  value={formData.agentRules}
                  onChange={(e) => updateField("agentRules", e.target.value)}
                  className="w-full bg-secondary text-foreground text-xs rounded-lg p-2.5 border border-border focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              {/* Preset rule pills */}
              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground block">
                  Exigences pré-configurées recommandées :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-claude/30 bg-claude-muted/20 text-claude">
                    <span className="font-bold block text-[11px]">Règle Claude Code :</span>
                    Typage strict Zod sur toutes les routes API &amp; zéro `any` en TypeScript.
                  </div>
                  <div className="p-2.5 rounded-lg border border-antigravity/30 bg-antigravity-muted/20 text-antigravity">
                    <span className="font-bold block text-[11px]">Règle Antigravity :</span>
                    Design 60fps, micro-animations Framer et contraste d&apos;accessibilité WCAG AA.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5 : SYNTHÈSE & LANCEMENT VIBECODING ──────────────── */}
          {step === 5 && blueprintResult && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Cadrage Validé &amp; Synchronisé dans Obsidian
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-400 block mt-0.5">
                      {blueprintResult.obsidianPath}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0 font-bold">
                  Prêt pour VibeCoding
                </span>
              </div>

              {/* Milestones and Tasks breakdown preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Milestones */}
                <div className="bg-secondary/40 border border-border/80 rounded-xl p-3.5 space-y-2">
                  <span className="font-bold text-foreground block">
                    📌 4 Jalons Structurés :
                  </span>
                  <div className="space-y-1.5">
                    {blueprintResult.blueprint?.milestones?.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px]">
                        <span className="w-4 h-4 rounded bg-primary/20 text-primary font-mono text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-foreground">{m.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks preview */}
                <div className="bg-secondary/40 border border-border/80 rounded-xl p-3.5 space-y-2">
                  <span className="font-bold text-foreground block">
                    📋 Tâches Initiales Prêtes :
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {blueprintResult.blueprint?.initialTasks?.map((t: any, idx: number) => (
                      <div key={idx} className="text-[11px] text-muted-foreground truncate">
                        • <span className="text-foreground font-medium">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Charter summary box */}
              <div className="bg-[#09090b] border border-border rounded-xl p-3 text-xs font-mono text-zinc-300 max-h-40 overflow-y-auto">
                <span className="text-muted-foreground block text-[10px] uppercase mb-1">
                  Aperçu du Dossier de Cadrage :
                </span>
                <p className="whitespace-pre-wrap">{blueprintResult.blueprint?.summary}</p>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-border bg-card/90 flex items-center justify-between">
          <div>
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleGenerateBlueprint}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isGenerating ? "Synthèse du Cadrage..." : "Générer le Blueprint"}</span>
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={handleLaunchVibeCoding}
                disabled={isFinalizing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold transition-all shadow-lg pulse-glow disabled:opacity-50"
              >
                {isFinalizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isFinalizing ? "Initialisation..." : "🚀 Lancer le VibeCoding"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
