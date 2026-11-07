// ============================================================
// VibeFlow Studio — Toolbox (Boîte à Outils Intelligente)
// Interactive Gap Analysis, 1-Click Code Generator & Custom Tools
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Terminal,
  Plus,
  Database,
  Shield,
  CreditCard,
  Palette,
  Globe,
  Activity,
  GitBranch,
  Server,
  TestTube,
  Lock,
  Puzzle,
  Search,
  Copy,
  Check,
  Code2,
  X,
  Sparkles,
  FileText,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { ToolboxItem } from "@prisma/client";

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  FRAMEWORK: {
    icon: <Package className="w-4 h-4" />,
    label: "Framework",
    color: "text-blue-400",
  },
  DATABASE: {
    icon: <Database className="w-4 h-4" />,
    label: "Base de données",
    color: "text-green-400",
  },
  AUTH: {
    icon: <Shield className="w-4 h-4" />,
    label: "Authentification",
    color: "text-purple-400",
  },
  PAYMENT: {
    icon: <CreditCard className="w-4 h-4" />,
    label: "Paiement",
    color: "text-yellow-400",
  },
  UI_KIT: {
    icon: <Palette className="w-4 h-4" />,
    label: "UI Kit",
    color: "text-pink-400",
  },
  API: {
    icon: <Globe className="w-4 h-4" />,
    label: "API",
    color: "text-cyan-400",
  },
  MONITORING: {
    icon: <Activity className="w-4 h-4" />,
    label: "Monitoring",
    color: "text-orange-400",
  },
  CI_CD: {
    icon: <GitBranch className="w-4 h-4" />,
    label: "CI/CD",
    color: "text-indigo-400",
  },
  HOSTING: {
    icon: <Server className="w-4 h-4" />,
    label: "Hosting",
    color: "text-teal-400",
  },
  TESTING: {
    icon: <TestTube className="w-4 h-4" />,
    label: "Tests",
    color: "text-lime-400",
  },
  SECURITY: {
    icon: <Lock className="w-4 h-4" />,
    label: "Sécurité",
    color: "text-red-400",
  },
  OTHER: {
    icon: <Puzzle className="w-4 h-4" />,
    label: "Autre",
    color: "text-muted-foreground",
  },
};

