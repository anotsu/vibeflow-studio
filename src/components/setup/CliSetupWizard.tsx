// ============================================================
// VibeFlow Studio — Pro CLI Setup Wizard (Assistant de Configuration)
// Priorité absolue aux comptes Claude Pro & Google Gemini Pro (0€ token)
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bot,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Zap,
  HardDrive,
  Activity,
  Send,
  Key,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface CliSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CliDiagnosticData {
  claude: {
    installed: boolean;
    version: string;
    authenticated: boolean;
    status: "ready" | "api_fallback" | "setup_required";
    accountType: string;
    hasSessionFile: boolean;
    hasApiKey: boolean;
    sessionPath: string;
    details: string;
  };
  antigravity: {
    installed: boolean;
    version: string;
    authenticated: boolean;
    status: "ready" | "api_fallback" | "setup_required";
    accountType: string;
    hasSessionFile: boolean;
    hasApiKey: boolean;
    sessionPath: string;
    tokenSnippet?: string;
    details: string;
  };
  defaultEngine: string;
  serverHome: string;
  timestamp: string;
}

type WizardTab = "diagnostic" | "claude" | "antigravity" | "persistence";

export function CliSetupWizard({ isOpen, onClose }: CliSetupWizardProps) {
  const { addNotification, setActiveCliTab, setCliPanelOpen } = useUIStore();

  const [activeTab, setActiveTab] = useState<WizardTab>("diagnostic");
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [data, setData] = useState<CliDiagnosticData | null>(null);

  // Live test states
  const [claudeTestPrompt, setClaudeTestPrompt] = useState(
    "Explique en 1 phrase le rôle de Claude Code dans l'orchestration VibeFlow."
  );
  const [claudeTesting, setClaudeTesting] = useState(false);
  const [claudeTestResult, setClaudeTestResult] = useState<{
    success: boolean;
    content?: string;
    provider?: string;
    durationMs?: number;
    error?: string;
  } | null>(null);

  const [agyTestPrompt, setAgyTestPrompt] = useState(
    "Explique en 1 phrase comment Antigravity CLI garantit la vitesse et la précision."
  );
  const [agyTesting, setAgyTesting] = useState(false);
  const [agyTestResult, setAgyTestResult] = useState<{
    success: boolean;
    content?: string;
    provider?: string;
    durationMs?: number;
    error?: string;
  } | null>(null);

  // Token input states
  const [geminiTokenInput, setGeminiTokenInput] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  const [anthropicFallbackKey, setAnthropicFallbackKey] = useState("");
  const [savingFallbackKey, setSavingFallbackKey] = useState(false);

  // Global test state
  const [runningGlobalPing, setRunningGlobalPing] = useState(false);
  const [globalPingResult, setGlobalPingResult] = useState<{
    claudeOk: boolean;
    claudeProvider: string;
    agyOk: boolean;
    agyProvider: string;
    totalDurationMs: number;
  } | null>(null);

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    addNotification({
      type: "info",
      title: "Copié dans le presse-papier",
      message: text,
      autoDismissMs: 2500,
    });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const fetchDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const res = await fetch("/api/settings/cli-setup");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Erreur diagnostic");
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Échec du diagnostic CLIs",
        message: err.message || "Impossible de contacter l'API de diagnostic.",
        autoDismissMs: 4000,
      });
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  const handleTestClaude = async () => {
    setClaudeTesting(true);
    setClaudeTestResult(null);
    try {
      const res = await fetch("/api/settings/cli-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_claude",
          prompt: claudeTestPrompt,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setClaudeTestResult({
          success: true,
          content: resData.content,
          provider: resData.provider,
          durationMs: resData.durationMs,
        });
        addNotification({
          type: "success",
          title: "Test Claude Pro réussi !",
          message: `Réponse obtenue en ${resData.durationMs}ms via ${resData.provider}.`,
          autoDismissMs: 3000,
        });
      } else {
        setClaudeTestResult({
          success: false,
          error: resData.error || "Erreur lors du test Claude",
        });
      }
    } catch (err: any) {
      setClaudeTestResult({
        success: false,
        error: err.message || "Erreur de connexion",
      });
    } finally {
      setClaudeTesting(false);
    }
  };

  const handleTestAntigravity = async () => {
    setAgyTesting(true);
    setAgyTestResult(null);
    try {
      const res = await fetch("/api/settings/cli-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_antigravity",
          prompt: agyTestPrompt,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setAgyTestResult({
          success: true,
          content: resData.content,
          provider: resData.provider,
          durationMs: resData.durationMs,
        });
        addNotification({
          type: "success",
          title: "Test Antigravity Pro réussi !",
          message: `Réponse obtenue en ${resData.durationMs}ms via ${resData.provider}.`,
          autoDismissMs: 3000,
        });
      } else {
        setAgyTestResult({
          success: false,
          error: resData.error || "Erreur lors du test Antigravity",
        });
      }
    } catch (err: any) {
      setAgyTestResult({
        success: false,
        error: err.message || "Erreur de connexion",
      });
    } finally {
      setAgyTesting(false);
    }
  };

  const handleSaveGeminiToken = async () => {
    if (!geminiTokenInput.trim()) return;
    setSavingToken(true);
    try {
      const res = await fetch("/api/settings/cli-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_antigravity_token",
          token: geminiTokenInput.trim(),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        addNotification({
          type: "success",
          title: "Jeton Antigravity configuré !",
          message: "Enregistré dans ~/.gemini/antigravity-cli/settings.json",
          autoDismissMs: 3500,
        });
        setGeminiTokenInput("");
        fetchDiagnostics();
      } else {
        throw new Error(resData.error || "Erreur de sauvegarde");
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur enregistrement jeton",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setSavingToken(false);
    }
  };

  const handleSaveClaudeFallback = async () => {
    if (!anthropicFallbackKey.trim()) return;
    setSavingFallbackKey(true);
    try {
      const res = await fetch("/api/settings/cli-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_claude_fallback",
          key: anthropicFallbackKey.trim(),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        addNotification({
          type: "success",
          title: "Clé secours Anthropic enregistrée",
          message: "Conservée dans le coffre-fort chiffré.",
          autoDismissMs: 3500,
        });
        setAnthropicFallbackKey("");
        fetchDiagnostics();
      } else {
        throw new Error(resData.error || "Erreur de sauvegarde");
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur sauvegarde fallback",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setSavingFallbackKey(false);
    }
  };

  const handleRunGlobalPing = async () => {
    setRunningGlobalPing(true);
    setGlobalPingResult(null);
    try {
      const res = await fetch("/api/settings/cli-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_diagnostic" }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setGlobalPingResult({
          claudeOk: resData.claude.ok,
          claudeProvider: resData.claude.provider,
          agyOk: resData.antigravity.ok,
          agyProvider: resData.antigravity.provider,
          totalDurationMs: resData.totalDurationMs,
        });
        addNotification({
          type: "success",
          title: "Ping Dual-Agent Terminé",
          message: `Claude: ${resData.claude.ok ? "OK" : "Échec"} | Antigravity: ${resData.antigravity.ok ? "OK" : "Échec"} (${resData.totalDurationMs}ms)`,
          autoDismissMs: 3500,
        });
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Ping Global",
        message: err.message,
        autoDismissMs: 3000,
      });
    } finally {
      setRunningGlobalPing(false);
    }
  };

  const openTerminalForTab = (tab: "claude" | "antigravity") => {
    setActiveCliTab(tab);
    setCliPanelOpen(true);
    addNotification({
      type: "info",
      title: "Terminal CloudCLI ouvert",
      message: `Onglet ${tab.toUpperCase()} prêt pour l'authentification interactive.`,
      autoDismissMs: 3000,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div className="flex items-center gap-3">
            <VibeFlowLogo size="md" showText={false} withGlow />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Assistance CLIs Pro (0€ de jetons)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Par Défaut
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Configuration directe de vos abonnements Claude Pro et Google Gemini Pro pour un coût token nul.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostics}
              disabled={loadingDiag}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Rafraîchir le diagnostic"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDiag ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-secondary/30 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "diagnostic"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>État & Diagnostic</span>
          </button>

          <button
            onClick={() => setActiveTab("claude")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "claude"
                ? "border-claude text-claude"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Claude Code (Claude Pro)</span>
            {data?.claude.status === "ready" && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("antigravity")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "antigravity"
                ? "border-antigravity text-antigravity"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Antigravity CLI (Gemini Pro)</span>
            {data?.antigravity.status === "ready" && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("persistence")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "persistence"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Persistance Coolify</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingDiag && !data && (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm">Analyse des fichiers de session et des CLIs...</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 1: DIAGNOSTIC & SANTÉ GLOBALE                   */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "diagnostic" && data && (
            <div className="space-y-6">
              {/* Top Banner: Zero-cost policy */}
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-emerald-300">
                    Mode Économique Pro Actif par Défaut (0.00 € / token)
                  </p>
                  <p className="text-emerald-400/80 leading-relaxed">
                    VibeFlow Studio privilégie vos sessions officielles Claude Pro et Google Gemini Pro. 
                    Tant que vos sessions CLI sont associées, aucune facturation à l&apos;usage n&apos;est déclenchée.
                    Les clés API ne servent qu&apos;en cas de secours extrême.
                  </p>
                </div>
              </div>

              {/* Status Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claude Card */}
                <div className="p-5 rounded-xl bg-secondary/30 border border-border/80 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-claude/20 flex items-center justify-center text-claude">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Claude Code CLI</h3>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {data.claude.version}
                          </p>
                        </div>
                      </div>

                      {data.claude.status === "ready" ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Opérationnel
                        </span>
                      ) : data.claude.status === "api_fallback" ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" /> Fallback API
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                          <AlertCircle className="w-3.5 h-3.5" /> Connexion Requise
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Compte associé :</span>
                        <span className="font-semibold text-foreground">{data.claude.accountType}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Session persistée :</span>
                        <span className="font-mono text-[11px] text-foreground">
                          {data.claude.hasSessionFile ? "Oui (~/.claude)" : "Non"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Coût estimé / prompt :</span>
                        <span className="font-bold text-emerald-400">0.00 € (Inclus Pro)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-border/40 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("claude")}
                      className="flex-1 py-1.5 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors text-center"
                    >
                      Configurer / Tester
                    </button>
                    <button
                      onClick={() => openTerminalForTab("claude")}
                      className="py-1.5 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-1"
                      title="Ouvrir dans CloudCLI"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>claude login</span>
                    </button>
                  </div>
                </div>

                {/* Antigravity Card */}
                <div className="p-5 rounded-xl bg-secondary/30 border border-border/80 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-antigravity/20 flex items-center justify-center text-antigravity">
                          <Rocket className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Antigravity CLI (agy)</h3>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {data.antigravity.version}
                          </p>
                        </div>
                      </div>

                      {data.antigravity.status === "ready" ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Opérationnel
                        </span>
                      ) : data.antigravity.status === "api_fallback" ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" /> Clé Env
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                          <AlertCircle className="w-3.5 h-3.5" /> Jeton Requis
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Compte associé :</span>
                        <span className="font-semibold text-foreground">{data.antigravity.accountType}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Session persistée :</span>
                        <span className="font-mono text-[11px] text-foreground">
                          {data.antigravity.hasSessionFile ? "Oui (~/.gemini)" : "Non"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Coût estimé / prompt :</span>
                        <span className="font-bold text-emerald-400">0.00 € (Google AI Pro)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-border/40 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("antigravity")}
                      className="flex-1 py-1.5 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors text-center"
                    >
                      Configurer / Tester
                    </button>
                    <button
                      onClick={() => openTerminalForTab("antigravity")}
                      className="py-1.5 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-1"
                      title="Ouvrir dans CloudCLI"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>agy login</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ping Diagnostic Simultané */}
              <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Test d&apos;Intégration Simultané</h4>
                    <p className="text-xs text-muted-foreground">
                      Envoie une requête ping test en parallèle aux deux agents pour mesurer la latence et la disponibilité.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunGlobalPing}
                  disabled={runningGlobalPing}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shrink-0 shadow-sm disabled:opacity-50"
                >
                  {runningGlobalPing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ping en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Lancer le Ping Dual-Agent</span>
                    </>
                  )}
                </button>
              </div>

              {globalPingResult && (
                <div className="p-4 rounded-lg bg-black/40 border border-border/80 font-mono text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                    <span className="text-zinc-400">Résultats du Ping Dual-Agent :</span>
                    <span className="text-zinc-500">{globalPingResult.totalDurationMs} ms au total</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5 text-claude" />
                      <span>Claude Code Pro</span>
                    </span>
                    <span className={globalPingResult.claudeOk ? "text-emerald-400" : "text-red-400"}>
                      {globalPingResult.claudeOk ? `OK (${globalPingResult.claudeProvider})` : "Échec"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Rocket className="w-3.5 h-3.5 text-antigravity" />
                      <span>Antigravity CLI (Gemini Pro)</span>
                    </span>
                    <span className={globalPingResult.agyOk ? "text-emerald-400" : "text-red-400"}>
                      {globalPingResult.agyOk ? `OK (${globalPingResult.agyProvider})` : "Échec"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 2: CLAUDE CODE (CLAUDE PRO)                     */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "claude" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-claude/10 border border-claude/30">
                <Bot className="w-5 h-5 text-claude shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-claude">Authentification Claude Pro (0€ facturation)</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Claude Code se connecte directement à votre abonnement Anthropic Claude Pro.
                    Une fois authentifié dans le conteneur, tous les débats d&apos;architecture, audits et refactorings
                    sont inclus dans votre forfait sans consommer de tokens payants.
                  </p>
                </div>
              </div>

              {/* Step by step */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Étapes d&apos;authentification
                </h4>

                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        1
                      </span>
                      <span className="text-sm font-semibold">Ouvrir le terminal interactif</span>
                    </div>
                    <button
                      onClick={() => openTerminalForTab("claude")}
                      className="px-3 py-1.5 rounded-lg bg-claude text-white text-xs font-semibold hover:bg-claude/90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Ouvrir Terminal Claude</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Le terminal intégré se connecte directement au conteneur avec l&apos;environnement d&apos;exécution isolé.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        2
                      </span>
                      <span className="text-sm font-semibold">Lancer la commande de connexion</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard("claude login", "claude-login")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition-colors"
                    >
                      {copiedKey === "claude-login" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>claude login</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Collez cette commande dans le terminal. Claude affichera un lien unique vers votre navigateur pour lier votre compte Pro.
                  </p>
                </div>
              </div>

              {/* Interactive Live Prompt Tester */}
              <div className="p-5 rounded-xl border border-border bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-primary" />
                    <span>Tester la session Claude Pro en direct</span>
                  </h4>
                  {data?.claude.status === "ready" && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connecté
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={claudeTestPrompt}
                    onChange={(e) => setClaudeTestPrompt(e.target.value)}
                    placeholder="Posez une question courte pour valider la réponse..."
                    className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  />
                  <button
                    onClick={handleTestClaude}
                    disabled={claudeTesting || !claudeTestPrompt.trim()}
                    className="px-4 py-2 bg-claude text-white text-xs font-semibold rounded-lg hover:bg-claude/90 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {claudeTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Envoyer Test</span>
                  </button>
                </div>

                {claudeTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs space-y-1 font-mono border ${
                      claudeTestResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "bg-red-500/10 border-red-500/30 text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {claudeTestResult.success ? "✓ Réponse reçue :" : "✗ Échec du test :"}
                      </span>
                      {claudeTestResult.durationMs && (
                        <span className="text-zinc-400 font-sans text-[11px]">
                          {claudeTestResult.durationMs}ms ({claudeTestResult.provider})
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs leading-relaxed">
                      {claudeTestResult.content || claudeTestResult.error}
                    </p>
                  </div>
                )}
              </div>

              {/* Fallback Optionnel */}
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-secondary/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Clé API Anthropic de Secours (Facultatif)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Seulement si vous n&apos;avez pas de session interactive active ou si vous souhaitez un repli automatique.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={anthropicFallbackKey}
                    onChange={(e) => setAnthropicFallbackKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <button
                    onClick={handleSaveClaudeFallback}
                    disabled={savingFallbackKey || !anthropicFallbackKey.trim()}
                    className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingFallbackKey ? "Sauvegarde..." : "Enregistrer secours"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 3: ANTIGRAVITY CLI (GEMINI PRO)                 */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "antigravity" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-antigravity/10 border border-antigravity/30">
                <Rocket className="w-5 h-5 text-antigravity shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-antigravity">Antigravity CLI (Google Gemini Pro 0€)</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Antigravity CLI propulse le challenger autonome avec les modèles Google Gemini 2.0 Pro / Flash.
                    Grâce à Google AI Studio ou votre compte Google Cloud, le niveau gratuit inclus couvre des milliers de requêtes gratuites.
                  </p>
                </div>
              </div>

              {/* Token Configuration direct */}
              <div className="p-5 rounded-xl border border-border bg-card/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lier le jeton Gemini Pro dans Antigravity CLI
                  </h4>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Obtenir une clé Google AI (Gratuit)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {data?.antigravity.tokenSnippet && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Jeton configuré : {data.antigravity.tokenSnippet}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ~/.gemini/antigravity-cli/settings.json
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Entrez votre clé ou jeton Gemini Pro pour l&apos;enregistrer dans le conteneur :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={geminiTokenInput}
                      onChange={(e) => setGeminiTokenInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <button
                      onClick={handleSaveGeminiToken}
                      disabled={savingToken || !geminiTokenInput.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-sm"
                    >
                      {savingToken ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Rocket className="w-3.5 h-3.5" />
                      )}
                      <span>Lier à Antigravity</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Test Antigravity */}
              <div className="p-5 rounded-xl border border-border bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-antigravity" />
                    <span>Tester Antigravity CLI en direct</span>
                  </h4>
                  {data?.antigravity.status === "ready" && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connecté
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={agyTestPrompt}
                    onChange={(e) => setAgyTestPrompt(e.target.value)}
                    placeholder="Prompt de test Antigravity..."
                    className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  />
                  <button
                    onClick={handleTestAntigravity}
                    disabled={agyTesting || !agyTestPrompt.trim()}
                    className="px-4 py-2 bg-antigravity text-white text-xs font-semibold rounded-lg hover:bg-antigravity/90 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {agyTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Envoyer Test</span>
                  </button>
                </div>

                {agyTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs space-y-1 font-mono border ${
                      agyTestResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "bg-red-500/10 border-red-500/30 text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {agyTestResult.success ? "✓ Réponse Antigravity reçue :" : "✗ Échec du test :"}
                      </span>
                      {agyTestResult.durationMs && (
                        <span className="text-zinc-400 font-sans text-[11px]">
                          {agyTestResult.durationMs}ms ({agyTestResult.provider})
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs leading-relaxed">
                      {agyTestResult.content || agyTestResult.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 4: PERSISTANCE COOLIFY & DOCKER VOLUMES         */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "persistence" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <HardDrive className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-amber-300">
                    Persistance des Sessions Pro à Travers les Déploiements Coolify
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Par défaut, un conteneur Docker recréé lors d&apos;un nouveau push git perd les sessions stockées dans son système de fichiers temporaire.
                    En montant deux volumes persistants dans l&apos;interface Coolify, vos sessions Claude Pro et Antigravity restent actives pour toujours.
                  </p>
                </div>
              </div>

              {/* Volumes Snippets */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Configuration des Volumes dans Coolify (Onglet &quot;Storages&quot;)
                </h4>

                {/* Volume Claude */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-claude flex items-center gap-1.5">
                      <Bot className="w-4 h-4" />
                      Session Claude Code Pro
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          "/root/.claude:/home/nextjs/.claude",
                          "vol-claude"
                        )
                      }
                      className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-xs font-mono flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === "vol-claude" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copier le montage</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded bg-black/50 border border-zinc-800 font-mono text-xs text-zinc-300">
                    Host: <code>/root/.claude</code> → Conteneur: <code>/home/nextjs/.claude</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Préserve votre jeton OAuth Claude Pro lors de chaque redéploiement d&apos;image.
                  </p>
                </div>

                {/* Volume Antigravity */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-antigravity flex items-center gap-1.5">
                      <Rocket className="w-4 h-4" />
                      Configuration Antigravity CLI (Gemini Pro)
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          "/root/.gemini:/home/nextjs/.gemini",
                          "vol-gemini"
                        )
                      }
                      className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-xs font-mono flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === "vol-gemini" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copier le montage</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded bg-black/50 border border-zinc-800 font-mono text-xs text-zinc-300">
                    Host: <code>/root/.gemini</code> → Conteneur: <code>/home/nextjs/.gemini</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Conserve les clés et paramètres Antigravity sans avoir à les ressaisir.
                  </p>
                </div>

                {/* Summary Table */}
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
                  <span className="text-xs font-semibold text-foreground">
                    Procédure en 3 clics dans Coolify :
                  </span>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1.5">
                    <li>Rendez-vous dans votre application Coolify (VibeFlow Studio).</li>
                    <li>Ouvrez l&apos;onglet <strong>Storages / Persistent Storage</strong>.</li>
                    <li>
                      Ajoutez les deux montages ci-dessus en mode <strong>Host Mount</strong> puis redéployez.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Moteur principal : CLIs Officielles (Claude Pro + Antigravity Pro)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-colors"
          >
            Fermer l&apos;assistance
          </button>
        </div>
      </div>
    </div>
  );
}
