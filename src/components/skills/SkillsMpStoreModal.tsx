// ============================================================
// VibeFlow Studio — SkillsMP Store Modal (skillsmp.com)
// Open Marketplace Browser for AI Agent Skills
// Allows searching, inspecting SKILL.md prompts, and installing
// skills for Claude Code Pro and Antigravity CLI with Obsidian sync.
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Search,
  Sparkles,
  Star,
  ExternalLink,
  CheckCircle2,
  Download,
  Loader2,
  FileCode,
  ShieldCheck,
  Layers,
  Database,
  Lock,
  Zap,
  Tag,
  Info,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useProjectStore } from "@/stores/project-store";
import type { SkillsMpSkill } from "@/lib/skillsmp-client";

interface SkillsMpStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillInstalled?: (skill: SkillsMpSkill) => void;
}

const CATEGORIES = [
  "ALL",
  "Payment",
  "Database",
  "Security",
  "Frontend",
  "Architecture",
  "DevOps",
  "Testing",
];

export function SkillsMpStoreModal({
  isOpen,
  onClose,
  onSkillInstalled,
}: SkillsMpStoreModalProps) {
  const { addNotification } = useUIStore();
  const { selectedProject } = useProjectStore();

  const [skills, setSkills] = useState<SkillsMpSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [previewSkill, setPreviewSkill] = useState<SkillsMpSkill | null>(null);

  const fetchSkills = async (q = "", cat = "ALL") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat !== "ALL") params.set("category", cat);

      const res = await fetch(`/api/skills/skillsmp?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.warn("Failed fetching SkillsMP:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSkills(searchQuery, selectedCategory);
    }
  }, [isOpen, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSkills(searchQuery, selectedCategory);
  };

  const handleInstallSkill = async (skill: SkillsMpSkill) => {
    setInstallingId(skill.id);
    try {
      const res = await fetch("/api/skills/skillsmp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.id,
          projectId: selectedProject?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSkills((prev) =>
          prev.map((s) => (s.id === skill.id ? { ...s, installed: true } : s))
        );
        addNotification({
          type: "success",
          title: `Compétence "${skill.name}" Installée !`,
          message: `Active pour les agents & synchronisée dans Obsidian (${data.obsidianPath}).`,
          autoDismissMs: 4500,
        });
        onSkillInstalled?.(skill);
      } else {
        throw new Error("Échec de l'installation");
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Installation",
        message: err.message,
        autoDismissMs: 3500,
      });
    } finally {
      setInstallingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-blue-500/20 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  SkillsMP Store (skillsmp.com)
                </h2>
                <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">
                  Catalogue Officiel
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Marketplace ouverte de compétences IA spécialisées pour Claude Code Pro &amp; Antigravity CLI
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

        {/* Search & Category Filter Toolbar */}
        <div className="p-4 border-b border-border bg-secondary/20 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une compétence (ex: Stripe, Prisma, OWASP, Docker, FastAPI, 60fps)..."
              className="w-full bg-secondary text-foreground text-xs rounded-xl pl-9 pr-24 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Rechercher
            </button>
          </form>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat === "ALL" ? "Toutes les catégories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Interrogation de SkillsMP...</p>
            </div>
          ) : skills.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Aucune compétence trouvée pour &quot;{searchQuery}&quot;.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                  fetchSkills("", "ALL");
                }}
                className="mt-3 text-xs text-primary font-semibold hover:underline"
              >
                Réinitialiser la recherche
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    skill.installed
                      ? "bg-primary/5 border-primary/40 shadow-sm"
                      : "bg-card border-border hover:border-border/80"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>{skill.name}</span>
                        </h3>
                        <span className="text-[10px] text-muted-foreground">
                          par @{skill.author}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          {skill.stars}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-foreground/80 bg-secondary px-1.5 py-0.5 rounded-full border border-border">
                          {skill.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {skill.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {skill.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-mono text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-border/60">
                    <button
                      onClick={() => setPreviewSkill(skill)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Voir SKILL.md</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {skill.sourceUrl && (
                        <a
                          href={skill.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                          title="Voir sur skillsmp.com"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {skill.installed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Actif</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInstallSkill(skill)}
                          disabled={installingId === skill.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {installingId === skill.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Installer</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card/80 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            🌐 Connecté au catalogue SkillsMP · Toutes les compétences installées sont synchronisées avec Obsidian.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>

        {/* SKILL.md Preview Drawer Modal */}
        {previewSkill && (
          <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Spécification SKILL.md : {previewSkill.name}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewSkill(null)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] text-zinc-300 bg-[#09090b] space-y-3">
                <div className="text-muted-foreground">
                  # {previewSkill.name} by @{previewSkill.author}
                </div>
                <p className="text-zinc-400">{previewSkill.description}</p>
                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-emerald-400 whitespace-pre-wrap">
                  {previewSkill.systemPromptInjection}
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-border bg-card flex items-center justify-end">
                <button
                  onClick={() => setPreviewSkill(null)}
                  className="px-3 py-1 bg-secondary text-foreground rounded text-xs font-medium"
                >
                  Fermer l&apos;aperçu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
