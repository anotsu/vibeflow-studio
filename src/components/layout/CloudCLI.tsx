// ============================================================
// VibeFlow Studio — CloudCLI Panel (Multi-tab Terminal)
// Integrated with xterm.js, PTY sockets & Shared Context
// ============================================================
"use client";

import React, { useState } from "react";
import {
  Terminal,
  Bot,
  Rocket,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
  Columns,
  Rows,
  Radio,
  ScrollText,
  Info,
  GitBranch,
  Cloud,
  PackageCheck,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useProjectStore } from "@/stores/project-store";
import type { CliTab } from "@/types";
import { XtermTerminal } from "@/components/terminal/XtermTerminal";

interface CliTabConfig {
  id: CliTab;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const CLI_TABS: CliTabConfig[] = [
  {
    id: "bash",
    label: "Terminal Bash",
    icon: <Terminal className="w-3.5 h-3.5" />,
    color: "text-green-400",
    description: "Système & Shell Unix",
  },
  {
    id: "claude",
    label: "Claude Code",
    icon: <Bot className="w-3.5 h-3.5" />,
    color: "text-claude",
    description: "Session dédiée Claude CLI",
  },
  {
    id: "antigravity",
    label: "Antigravity",
    icon: <Rocket className="w-3.5 h-3.5" />,
    color: "text-antigravity",
    description: "Session dédiée Antigravity CLI",
  },
  {
    id: "coolify-logs",
    label: "Coolify Logs",
    icon: <ScrollText className="w-3.5 h-3.5" />,
    color: "text-yellow-400",
    description: "Flux de logs conteneur en direct",
  },
];

export function CloudCLI() {
  const {
    cliPanelOpen,
    activeCliTab,
    cliPanelPosition,
    setActiveCliTab,
    toggleCliPanel,
    setCliPanelPosition,
    addNotification,
  } = useUIStore();

  const { selectedProject, toolboxItems, deployments } = useProjectStore();

  const [isMaximized, setIsMaximized] = useState(false);
  const [showContextBar, setShowContextBar] = useState(true);

  if (!cliPanelOpen) {
    return (
      <button
        onClick={toggleCliPanel}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-xl text-sm font-medium text-foreground hover:bg-secondary transition-all z-50 group"
      >
        <Terminal className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        <span>Ouvrir CloudCLI</span>
        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    );
  }

  const safeToolboxItems = Array.isArray(toolboxItems) ? toolboxItems : [];
  const missingItems = safeToolboxItems.filter((i) => i.status === "MISSING");
  const lastDeployment = Array.isArray(deployments) ? deployments[0] : undefined;

  const panelClasses =
    cliPanelPosition === "bottom"
      ? `border-t border-border ${isMaximized ? "h-[75vh]" : "h-80"}`
      : `border-l border-border w-[480px] ${isMaximized ? "w-[60vw]" : "w-[480px]"}`;

  const sharedContext = selectedProject
    ? `Repo: ${selectedProject.githubRepo} | Branch: ${selectedProject.githubDefaultBranch} | Missing Tools: ${missingItems.length} | Coolify: ${lastDeployment?.status || "Idle"}`
    : "Aucun projet sélectionné";

  return (
    <div
      className={`bg-[#09090b] flex flex-col shrink-0 transition-all duration-200 z-30 ${panelClasses}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/60 backdrop-blur">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {CLI_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCliTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeCliTab === tab.id
                  ? `bg-secondary ${tab.color} shadow-sm border border-border/50`
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              title={tab.description}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}

          {/* Broadcast Trigger */}
          <button
            onClick={() => setActiveCliTab("claude")}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-primary transition-colors ml-1.5"
            title="Diffuser les prompts aux deux agents simultanément"
          >
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="hidden md:inline text-[11px]">Broadcast Mode</span>
          </button>
        </div>

        {/* Panel controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowContextBar(!showContextBar)}
            className={`p-1 rounded text-xs transition-colors ${
              showContextBar ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Afficher/masquer le contexte partagé injecté"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              setCliPanelPosition(
                cliPanelPosition === "bottom" ? "right" : "bottom"
              )
            }
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Basculer la position (Bas / Droite)"
          >
            {cliPanelPosition === "bottom" ? (
              <Columns className="w-3.5 h-3.5" />
            ) : (
              <Rows className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={isMaximized ? "Réduire" : "Maximiser"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={toggleCliPanel}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Fermer le terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Shared Context Injection Bar */}
      {showContextBar && (
        <div className="flex items-center gap-4 px-3 py-1 bg-secondary/30 border-b border-border/40 text-[11px] text-muted-foreground select-none overflow-x-auto">
          <span className="font-semibold text-foreground flex items-center gap-1 shrink-0">
            <Info className="w-3 h-3 text-primary" /> Contexte injecté :
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <GitBranch className="w-3 h-3 text-foreground" />
            <span>{selectedProject?.githubRepo || "N/A"}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PackageCheck className="w-3 h-3 text-yellow-400" />
            <span>
              {missingItems.length > 0
                ? `${missingItems.length} outil(s) manquant(s)`
                : "Boîte à outils complète"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Cloud className="w-3 h-3 text-blue-400" />
            <span>Déploiement: {lastDeployment?.status || "Prêt"}</span>
          </div>
        </div>
      )}

      {/* Quick Action Commands Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 border-b border-border/30 text-[11px] overflow-x-auto select-none">
        <span className="text-[10px] text-zinc-500 font-mono shrink-0 uppercase tracking-wider font-semibold">
          Actions rapides :
        </span>
        {[
          { label: "⚡ Statut CLIs Pro", cmd: "agy -p 'ping' && claude --version" },
          { label: "📊 Git status", cmd: "git status" },
          { label: "📦 Dépendances", cmd: "npm list --depth=0" },
          { label: "🧪 Tests unitaires", cmd: "npm test" },
          { label: "🚀 Santé Coolify", cmd: "curl -sI https://vibeflow.capstation.fr" },
        ].map((action, idx) => (
          <button
            key={idx}
            onClick={() => {
              navigator.clipboard.writeText(action.cmd);
              addNotification({
                type: "info",
                title: "Commande copiée",
                message: `Collez dans le terminal: ${action.cmd}`,
                autoDismissMs: 2500,
              });
            }}
            className="px-2 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700/40 text-[10px] font-mono transition-colors shrink-0 flex items-center gap-1"
            title={`Copier dans le presse-papier: ${action.cmd}`}
          >
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Real xterm.js Terminal Container */}
      <div className="flex-1 w-full h-full overflow-hidden">
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
