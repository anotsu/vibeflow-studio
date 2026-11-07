// ============================================================
// VibeFlow Studio — Custom Skills & Personas Modal
// Phase 8.3: Pluggable domain skills (OWASP, 60fps, WCAG) & Personas editor
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Bot,
  Layers,
  CheckCircle2,
  Sliders,
  Check,
  Loader2,
  Lock,
  Eye,
} from "lucide-react";
import type { AgentSkill, AgentPersona } from "@/lib/agent-skills";
import { SkillsMpStoreModal } from "@/components/skills/SkillsMpStoreModal";

interface PersonasSkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PersonasSkillsModal({
  isOpen,
  onClose,
  onUpdated,
}: PersonasSkillsModalProps) {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [currentPersonas, setCurrentPersonas] = useState<{
    claude: AgentPersona;
    antigravity: AgentPersona;
  } | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<AgentPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showSkillsMpStore, setShowSkillsMpStore] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills);
        setCurrentPersonas(data.currentPersonas);
        setAvailablePersonas(data.availablePersonas);
      }
    } catch (err) {
      console.warn("Failed fetching skills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSkill = async (skillId: string, currentEnabled: boolean) => {
    setUpdatingId(skillId);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_skill",
          skillId,
          enabled: !currentEnabled,
        }),
      });
      if (res.ok) {
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, enabled: !currentEnabled } : s))
        );
        onUpdated?.();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSelectPersona = async (
    agent: "claude" | "antigravity",
    personaId: string
  ) => {
    setUpdatingId(`${agent}-${personaId}`);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_persona",
          agent,
          personaId,
        }),
      });
      if (res.ok) {
        const found = availablePersonas.find((p) => p.id === personaId);
        if (found && currentPersonas) {
          setCurrentPersonas({
            ...currentPersonas,
            [agent]: found,
          });
          onUpdated?.();
        }
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const claudePersonas = availablePersonas.filter((p) => p.agent === "claude");
  const agyPersonas = availablePersonas.filter((p) => p.agent === "antigravity");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Marketplace de Compétences & Personas IA
              </h2>
              <p className="text-xs text-muted-foreground">
                Personnalisez le tempérament de Claude et Antigravity et activez des compétences spécialisées.
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Chargement des compétences...</p>
            </div>
          ) : (
            <>
              {/* Personas Selection */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  1. Tempéraments & Personas des Agents
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Claude Column */}
                  <div className="border border-border/80 rounded-lg p-3 bg-secondary/20">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                        C
                      </div>
                      <span className="text-xs font-semibold">Claude Code Pro</span>
                    </div>

                    <div className="space-y-2">
                      {claudePersonas.map((p) => {
                        const isSelected = currentPersonas?.claude?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPersona("claude", p.id)}
                            className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-orange-500/10 border-orange-500/40 text-foreground"
                                : "bg-card border-border hover:border-border/80 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-foreground">
                                {p.name}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-orange-400" />
                              )}
                            </div>
                            <p className="text-[11px] leading-relaxed line-clamp-2">
                              {p.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Antigravity Column */}
                  <div className="border border-border/80 rounded-lg p-3 bg-secondary/20">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                        A
                      </div>
                      <span className="text-xs font-semibold">Antigravity CLI</span>
                    </div>

                    <div className="space-y-2">
                      {agyPersonas.map((p) => {
                        const isSelected = currentPersonas?.antigravity?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPersona("antigravity", p.id)}
                            className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500/40 text-foreground"
                                : "bg-card border-border hover:border-border/80 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-foreground">
                                {p.name}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-blue-400" />
                              )}
                            </div>
                            <p className="text-[11px] leading-relaxed line-clamp-2">
                              {p.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    2. Compétences Métiers Pluggables (Skills)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSkillsMpStore(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-primary/15 to-purple-500/15 hover:from-primary/25 hover:to-purple-500/25 text-primary border border-primary/30 rounded-lg transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Store SkillsMP (skillsmp.com)</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`flex items-start justify-between p-3.5 rounded-lg border transition-all ${
                        skill.enabled
                          ? "bg-primary/5 border-primary/30"
                          : "bg-secondary/20 border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl select-none mt-0.5">{skill.icon}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground">
                              {skill.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold rounded bg-secondary text-foreground/80 border border-border">
                              {skill.badge}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {skill.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSkill(skill.id, skill.enabled)}
                        disabled={updatingId === skill.id}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          skill.enabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            skill.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/60">
          <span className="text-[11px] text-muted-foreground">
            Les compétences activées sont automatiquement injectées dans les débats et l&apos;arbitrage IA.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* SkillsMP Store Browser Modal */}
      <SkillsMpStoreModal
        isOpen={showSkillsMpStore}
        onClose={() => setShowSkillsMpStore(false)}
        onSkillInstalled={() => {
          fetchConfig();
          onUpdated?.();
        }}
      />
    </div>
  );
}
