// ============================================================
// VibeFlow Studio — Sidebar (Vibe Guide & Roadmap)
// UX Refonte v2 — Inspiré Linear / Notion / Vercel
// ============================================================
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Sparkles,
  Map,
  GitPullRequest,
  Check,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";

interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionTaken?: string;
}

export function Sidebar() {
  const { selectedProject, selectProject } = useProjectStore();
  const { sidebarOpen, addNotification, setActiveWorkspaceTab } = useUIStore();
  const [activeTab, setActiveTab] = useState<"chat" | "roadmap">("chat");
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Bienvenue dans le Vibe Guide ! Décrivez votre vision ou validez l'étape actuelle. Je vous guide pas à pas pour garder le flux créatif intact.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const handleRescanGithub = async () => {
    if (!selectedProject) return;
    setIsRescanning(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rescan_github" }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "success",
          title: "Dépôt GitHub resynchronisé",
          message: "La boîte à outils et le statut du projet ont été actualisés.",
          autoDismissMs: 4000,
        });
        await selectProject(selectedProject.id);
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de resynchroniser avec GitHub.",
        autoDismissMs: 4000,
      });
    } finally {
      setIsRescanning(false);
    }
  };

  if (!sidebarOpen) return null;

  const milestones = Array.isArray(selectedProject?.milestones) ? selectedProject.milestones : [];
  const activeMilestone =
    milestones.find((m) => m.status === "IN_PROGRESS") ||
    milestones.find((m) => m.status === "PENDING") ||
    milestones[0];

  const completedCount = milestones.filter((m) => m.status === "COMPLETED").length;
  const progressPct = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || !selectedProject) return;

    const userMsg: ChatBubble = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputValue("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/vibe/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          message: textToSend,
          milestoneId: activeMilestone?.id,
          action: "analyze_vibe",
        }),
      });

      if (!res.ok) throw new Error("Erreur de communication avec le Vibe Guide");

      const data = await res.json();
      const assistantMsg: ChatBubble = {
        id: data.message?.id || `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message?.content || "Étape analysée.",
        timestamp: new Date(),
        actionTaken: data.message?.actionTaken,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      if (data.githubIssueNumber) {
        addNotification({
          type: "success",
          title: "GitHub Sync",
          message: `Issue #${data.githubIssueNumber} créée sur ${selectedProject.githubRepo}`,
          autoDismissMs: 4000,
        });
        selectProject(selectedProject.id);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Impossible de contacter le Vibe Guide. Vérifiez vos clés API ou votre connexion.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "IN_PROGRESS":
        return <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
    }
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      ARCHITECTURE: "Architecture",
      MVP: "MVP",
      UI_UX: "UI/UX",
      INTEGRATIONS: "Intégrations",
      DEPLOYMENT: "Déploiement",
      MAINTENANCE: "Maintenance",
    };
    const icons: Record<string, string> = {
      ARCHITECTURE: "🏗️",
      MVP: "🚀",
      UI_UX: "🎨",
      INTEGRATIONS: "🔌",
      DEPLOYMENT: "📦",
      MAINTENANCE: "🔧",
    };
    return `${icons[phase] || "📌"} ${labels[phase] || phase}`;
  };

  return (
    <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header with project context */}
      {selectedProject && (
        <div className="px-4 pt-3 pb-2 border-b border-border/60">
          <p className="text-xs font-semibold text-foreground truncate">{selectedProject.name}</p>
          {milestones.length > 0 && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">
                  Progression globale · {completedCount}/{milestones.length} jalons
                </span>
                <span className="text-[10px] font-semibold text-primary">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "chat"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Vibe Guide
        </button>
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "roadmap"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          Roadmap
          {milestones.length > 0 && (
            <span className="ml-1 text-[10px] bg-secondary px-1 py-0.5 rounded-full text-muted-foreground font-mono">
              {milestones.length}
            </span>
          )}
        </button>
      </div>

      {/* Focus Step Banner */}
      {activeMilestone && activeTab === "chat" && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 flex items-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="text-muted-foreground shrink-0">Focus :</span>
          <span className="font-medium text-foreground truncate">{activeMilestone.title}</span>
          {activeMilestone.githubIssueNumber && (
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              #{activeMilestone.githubIssueNumber}
            </span>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" ? (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground border border-border/40"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/30">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">VibeGuide IA</span>
                        {msg.actionTaken && (
                          <span className="ml-auto text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Sync
                          </span>
                        )}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2 text-xs border border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary animate-spin" />
                      <span className="text-muted-foreground">Analyse en cours...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 pt-1.5 pb-1 border-t border-border/60 flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveWorkspaceTab("arena")}
                className="flex items-center gap-1 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2 py-1 rounded-md shrink-0 transition-colors font-semibold"
                title="Ouvrir l'Arène IA"
              >
                <Zap className="w-3 h-3" />
                <span>Arène IA</span>
              </button>
              <button
                onClick={handleRescanGithub}
                disabled={isRescanning}
                className="flex items-center gap-1 text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md shrink-0 transition-colors"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isRescanning ? "animate-spin" : ""}`} />
                <span>Sync GitHub</span>
              </button>
              <button
                onClick={() => handleSend("Quelle est l'étape suivante ?")}
                disabled={isTyping || !selectedProject}
                className="text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md shrink-0 transition-colors disabled:opacity-40"
              >
                ⏩ Suivant
              </button>
              <button
                onClick={() => handleSend("Créer l'issue GitHub pour cette étape.")}
                disabled={isTyping || !selectedProject}
                className="flex items-center gap-1 text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md shrink-0 transition-colors disabled:opacity-40"
              >
                <GitPullRequest className="w-2.5 h-2.5" />
                <span>Issue</span>
              </button>
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={selectedProject ? "Décrivez votre vibe..." : "Sélectionnez un projet"}
                  disabled={!selectedProject}
                  className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 disabled:opacity-40"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping || !selectedProject}
                  className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Roadmap View */
          <div className="flex-1 overflow-y-auto p-3">
            {milestones.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-12">
                <Map className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucun jalon défini</p>
                <p className="text-[11px] mt-1 opacity-60">
                  {selectedProject
                    ? "Utilisez le Vibe Guide pour générer la roadmap."
                    : "Sélectionnez un projet pour voir la roadmap."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {milestones
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((milestone, index) => (
                    <div key={milestone.id} className="relative">
                      {index < milestones.length - 1 && (
                        <div className="absolute left-[9px] top-10 w-0.5 h-[calc(100%-4px)] bg-border/50 z-0" />
                      )}
                      <div
                        className={`relative z-10 flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                          milestone.status === "IN_PROGRESS"
                            ? "bg-primary/8 border border-primary/20"
                            : milestone.status === "COMPLETED"
                              ? "opacity-70"
                              : "hover:bg-secondary/50 border border-transparent"
                        }`}
                      >
                        <div className="mt-0.5">{getMilestoneIcon(milestone.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {getPhaseLabel(milestone.phase)}
                            </span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {milestone.title}
                          </p>

                          {/* Progress bar */}
                          {milestone.status !== "COMPLETED" && (
                            <div className="mt-1.5 h-0.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${(milestone.progress ?? 0) * 100}%` }}
                              />
                            </div>
                          )}

                          {milestone.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                              <Check className="w-2.5 h-2.5" /> Terminé
                            </span>
                          )}

                          {milestone.status === "IN_PROGRESS" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary mt-1">
                              <Clock className="w-2.5 h-2.5" /> En cours
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
