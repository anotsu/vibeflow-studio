// ============================================================
// VibeFlow Studio — Settings & Integration Testers Modal
// Prioritizes Pro Accounts & CLIs by default, API tokens optional
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  GitBranch,
  Cloud,
  Bot,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Key,
  ShieldCheck,
  Sparkles,
  Terminal,
  ExternalLink,
  Lock,
  Zap,
  Server,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { SshHostsManager } from "@/components/settings/SshHostsManager";
import { VibeCodingEngineModal } from "@/components/setup/VibeCodingEngineModal";

interface SettingsDialogProps {
  onClose: () => void;
  onOpenCliSetup?: () => void;
}

export function SettingsDialog({ onClose, onOpenCliSetup }: SettingsDialogProps) {
  const { addNotification, setActiveCliTab, setCliPanelOpen, setCliPanelMaximized } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [testingCoolify, setTestingCoolify] = useState(false);
  const [testingClaude, setTestingClaude] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "ssh">("general");
  const [engineModalOpen, setEngineModalOpen] = useState(false);

  const [cliInfo, setCliInfo] = useState<{
    claudeCliInstalled?: boolean;
    antigravityCliInstalled?: boolean;
    hasClaudeAuth?: boolean;
    hasAgyAuth?: boolean;
    defaultEngine?: string;
  }>({});

  const [githubResult, setGithubResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [coolifyResult, setCoolifyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [claudeResult, setClaudeResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState({
    githubToken: "",
    anthropicApiKey: "",
    coolifyUrl: "",
    coolifyApiToken: "",
    redisUrl: "redis://localhost:6379",
    autoModeIntervalMinutes: 5,
    maxConcurrentTasks: 2,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setCliInfo({
            claudeCliInstalled: data.claudeCliInstalled,
            antigravityCliInstalled: data.antigravityCliInstalled,
            hasClaudeAuth: data.hasClaudeAuth,
            hasAgyAuth: data.hasAgyAuth,
            defaultEngine: data.defaultEngine,
          });
          setForm((prev) => ({
            ...prev,
            coolifyUrl: data.defaultCoolifyUrl || "",
            redisUrl: data.redisUrl || "redis://localhost:6379",
            autoModeIntervalMinutes: Math.round((data.autoModeIntervalMs || 300000) / 60000),
            maxConcurrentTasks: data.maxConcurrentTasks || 2,
          }));
        }
      })
      .catch(console.error);
  }, []);

  const openCliForAuth = (tab: "claude" | "antigravity") => {
    setActiveCliTab(tab);
    setCliPanelOpen(true);
    setCliPanelMaximized(true);
    addNotification({
      type: "info",
      title: tab === "claude" ? "Claude Code CLI activé" : "Antigravity CLI activé",
      message: `Terminal ouvert. Tapez ${tab === "claude" ? "'claude login'" : "'agy login'"} pour associer votre compte.`,
      autoDismissMs: 4000,
    });
    onClose();
  };

  const testGithub = async () => {
    setTestingGithub(true);
    setGithubResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_github", token: form.githubToken }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubResult({
          ok: true,
          msg: `Authentifié : @${data.username} (${data.rateLimitRemaining} req restantes)`,
        });
      } else {
        setGithubResult({ ok: false, msg: data.error || "Échec" });
      }
    } catch {
      setGithubResult({ ok: false, msg: "Erreur de connexion" });
    } finally {
      setTestingGithub(false);
    }
  };

  const testCoolify = async () => {
    setTestingCoolify(true);
    setCoolifyResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_coolify",
          url: form.coolifyUrl,
          token: form.coolifyApiToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCoolifyResult({ ok: true, msg: "Instance Coolify active & accessible" });
      } else {
        setCoolifyResult({ ok: false, msg: data.error || "Échec" });
      }
    } catch {
      setCoolifyResult({ ok: false, msg: "Erreur réseau" });
    } finally {
      setTestingCoolify(false);
    }
  };

  const testClaude = async () => {
    setTestingClaude(true);
    setClaudeResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_claude", key: form.anthropicApiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setClaudeResult({ ok: true, msg: `Clé API validée (${data.model})` });
      } else {
        setClaudeResult({ ok: false, msg: data.error || "Invalide" });
      }
    } catch {
      setClaudeResult({ ok: false, msg: "Erreur réseau" });
    } finally {
      setTestingClaude(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          autoModeIntervalMs: form.autoModeIntervalMinutes * 60000,
        }),
      });
      if (!res.ok) throw new Error("Erreur de sauvegarde");
      addNotification({
        type: "success",
        title: "Configuration sauvegardée",
        message: "Les paramètres globaux ont été mis à jour avec succès.",
        autoDismissMs: 3500,
      });
      onClose();
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: err.message || "Échec",
        autoDismissMs: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-6 pt-4 border-b border-border bg-card/90 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold">Paramètres & Authentification</h2>
                <p className="text-[11px] text-muted-foreground">
                  Moteurs IA Pro, Hôtes Distants SSH (Mac mini) et intégrations
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 -mb-px">
            <button
              type="button"
              onClick={() => setSettingsTab("general")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                settingsTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Général & Moteurs IA</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab("ssh")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                settingsTab === "ssh"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Hôtes SSH (Mac mini / VPS)</span>
            </button>
          </div>
        </div>

        {/* Tab 2: SSH Hosts & Runners */}
        {settingsTab === "ssh" && (
          <div className="p-6">
            <SshHostsManager onCloseParent={onClose} />
          </div>
        )}

        {/* Tab 1: Form Body */}
        {settingsTab === "general" && (
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* SECTION 1: PRO ACCOUNTS & CLI FIRST (DEFAULT) */}
          <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-background p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Mode Par Défaut : Comptes Pro & CLIs (0€ de frais API)
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 rounded-full">
                Priorité 1 Active
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              VibeFlow Studio est configuré <strong>par défaut</strong> pour exécuter vos requêtes via vos abonnements existants <strong>Claude Pro</strong> (via Claude Code CLI) et <strong>Gemini Pro</strong> (via Antigravity CLI). Vous n&apos;avez <em>aucun besoin</em> d&apos;acheter de crédits API payants.
            </p>

            {/* Sub-cards for Claude Pro & Gemini Pro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Claude Pro Box */}
              <div className="p-3 bg-secondary/60 rounded-lg border border-border/80 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-claude flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" /> Claude Pro (CLI)
                    </span>
                    {cliInfo.hasClaudeAuth ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connecté
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                        Non associé
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {cliInfo.hasClaudeAuth
                      ? "Session Claude Pro active (0€ token facturé)."
                      : "Ouvrez le terminal pour exécuter `claude login`."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCliForAuth("claude")}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-claude/20 hover:bg-claude/30 text-claude border border-claude/30 rounded text-xs font-medium transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Ouvrir terminal (`claude login`)</span>
                </button>
              </div>

              {/* Gemini Pro / Antigravity Box */}
              <div className="p-3 bg-secondary/60 rounded-lg border border-border/80 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-antigravity flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Gemini Pro (Antigravity)
                    </span>
                    {cliInfo.hasAgyAuth ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connecté
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                        Non associé
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {cliInfo.hasAgyAuth
                      ? "Jeton Gemini Pro lié à Antigravity CLI (0€ token)."
                      : "Jeton gratuit Google AI Studio requis (0€)."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCliForAuth("antigravity")}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded text-xs font-medium transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Ouvrir terminal (`agy login`)</span>
                </button>
              </div>
            </div>

            {onOpenCliSetup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCliSetup();
                }}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ouvrir l&apos;Assistance Complète de Configuration CLIs Pro (Diagnostic & Tests)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setEngineModalOpen(true)}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-purple-500/15 via-cyan-500/15 to-emerald-500/15 hover:from-purple-500/25 hover:to-emerald-500/25 text-foreground border border-primary/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Matrice VibeCoding & Forfaits (Claude, Gemini, Codex · Solo, Duel, Trio)</span>
            </button>
          </div>

          {/* SECTION 2: OPTIONAL API KEYS */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Key className="w-4 h-4 text-muted-foreground" /> Clé API Anthropic (Claude)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-secondary rounded-full border border-border">
                  Facultatif / Optionnel
                </span>
                <button
                  type="button"
                  onClick={testClaude}
                  disabled={testingClaude || !form.anthropicApiKey}
                  className="text-[11px] text-claude hover:underline flex items-center gap-1 disabled:opacity-40"
                >
                  {testingClaude && <Loader2 className="w-3 h-3 animate-spin" />} Tester clé
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Utilisé uniquement si vous ne souhaitez pas utiliser la CLI Claude Code ou en second recours.
            </p>
            <input
              type="password"
              value={form.anthropicApiKey}
              onChange={(e) => setForm({ ...form, anthropicApiKey: e.target.value })}
              placeholder="sk-ant-api03-xxxxxxxxxxxxxxxx (Optionnel)"
              className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            {claudeResult && (
              <div
                className={`text-[11px] flex items-center gap-1.5 ${
                  claudeResult.ok ? "text-green-400" : "text-red-400"
                }`}
              >
                {claudeResult.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{claudeResult.msg}</span>
              </div>
            )}
          </div>

          {/* SECTION 3: GITHUB INTEGRATION */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-foreground" /> Token GitHub (Personal Access Token)
              </label>
              <button
                type="button"
                onClick={testGithub}
                disabled={testingGithub}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                {testingGithub && <Loader2 className="w-3 h-3 animate-spin" />} Tester connexion
              </button>
            </div>
            <input
              type="password"
              value={form.githubToken}
              onChange={(e) => setForm({ ...form, githubToken: e.target.value })}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Requis pour la gestion Git & PRs)"
              className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            {githubResult && (
              <div
                className={`text-[11px] flex items-center gap-1.5 ${
                  githubResult.ok ? "text-green-400" : "text-red-400"
                }`}
              >
                {githubResult.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{githubResult.msg}</span>
              </div>
            )}
          </div>

          {/* SECTION 4: COOLIFY INTEGRATION */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-400" /> Instance Coolify & Token
              </label>
              <button
                type="button"
                onClick={testCoolify}
                disabled={testingCoolify}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                {testingCoolify && <Loader2 className="w-3 h-3 animate-spin" />} Healthcheck API
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="url"
                value={form.coolifyUrl}
                onChange={(e) => setForm({ ...form, coolifyUrl: e.target.value })}
                placeholder="https://coolify.mondomaine.com"
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="password"
                value={form.coolifyApiToken}
                onChange={(e) => setForm({ ...form, coolifyApiToken: e.target.value })}
                placeholder="Token Bearer Coolify..."
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            {coolifyResult && (
              <div
                className={`text-[11px] flex items-center gap-1.5 ${
                  coolifyResult.ok ? "text-green-400" : "text-red-400"
                }`}
              >
                {coolifyResult.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{coolifyResult.msg}</span>
              </div>
            )}
          </div>

          {/* SECTION 5: ORCHESTRATION & DAEMON */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Database className="w-4 h-4 text-primary" /> Orchestration & Daemon 24/7
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Intervalle cycle Auto (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.autoModeIntervalMinutes}
                  onChange={(e) =>
                    setForm({ ...form, autoModeIntervalMinutes: Number(e.target.value) })
                  }
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Tâches simultanées max
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxConcurrentTasks}
                  onChange={(e) =>
                    setForm({ ...form, maxConcurrentTasks: Number(e.target.value) })
                  }
                  className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-secondary/40 rounded-lg border border-border/80 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <span>
              Les tokens d&apos;accès et sessions sont chiffrés avec <code className="text-foreground font-mono">AES-256-GCM</code> et persistés de façon sécurisée.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer les paramètres
            </button>
          </div>
        </form>
        )}
      </div>

      <VibeCodingEngineModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
      />
    </div>
  );
}
