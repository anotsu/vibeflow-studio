// ============================================================
// VibeFlow Studio — Sidebar (Vibe Guide & Incremental Roadmap)
// Step-by-Step AI Guiding, Single-Step Focus & GitHub sync
// ============================================================
"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Sparkles,
  Map,
  Plus,
  GitPullRequest,
  Check,
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
  const { sidebarOpen, addNotification } = useUIStore();
  const [activeTab, setActiveTab] = useState<"chat" | "roadmap">("chat");
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Bienvenue dans le Vibe Guide ! Décrivez votre vision en langage naturel. Je la découpe en 5 jalons clairs et ne vous présente qu'une seule étape à la fois pour garder le flux créatif intact.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  if (!sidebarOpen) return null;

  const milestones = selectedProject?.milestones || [];
  const activeMilestone =
    milestones.find((m) => m.status === "IN_PROGRESS") ||
    milestones.find((m) => m.status === "PENDING") ||
    milestones[0];

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

      if (!res.ok) {
        throw new Error("Erreur de communication avec le Vibe Guide");
      }

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
          message: `Issue #${data.githubIssueNumber} créée avec succès sur ${selectedProject.githubRepo}`,
          autoDismissMs: 4000,
        });
        // Refresh project data to show updated milestones
        selectProject(selectedProject.id);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Impossible de contacter le Vibe Guide. Veuillez vérifier vos clés ou votre connexion.",
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
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "IN_PROGRESS":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      ARCHITECTURE: "🏗️ 1. Architecture",
      MVP: "🚀 2. MVP",
      UI_UX: "🎨 3. UI/UX",
      INTEGRATIONS: "🔌 4. Intégrations",
      DEPLOYMENT: "📦 5. Déploiement",
      MAINTENANCE: "🔧 6. Maintenance",
    };
    return labels[phase] || phase;
  };

  return (
    <aside className="w-80 border-r border-border bg-card flex flex-col shrink-0">
      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
            activeTab === "chat"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Vibe Guide
        </button>
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
            activeTab === "roadmap"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          Roadmap
        </button>
      </div>

      {/* Focus Step Header */}
      {activeMilestone && (
        <div className="px-3 py-2 bg-secondary/40 border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Focus actuel:</span>
            <span className="font-semibold text-foreground truncate">{activeMilestone.title}</span>
          </div>
          {activeMilestone.githubIssueNumber && (
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground shrink-0 font-mono">
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
                    className={`max-w-[92%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-secondary text-foreground border border-border/50"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-border/30">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">
                            VibeGuide IA
                          </span>
                        </div>
                        {msg.actionTaken && (
                          <span className="text-[9px] text-green-400 bg-green-500/10 px-1 py-0.2 rounded flex items-center gap-0.5">
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
                  <div className="bg-secondary rounded-lg px-3 py-2 text-xs border border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary animate-spin" />
                      <span className="text-muted-foreground text-[11px]">Découpage de l&apos;étape...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 py-1.5 border-t border-border/60 bg-card/40 flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => handleSend("Quelle est l'étape suivante ?")}
                disabled={isTyping}
                className="text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md shrink-0 transition-colors"
              >
                ⏩ Étape suivante
              </button>
              <button
                onClick={() => handleSend("Créer l'issue GitHub pour cette étape.")}
                disabled={isTyping}
                className="text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md shrink-0 transition-colors flex items-center gap-1"
              >
                <GitPullRequest className="w-2.5 h-2.5" /> Créer Issue
              </button>
              <button
                onClick={() => handleSend("Quels sont les outils manquants dans la boîte à outils ?")}
                disabled={isTyping}
                className="text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md shrink-0 transition-colors"
              >
                🧰 Analyser boîte à outils
              </button>
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Décrivez votre vibe ou validez l'étape..."
                  className="flex-1 bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-2 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
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
              <div className="text-center text-muted-foreground text-xs py-8">
                <Map className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Aucun jalon défini.</p>
                <p className="text-[11px] mt-1 text-muted-foreground/60">
                  Créez un projet pour générer la roadmap.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {milestones
                  .sort((a, b) => a.order - b.order)
                  .map((milestone, index) => (
                    <div key={milestone.id} className="relative">
                      {index < milestones.length - 1 && (
                        <div className="absolute left-[9px] top-8 w-0.5 h-full bg-border" />
                      )}
                      <div
                        className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                          milestone.status === "IN_PROGRESS"
                            ? "bg-primary/10 border border-primary/30 shadow-sm"
                            : "hover:bg-secondary/60 border border-transparent"
                        }`}
                      >
                        <div className="mt-0.5">{getMilestoneIcon(milestone.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {getPhaseLabel(milestone.phase)}
                            </span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {milestone.title}
                          </p>

                          {/* Progress bar */}
                          <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{
                                width: `${(milestone.progress ?? 0) * 100}%`,
                              }}
                            />
                          </div>
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
