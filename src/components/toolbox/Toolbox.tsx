// ============================================================
// VibeFlow Studio — Toolbox (Boîte à Outils Intelligente)
// ============================================================
"use client";

import React, { useEffect } from "react";
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
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
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
  } = useProjectStore();

  useEffect(() => {
    if (selectedProject) {
      fetchToolbox(selectedProject.id);
    }
  }, [selectedProject, fetchToolbox]);

  const acquired = toolboxItems.filter((item) => item.status === "ACQUIRED");
  const missing = toolboxItems.filter((item) => item.status === "MISSING");
  const inProgress = toolboxItems.filter(
    (item) => item.status === "IN_PROGRESS"
  );

  const handleScan = () => {
    if (selectedProject) {
      triggerToolboxScan(selectedProject.id);
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
              <ToolboxCard key={item.id} item={item} />
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
                  <ToolboxCard key={item.id} item={item} />
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
              <ToolboxCard key={item.id} item={item} showActions />
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
    </div>
  );
}

// ─── Toolbox Card ───────────────────────────────────────────

function ToolboxCard({
  item,
  showActions = false,
}: {
  item: ToolboxItem;
  showActions?: boolean;
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

      {/* Action Buttons (for missing items) */}
      {showActions && item.status === "MISSING" && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
          <button className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors">
            <Download className="w-3 h-3" />
            Installer via CloudCLI
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-secondary text-muted-foreground hover:text-foreground rounded-md transition-colors">
            <Plus className="w-3 h-3" />
            Créer une tâche agent
          </button>
        </div>
      )}
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