export function Toolbox() {
  const {
    toolboxItems,
    toolboxLoading,
    selectedProject,
    fetchToolbox,
    triggerToolboxScan,
    createTask,
  } = useProjectStore();
  const {
    addNotification,
    setActiveWorkspaceTab,
    setCliPanelOpen,
    setActiveCliTab,
  } = useUIStore();

  const [selectedSnippetItem, setSelectedSnippetItem] = useState<ToolboxItem | null>(null);
  const [snippetLoading, setSnippetLoading] = useState(false);
  const [snippetCode, setSnippetCode] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newToolName, setNewToolName] = useState("");
  const [newToolCategory, setNewToolCategory] = useState("API");
  const [newToolStatus, setNewToolStatus] = useState<"MISSING" | "ACQUIRED">("MISSING");
  const [newToolDescription, setNewToolDescription] = useState("");
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);

  const handleGenerateDocs = async () => {
    if (!selectedProject) return;
    setGeneratingDocs(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/generate-docs`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        addNotification({
          type: "success",
          title: "Architecture & OpenAPI Synchronisés",
          message: `${data.result.endpointsCount} routes et diagrammes Mermaid publiés dans Obsidian !`,
          autoDismissMs: 4000,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Documentation",
        message: err.message || "Impossible de générer la documentation.",
        autoDismissMs: 3500,
      });
    } finally {
      setGeneratingDocs(false);
    }
  };

  const [isExportingModule, setIsExportingModule] = useState(false);

  const handleExportModule = async (item: ToolboxItem) => {
    setIsExportingModule(true);
    try {
      const res = await fetch(`/api/toolbox/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_module" }),
      });
      const data = await res.json();
      if (res.ok) {
        addNotification({
          type: "success",
          title: "Brique Exportée avec Succès !",
          message: data.message || `Module ${item.name} synchronisé dans Obsidian (08_Toolbox_Templates/).`,
          autoDismissMs: 4000,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Export",
        message: err.message,
        autoDismissMs: 3500,
      });
    } finally {
      setIsExportingModule(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchToolbox(selectedProject.id);
    }
  }, [selectedProject, fetchToolbox]);

  const safeItems = Array.isArray(toolboxItems) ? toolboxItems : [];
  const acquired = safeItems.filter((item) => item.status === "ACQUIRED");
  const missing = safeItems.filter((item) => item.status === "MISSING");
  const inProgress = safeItems.filter(
    (item) => item.status === "IN_PROGRESS"
  );

  const handleScan = () => {
    if (selectedProject) {
      triggerToolboxScan(selectedProject.id);
    }
  };

  const handleInstallViaCli = (item: ToolboxItem) => {
    setActiveCliTab("bash");
    setCliPanelOpen(true);
    addNotification({
      type: "info",
      title: `Installation de ${item.name}`,
      message: `Terminal ouvert. Commande suggérée : npm install ${item.name.toLowerCase().replace(/[^a-z0-9-]/g, "")}`,
      autoDismissMs: 5000,
    });
  };

  const handleCreateTask = async (item: ToolboxItem) => {
    if (!selectedProject) return;
    try {
      const task = await createTask({
        projectId: selectedProject.id,
        title: `Intégration & Configuration : ${item.name}`,
        description: `Installer, configurer les variables d'environnement et valider les routes pour ${item.name} (${item.description || item.category}).`,
        priority: "HIGH",
        origin: "USER",
      });

      // Update toolbox item status to IN_PROGRESS
      await fetch(`/api/toolbox/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }).catch(() => {});

      addNotification({
        type: "success",
        title: "Tâche créée !",
        message: `Tâche "${task.title}" ajoutée au Kanban. Les agents peuvent maintenant démarrer le duel.`,
        autoDismissMs: 4000,
      });

      // Refresh toolbox & switch to kanban tab
      await fetchToolbox(selectedProject.id);
      setActiveWorkspaceTab("kanban");
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: err.message || "Impossible de créer la tâche",
        autoDismissMs: 4000,
      });
    }
  };

  const handleOpenSnippet = async (item: ToolboxItem) => {
    setSelectedSnippetItem(item);
    setCopiedSnippet(false);

    if (item.snippetCode && item.snippetCode.length > 30) {
      setSnippetCode(item.snippetCode);
      return;
    }

    setSnippetLoading(true);
    setSnippetCode(null);
    try {
      const res = await fetch(`/api/toolbox/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_snippet" }),
      });
      const data = await res.json();
      if (data.snippetCode) {
        setSnippetCode(data.snippetCode);
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de générer le snippet de code.",
        autoDismissMs: 3000,
      });
    } finally {
      setSnippetLoading(false);
    }
  };

  const handleMarkAcquired = async (item: ToolboxItem) => {
    if (!selectedProject) return;
    try {
      await fetch(`/api/toolbox/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACQUIRED" }),
      });
      addNotification({
        type: "success",
        title: "Outil validé",
        message: `${item.name} a été déplacé dans les outils acquis.`,
        autoDismissMs: 3000,
      });
      setSelectedSnippetItem(null);
      await fetchToolbox(selectedProject.id);
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de mettre à jour l'outil.",
        autoDismissMs: 3000,
      });
    }
  };

  const handleAddCustomTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newToolName.trim()) return;
    setIsAddingTool(true);
    try {
      const res = await fetch("/api/toolbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          name: newToolName.trim(),
          category: newToolCategory,
          status: newToolStatus,
          description: newToolDescription.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erreur création d'outil");
      addNotification({
        type: "success",
        title: "Outil ajouté",
        message: `${newToolName} a été ajouté à la boîte à outils.`,
        autoDismissMs: 3500,
      });
      setShowAddModal(false);
      setNewToolName("");
      setNewToolDescription("");
      await fetchToolbox(selectedProject.id);
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: err.message || "Impossible d'ajouter l'outil.",
        autoDismissMs: 3500,
      });
    } finally {
      setIsAddingTool(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Boîte à Outils</h2>
          <span className="text-xs text-muted-foreground">
            {acquired.length} acquis · {missing.length} manquants
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un outil</span>
          </button>
          <button
            onClick={handleScan}
            disabled={toolboxLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors disabled:opacity-50"
          >
            {toolboxLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Scanner le projet
          </button>
          <button
            onClick={handleGenerateDocs}
            disabled={generatingDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-md transition-colors disabled:opacity-50"
            title="Générer les spécifications OpenAPI et diagrammes Mermaid d'architecture vers Obsidian"
          >
            {generatingDocs ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="hidden sm:inline">Docs & OpenAPI</span>
          </button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acquired Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-green-400">
              Ce que nous avons
            </h3>
            <span className="text-xs text-muted-foreground bg-green-400/10 px-1.5 py-0.5 rounded-full">
              {acquired.length}
            </span>
          </div>

          <div className="space-y-2">
            {acquired.map((item) => (
              <ToolboxCard
                key={item.id}
                item={item}
                onOpenSnippet={handleOpenSnippet}
              />
            ))}

            {acquired.length === 0 && (
              <EmptyState
                message="Aucun outil détecté"
                sub="Lancez un scan pour analyser le projet."
              />
            )}
          </div>

          {/* In Progress */}
          {inProgress.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <h3 className="text-sm font-semibold text-primary">
                  En cours d&apos;installation
                </h3>
              </div>
              <div className="space-y-2">
                {inProgress.map((item) => (
                  <ToolboxCard
                    key={item.id}
                    item={item}
                    onOpenSnippet={handleOpenSnippet}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Missing Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">
              Ce qu&apos;il nous manque
            </h3>
            <span className="text-xs text-muted-foreground bg-warning/10 px-1.5 py-0.5 rounded-full">
              {missing.length}
            </span>
          </div>

          <div className="space-y-2">
            {missing.map((item) => (
              <ToolboxCard
                key={item.id}
                item={item}
                showActions
                onInstallViaCli={handleInstallViaCli}
                onCreateAgentTask={handleCreateTask}
                onOpenSnippet={handleOpenSnippet}
              />
            ))}

            {missing.length === 0 && (
              <EmptyState
                message="Rien ne manque !"
                sub="Tous les outils nécessaires sont en place."
                success
              />
            )}
          </div>
        </div>
      </div>

      {/* Snippet / Code Generator Modal */}
      {selectedSnippetItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Configuration de Référence : {selectedSnippetItem.name}
                </span>
                <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                  {selectedSnippetItem.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedSnippetItem(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#09090b]">
              {snippetLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Génération du code TypeScript optimisé par les agents en cours...
                  </p>
                </div>
              ) : snippetCode ? (
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-black/60 border border-border/40 font-mono text-[11px] leading-5 text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                    {snippetCode}
                  </pre>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Aucun code disponible pour cet outil.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-border bg-card/60 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Généré via Claude &amp; Antigravity pour Next.js 15
              </span>
              <div className="flex items-center gap-2">
                {snippetCode && (
                  <>
                    <button
                      onClick={() => handleExportModule(selectedSnippetItem)}
                      disabled={isExportingModule}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors disabled:opacity-50"
                      title="Sauvegarder ce module consensuel dans Obsidian (08_Toolbox_Templates) pour réutilisation 1-clic (Phase 8.1)"
                    >
                      {isExportingModule ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{isExportingModule ? "Export..." : "Exporter Brique"}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(snippetCode);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      {copiedSnippet ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedSnippet ? "Copié !" : "Copier le code"}</span>
                    </button>
                  </>
                )}

                {selectedSnippetItem.status === "MISSING" && (
                  <button
                    onClick={() => handleMarkAcquired(selectedSnippetItem)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marquer comme Acquis</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Ajouter un outil</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomTool} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nom de l&apos;outil ou service
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Stripe, Sentry, Resend, Supabase"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newToolCategory}
                    onChange={(e) => setNewToolCategory(e.target.value)}
                    className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Statut initial
                  </label>
                  <select
                    value={newToolStatus}
                    onChange={(e) => setNewToolStatus(e.target.value as "MISSING" | "ACQUIRED")}
                    className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="MISSING">Ce qu&apos;il nous manque</option>
                    <option value="ACQUIRED">Ce que nous avons</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description / Rôle (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Gestion des paiements et abonnements Stripe"
                  value={newToolDescription}
                  onChange={(e) => setNewToolDescription(e.target.value)}
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAddingTool || !newToolName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
                >
                  {isAddingTool ? "Ajout..." : "Ajouter à la boîte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toolbox Card ───────────────────────────────────────────

function ToolboxCard({
  item,
  showActions = false,
  onInstallViaCli,
  onCreateAgentTask,
  onOpenSnippet,
}: {
  item: ToolboxItem;
  showActions?: boolean;
  onInstallViaCli?: (item: ToolboxItem) => void;
  onCreateAgentTask?: (item: ToolboxItem) => void;
  onOpenSnippet?: (item: ToolboxItem) => void;
}) {
  const category = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.OTHER;

  return (
    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors">
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div
          className={`mt-0.5 p-1.5 rounded-md bg-secondary ${category.color}`}
        >
          {category.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{item.name}</span>
            {item.version && (
              <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1 py-0.5 rounded">
                v{item.version}
              </span>
            )}
            {item.status === "ACQUIRED" && (
              <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
            )}
            {item.status === "IN_PROGRESS" && (
              <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`text-[10px] font-medium ${category.color} bg-secondary px-1.5 py-0.5 rounded`}
            >
              {category.label}
            </span>
            {item.sourceFile && (
              <span className="text-[10px] text-muted-foreground font-mono">
                📄 {item.sourceFile}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border flex-wrap">
        {showActions && item.status === "MISSING" && (
          <>
            <button
              onClick={() => onOpenSnippet?.(item)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md transition-colors"
              title="Générer ou consulter le code de configuration TypeScript"
            >
              <Code2 className="w-3 h-3" />
              Code d&apos;intégration
            </button>
            <button
              onClick={() => onInstallViaCli?.(item)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              Installer via CloudCLI
            </button>
            <button
              onClick={() => onCreateAgentTask?.(item)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-secondary text-muted-foreground hover:text-foreground rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" />
              Créer tâche duel
            </button>
          </>
        )}

        {item.status === "ACQUIRED" && onOpenSnippet && (
          <button
            onClick={() => onOpenSnippet(item)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            <Code2 className="w-3 h-3 text-primary" />
            <span>Voir code de référence</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState({
  message,
  sub,
  success = false,
}: {
  message: string;
  sub: string;
  success?: boolean;
}) {
  return (
    <div className="text-center py-8 bg-card/50 rounded-lg border border-dashed border-border">
      {success ? (
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400/40" />
      ) : (
        <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
      )}
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>
    </div>
  );
}
