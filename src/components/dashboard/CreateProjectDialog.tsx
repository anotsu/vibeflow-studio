// ============================================================
// VibeFlow Studio — Create Project Dialog
// Supports:
//   1. "Lire le GitHub & Générer le projet" (pour projets en cours)
//   2. "Nouveau projet" (depuis zéro)
// ============================================================
"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  GitBranch,
  Cloud,
  Key,
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  Wand2,
  BookOpen,
  ListTodo,
  ArrowRight,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { GitHubAnalysisResult } from "@/lib/github-project-scanner";

interface CreateProjectDialogProps {
  onClose: () => void;
}

export function CreateProjectDialog({ onClose }: CreateProjectDialogProps) {
  const { createProject, fetchProjects } = useProjectStore();
  const { setSelectedProjectId, addNotification } = useUIStore();

  const [mode, setMode] = useState<"import_github" | "blank">("import_github");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<GitHubAnalysisResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    name: "",
    vibeDescription: "",
    githubRepo: "",
    githubDefaultBranch: "main",
    coolifyAppUuid: "",
    coolifyServerUrl: "",
    githubToken: "",
    anthropicApiKey: "",
    coolifyApiToken: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Trigger GitHub Reading & Analysis ──────────────────────
  const handleAnalyzeGithub = async () => {
    if (!form.githubRepo.trim()) {
      setAnalysisError("Veuillez renseigner un dépôt GitHub (ex: owner/repo ou URL)");
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/projects/analyze-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepo: form.githubRepo,
          token: form.githubToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'analyse du dépôt GitHub");
      }

      const analysis: GitHubAnalysisResult = data.analysis;
      setScannedData(analysis);

      // Pre-fill form fields with AI synthesized analysis
      setForm((prev) => ({
        ...prev,
        name: analysis.name || prev.name,
        vibeDescription: analysis.vibeDescription || prev.vibeDescription,
        githubRepo: analysis.githubRepo,
        githubDefaultBranch: analysis.defaultBranch || "main",
      }));

      addNotification({
        type: "success",
        title: "Dépôt GitHub analysé !",
        message: `${analysis.detectedStack.length} techno(s) détectée(s), ${analysis.milestones.length} jalons et ${analysis.initialTasks.length} tâches générées.`,
        autoDismissMs: 4000,
      });
    } catch (err: any) {
      setAnalysisError(err.message || "Erreur lors de la lecture du dépôt GitHub");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Submit Project Creation ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.vibeDescription || !form.githubRepo) return;

    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        vibeDescription: form.vibeDescription,
        githubRepo: form.githubRepo,
        githubDefaultBranch: form.githubDefaultBranch || undefined,
        coolifyAppUuid: form.coolifyAppUuid || undefined,
        coolifyServerUrl: form.coolifyServerUrl || undefined,
        githubToken: form.githubToken || undefined,
        anthropicApiKey: form.anthropicApiKey || undefined,
        coolifyApiToken: form.coolifyApiToken || undefined,
      };

      // If imported from GitHub, attach tailored milestones, toolbox, and tasks
      if (scannedData) {
        payload.milestones = scannedData.milestones;
        payload.toolboxItems = scannedData.toolboxItems;
        payload.initialTasks = scannedData.initialTasks;
        payload.welcomeMessage = scannedData.welcomeMessage;
      }

      const project = await createProject(payload);
      await fetchProjects();
      setSelectedProjectId(project.id);

      addNotification({
        type: "success",
        title: scannedData ? "Projet GitHub généré avec succès !" : "Projet créé",
        message: `"${project.name}" est prêt avec sa boîte à outils et sa roadmap synchronisée.`,
        autoDismissMs: 4000,
      });
      onClose();
    } catch (err) {
      addNotification({
        type: "error",
        title: "Erreur",
        message:
          err instanceof Error ? err.message : "Impossible de créer le projet",
        autoDismissMs: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Ajouter un Projet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-2 bg-secondary/30 border-b border-border gap-2">
          <button
            type="button"
            onClick={() => setMode("import_github")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              mode === "import_github"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>Lire GitHub & Générer (Projet en cours)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("blank")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              mode === "blank"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouveau projet (Depuis zéro)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* MODE 1 : IMPORT & ANALYZE GITHUB */}
          {mode === "import_github" && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg border border-border/80 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                  Auto-génération depuis votre code existant
                </span>
                VibeFlow Studio lit votre <strong>README.md</strong>, inspecte vos dépendances (<strong>package.json</strong>, Docker, etc.), extrait vos issues ouvertes et génère automatiquement la <strong>feuille de route</strong>, la <strong>boîte à outils</strong> et les <strong>tâches Kanban</strong>.
              </div>

              {/* GitHub Repo Input + Analyze Button */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  <GitBranch className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  Dépôt GitHub existant *{" "}
                  <span className="text-muted-foreground font-normal">(owner/repo ou URL complète)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.githubRepo}
                    onChange={(e) => updateField("githubRepo", e.target.value)}
                    placeholder="ex: anotsu/vibeflow-studio ou https://github.com/..."
                    className="flex-1 bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleAnalyzeGithub}
                    disabled={analyzing || !form.githubRepo.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-md text-xs font-medium transition-colors disabled:opacity-40 shrink-0"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Analyse...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-primary" />
                        <span>Lire le GitHub</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {analysisError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Scanned Results Preview Card */}
              {scannedData && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Dépôt analysé et prêt à être généré
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Branche : {scannedData.defaultBranch}
                    </span>
                  </div>

                  {/* Detected Stack Badges */}
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1.5 font-medium">
                      Technologies & Stack détectées :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scannedData.detectedStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-secondary rounded-full border border-border/80 text-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Generated stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <PackageCheck className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{scannedData.toolboxItems.length} outils (boîte)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>{scannedData.milestones.length} jalons adaptés</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ListTodo className="w-3.5 h-3.5 text-green-400" />
                      <span>{scannedData.initialTasks.length} tâches auto</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Name & Description (pre-filled by scan) */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nom du projet *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder={scannedData?.name || "Nom du projet"}
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
                  Description / Vibe du projet *
                </label>
                <textarea
                  value={form.vibeDescription}
                  onChange={(e) => updateField("vibeDescription", e.target.value)}
                  placeholder="Décrivez l'objectif ou laissez l'IA synthétiser d'après le README..."
                  rows={3}
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  required
                />
              </div>
            </div>
          )}

          {/* MODE 2 : BLANK PROJECT FROM SCRATCH */}
          {mode === "blank" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nom du projet *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Mon Super Projet"
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
                  Décrivez votre vibe *
                </label>
                <textarea
                  value={form.vibeDescription}
                  onChange={(e) => updateField("vibeDescription", e.target.value)}
                  placeholder="Je veux créer une app SaaS avec Stripe, authentification et déploiement Coolify..."
                  rows={4}
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  <GitBranch className="w-3 h-3 inline mr-1" />
                  Dépôt GitHub * <span className="text-muted-foreground font-normal">(owner/repo)</span>
                </label>
                <input
                  type="text"
                  value={form.githubRepo}
                  onChange={(e) => updateField("githubRepo", e.target.value)}
                  placeholder="monuser/mon-projet"
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Configuration avancée (Branche, Coolify, Token privé)
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  Branche par défaut
                </label>
                <input
                  type="text"
                  value={form.githubDefaultBranch}
                  onChange={(e) => updateField("githubDefaultBranch", e.target.value)}
                  placeholder="main"
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    URL Coolify
                  </label>
                  <input
                    type="url"
                    value={form.coolifyServerUrl}
                    onChange={(e) => updateField("coolifyServerUrl", e.target.value)}
                    placeholder="https://coolify.mondomaine.com"
                    className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    UUID App Coolify
                  </label>
                  <input
                    type="text"
                    value={form.coolifyAppUuid}
                    onChange={(e) => updateField("coolifyAppUuid", e.target.value)}
                    placeholder="uuid-coolify"
                    className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  Token GitHub personnel (si dépôt privé spécifique)
                </label>
                <input
                  type="password"
                  value={form.githubToken}
                  onChange={(e) => updateField("githubToken", e.target.value)}
                  placeholder="ghp_... (utilise le token global par défaut si vide)"
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !form.name ||
                !form.vibeDescription ||
                !form.githubRepo
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {scannedData ? "Générer le projet depuis GitHub" : "Créer le projet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
