// ============================================================
// VibeFlow Studio — CloudCLI Panel (Multi-tab Terminal)
// UX Refonte v2 — Bouton flottant élégant + Panel compact
// ============================================================
"use client";

import React, { useState } from "react";
import {
  Terminal,
  Bot,
  Rocket,
  Maximize2,
  Minimize2,
  X,
  Columns,
  Rows,
  ScrollText,
  Info,
  GitBranch,
  Cloud,
  PackageCheck,
  ChevronDown,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useProjectStore } from "@/stores/project-store";
import type { CliTab } from "@/types";
import { XtermTerminal } from "@/components/terminal/XtermTerminal";

interface CliTabConfig {
  id: CliTab;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const CLI_TABS: CliTabConfig[] = [
  {
    id: "bash",
    label: "Terminal",
    shortLabel: "Terminal",
    icon: <Terminal className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    description: "Shell Bash / Système",
  },
  {
    id: "claude",
    label: "Claude",
    shortLabel: "Claude",
    icon: <Bot className="w-3.5 h-3.5" />,
    color: "text-claude",
    description: "Session Claude CLI",
  },
  {
    id: "antigravity",
    label: "Antigravity",
    shortLabel: "AGY",
    icon: <Rocket className="w-3.5 h-3.5" />,
    color: "text-antigravity",
    description: "Session Antigravity CLI",
  },
  {
    id: "coolify-logs",
    label: "Logs Déploiement",
    shortLabel: "Logs",
    icon: <ScrollText className="w-3.5 h-3.5" />,
    color: "text-amber-400",
    description: "Flux de logs Coolify en direct",
  },
];

export function CloudCLI() {
  const {
    cliPanelOpen,
    activeCliTab,
    cliPanelPosition,
    cliPanelMaximized,
    setActiveCliTab,
    toggleCliPanel,
    setCliPanelPosition,
    toggleCliPanelMaximized,
    addNotification,
  } = useUIStore();

  const { selectedProject, toolboxItems, deployments } = useProjectStore();
  const [showContextBar, setShowContextBar] = useState(false);

  // ── Floating Button (panel closed) ────────────────────────
  if (!cliPanelOpen) {
    return (
      <button
        onClick={toggleCliPanel}
        className="fixed bottom-5 right-5 flex items-center gap-2 px-3.5 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/30 transition-all z-50 group"
        title="Ouvrir le terminal CloudCLI"
      >
        <Terminal className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        <span>Terminal</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
      </button>
    );
  }

  const safeToolboxItems = Array.isArray(toolboxItems) ? toolboxItems : [];
  const missingItems = safeToolboxItems.filter((i) => i.status === "MISSING");
  const lastDeployment = Array.isArray(deployments) ? deployments[0] : undefined;

  const panelClasses =
    cliPanelPosition === "bottom"
      ? `border-t border-border w-full ${cliPanelMaximized ? "h-[70vh]" : "h-72"}`
      : `border-l border-border ${cliPanelMaximized ? "w-[55vw]" : "w-[460px]"}`;

  const sharedContext = selectedProject
    ? `Repo: ${selectedProject.githubRepo} | Branch: ${selectedProject.githubDefaultBranch} | Missing Tools: ${missingItems.length} | Coolify: ${lastDeployment?.status || "Idle"}`
    : "Aucun projet sélectionné";

  const QUICK_CMDS = [
    { label: "git status", cmd: "git status" },
    { label: "npm test", cmd: "npm test" },
    { label: "claude login", cmd: "claude login" },
    { label: "agy login", cmd: "agy login" },
    { label: "npm run build", cmd: "npm run build" },
  ];

  return (
    <div
      className={`bg-[#09090b] flex flex-col shrink-0 transition-all duration-200 ${panelClasses}`}
    >
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-card/50 backdrop-blur shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {CLI_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCliTab(tab.id)}
              title={tab.description}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeCliTab === tab.id
                  ? `bg-secondary/80 ${tab.color} border border-border/50`
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Context toggle */}
          <button
            onClick={() => setShowContextBar(!showContextBar)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showContextBar
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
            title="Afficher/masquer le contexte injecté"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Position toggle */}
          <button
            onClick={() =>
              setCliPanelPosition(cliPanelPosition === "bottom" ? "right" : "bottom")
            }
            className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Basculer position (Bas / Droite)"
          >
            {cliPanelPosition === "bottom" ? (
              <Columns className="w-3.5 h-3.5" />
            ) : (
              <Rows className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Maximize */}
          <button
            onClick={toggleCliPanelMaximized}
            className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            title={cliPanelMaximized ? "Réduire" : "Maximiser"}
          >
            {cliPanelMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={toggleCliPanel}
            className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Fermer le terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Context Bar (optional, collapsed by default) ── */}
      {showContextBar && (
        <div className="flex items-center gap-4 px-3 py-1.5 bg-secondary/20 border-b border-border/40 text-[11px] text-muted-foreground overflow-x-auto shrink-0">
          <span className="font-semibold text-foreground flex items-center gap-1 shrink-0">
            <Info className="w-3 h-3 text-primary" />
            Contexte :
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <GitBranch className="w-3 h-3" />
            <span>{selectedProject?.githubRepo || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PackageCheck className="w-3 h-3 text-amber-400" />
            <span>
              {missingItems.length > 0
                ? `${missingItems.length} outil(s) manquant(s)`
                : "Stack complète"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Cloud className="w-3 h-3 text-blue-400" />
            <span>{lastDeployment?.status || "Prêt"}</span>
          </div>
        </div>
      )}

      {/* ── Quick Commands ── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 border-b border-border/20 overflow-x-auto shrink-0">
        <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider shrink-0">
          Rapide :
        </span>
        {QUICK_CMDS.map((action, idx) => (
          <button
            key={idx}
            onClick={() => {
              navigator.clipboard.writeText(action.cmd);
              addNotification({
                type: "info",
                title: "Commande copiée",
                message: action.cmd,
                autoDismissMs: 2000,
              });
            }}
            className="px-2 py-0.5 rounded bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40 text-[10px] font-mono transition-colors shrink-0"
            title={`Copier : ${action.cmd}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* ── xterm.js Terminal ── */}
      <div className="flex-1 w-full overflow-hidden">
        <XtermTerminal
          key={activeCliTab}
          target={activeCliTab === "coolify-logs" ? "bash" : activeCliTab}
          projectId={selectedProject?.id}
          contextPrompt={sharedContext}
        />
      </div>
    </div>
  );
}
