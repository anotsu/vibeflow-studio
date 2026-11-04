// ============================================================
// VibeFlow Studio — Create Project Dialog
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
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";

interface CreateProjectDialogProps {
  onClose: () => void;
}

export function CreateProjectDialog({ onClose }: CreateProjectDialogProps) {
  const { createProject } = useProjectStore();
  const { setSelectedProjectId, addNotification } = useUIStore();

  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.vibeDescription || !form.githubRepo) return;

    setLoading(true);
    try {
      const project = await createProject({
        name: form.name,
        vibeDescription: form.vibeDescription,
        githubRepo: form.githubRepo,
        githubDefaultBranch: form.githubDefaultBranch || undefined,
        coolifyAppUuid: form.coolifyAppUuid || undefined,
        coolifyServerUrl: form.coolifyServerUrl || undefined,
        githubToken: form.githubToken || undefined,
        anthropicApiKey: form.anthropicApiKey || undefined,
        coolifyApiToken: form.coolifyApiToken || undefined,
      });
      setSelectedProjectId(project.id);
      addNotification({
        type: "success",
        title: "Projet créé",
        message: `"${project.name}" a été créé avec succès.`,
        autoDismissMs: 3000,
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

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Nouveau Projet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nom du projet *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Mon Super Projet"
              className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Vibe Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
              Décrivez votre vibe *
            </label>
            <textarea
              value={form.vibeDescription}
              onChange={(e) => updateField("vibeDescription", e.target.value)}
              placeholder="Je veux créer une app de réservation de restaurants avec un système de notation, des recommandations IA, et un paiement intégré..."
              rows={4}
              className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground resize-none"
              required
            />
          </div>

          {/* GitHub Repo */}
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
              className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-mono"
              required
            />
          </div>

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Configuration avancée (Coolify, Clés API)
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* Default Branch */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Branche par défaut
                </label>
                <input
                  type="text"
                  value={form.githubDefaultBranch}
                  onChange={(e) =>
                    updateField("githubDefaultBranch", e.target.value)
                  }
                  placeholder="main"
                  className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-mono"
                />
              </div>

              {/* Coolify */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    <Cloud className="w-3 h-3 inline mr-1" />
                    URL Coolify
                  </label>
                  <input
                    type="url"
                    value={form.coolifyServerUrl}
                    onChange={(e) =>
                      updateField("coolifyServerUrl", e.target.value)
                    }
                    placeholder="https://coolify.example.com"
                    className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    UUID App Coolify
                  </label>
                  <input
                    type="text"
                    value={form.coolifyAppUuid}
                    onChange={(e) =>
                      updateField("coolifyAppUuid", e.target.value)
                    }
                    placeholder="uuid-here"
                    className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-mono"
                  />
                </div>
              </div>

              {/* API Keys */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  Les clés sont chiffrées avant le stockage en base.
                </p>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Token GitHub (PAT)
                  </label>
                  <input
                    type="password"
                    value={form.githubToken}
                    onChange={(e) =>
                      updateField("githubToken", e.target.value)
                    }
                    placeholder="ghp_..."
                    className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Clé API Anthropic
                  </label>
                  <input
                    type="password"
                    value={form.anthropicApiKey}
                    onChange={(e) =>
                      updateField("anthropicApiKey", e.target.value)
                    }
                    placeholder="sk-ant-..."
                    className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Token API Coolify
                  </label>
                  <input
                    type="password"
                    value={form.coolifyApiToken}
                    onChange={(e) =>
                      updateField("coolifyApiToken", e.target.value)
                    }
                    placeholder="Token Coolify..."
                    className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Créer le projet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
