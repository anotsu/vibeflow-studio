// ============================================================
// VibeFlow Studio — VibeCoding Engine & Plans Matrix Modal
// Configure any subscription for Claude, Gemini, and ChatGPT Codex.
// Choose to VibeCode with 1 provider (Solo), 2 (Duel), or all 3 (Trio)!
// ============================================================
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Zap,
  Check,
  ShieldCheck,
  Cpu,
  Key,
  RefreshCw,
  Terminal,
  ExternalLink,
  Loader2,
  Copy,
  Sparkles,
  Layers,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Bot,
  Send,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import type { CliTab } from "@/types";
import type {
  AIProviderId,
  VibeCodingMode,
  ProviderConfig,
  VibeCodingEngineConfig,
} from "@/lib/provider-plans";

interface VibeCodingEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCliTerminal?: () => void;
}

export function VibeCodingEngineModal({
  isOpen,
  onClose,
  onOpenCliTerminal,
}: VibeCodingEngineModalProps) {
  const { addNotification, setActiveCliTab, setCliPanelOpen } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [engineConfig, setEngineConfig] = useState<VibeCodingEngineConfig | null>(null);
  const [providers, setProviders] = useState<Record<AIProviderId, ProviderConfig> | null>(null);
  const [selectedActiveProviders, setSelectedActiveProviders] = useState<AIProviderId[]>([
    "claude",
    "gemini",
  ]);

  const [activeTab, setActiveTab] = useState<AIProviderId>("claude");
  const [savingEngine, setSavingEngine] = useState(false);
  const [savingProvider, setSavingProvider] = useState<AIProviderId | null>(null);

  // Form states per provider
  const [apiKeysInput, setApiKeysInput] = useState<Record<AIProviderId, string>>({
    claude: "",
    gemini: "",
    openai: "",
  });
  const [selectedPlans, setSelectedPlans] = useState<Record<AIProviderId, string>>({
    claude: "CLAUDE_PRO",
    gemini: "GEMINI_ADVANCED",
    openai: "CHATGPT_PLUS",
  });
  const [selectedModels, setSelectedModels] = useState<Record<AIProviderId, string>>({
    claude: "claude-3-5-sonnet-20241022",
    gemini: "gemini-2.0-flash",
    openai: "gpt-4o",
  });

  // Test connection states
  const [testingProvider, setTestingProvider] = useState<AIProviderId | null>(null);
  const [testResults, setTestResults] = useState<
    Record<
      AIProviderId,
      { success: boolean; latencyMs?: number; providerUsed?: string; snippet?: string; error?: string } | null
    >
  >({
    claude: null,
    gemini: null,
    openai: null,
  });

  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/providers");
      if (!res.ok) throw new Error("Échec de chargement des paramètres");
      const data = await res.json();
      if (data.success) {
        setEngineConfig(data.engine);
        setProviders(data.providers);
        setSelectedActiveProviders(data.engine.activeProviders || ["claude", "gemini"]);

        // Sync local form states
        if (data.providers) {
          setSelectedPlans({
            claude: data.providers.claude.selectedPlan,
            gemini: data.providers.gemini.selectedPlan,
            openai: data.providers.openai.selectedPlan,
          });
          setSelectedModels({
            claude: data.providers.claude.defaultModel,
            gemini: data.providers.gemini.defaultModel,
            openai: data.providers.openai.defaultModel,
          });
        }
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: err?.message || "Impossible de récupérer les fournisseurs IA.",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
    }
  }, [isOpen, fetchConfigs]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle active provider selection (1, 2, or 3)
  const handleToggleProvider = (id: AIProviderId) => {
    let next: AIProviderId[];
    if (selectedActiveProviders.includes(id)) {
      if (selectedActiveProviders.length === 1) {
        addNotification({
          type: "warning",
          title: "Sélection requise",
          message: "Au moins un fournisseur doit rester actif pour vibecoder !",
          autoDismissMs: 2500,
        });
        return;
      }
      next = selectedActiveProviders.filter((p) => p !== id);
    } else {
      next = [...selectedActiveProviders, id];
    }
    setSelectedActiveProviders(next);
  };

  const handleApplyEngineConfig = async () => {
    try {
      setSavingEngine(true);
      const res = await fetch("/api/settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_engine",
          activeProviders: selectedActiveProviders,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEngineConfig(data.engine);
        addNotification({
          type: "success",
          title: "Moteur IA mis à jour",
          message: data.message || `Mode ${data.engine.mode} activé avec succès.`,
          autoDismissMs: 3500,
        });
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible d'appliquer la configuration du moteur IA.",
      });
    } finally {
      setSavingEngine(false);
    }
  };

  const handleSaveProviderConfig = async (providerId: AIProviderId) => {
    try {
      setSavingProvider(providerId);
      const res = await fetch("/api/settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_provider",
          provider: providerId,
          plan: selectedPlans[providerId],
          model: selectedModels[providerId],
          apiKey: apiKeysInput[providerId] || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "success",
          title: "Forfait enregistré",
          message: data.message || "Configuration enregistrée avec succès.",
          autoDismissMs: 3000,
        });
        await fetchConfigs();
      }
    } catch {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible d'enregistrer la configuration du fournisseur.",
      });
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTestProvider = async (providerId: AIProviderId) => {
    try {
      setTestingProvider(providerId);
      setTestResults((prev) => ({ ...prev, [providerId]: null }));

      const res = await fetch("/api/settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_provider",
          provider: providerId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResults((prev) => ({
          ...prev,
          [providerId]: {
            success: true,
            latencyMs: data.latencyMs,
            providerUsed: data.providerUsed,
            snippet: data.snippet,
          },
        }));
        addNotification({
          type: "success",
          title: `Connexion ${providerId.toUpperCase()} OK`,
          message: `Réponse reçue en ${data.latencyMs} ms via ${data.providerUsed}`,
          autoDismissMs: 3500,
        });
      } else {
        setTestResults((prev) => ({
          ...prev,
          [providerId]: {
            success: false,
            error: data.details || "Échec de réponse de l'agent",
          },
        }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          error: err?.message || "Erreur réseau lors du test",
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleOpenTerminal = (provider: "claude" | "gemini" | "openai" | "bash") => {
    const cliTab: CliTab = provider === "gemini" ? "antigravity" : provider === "openai" ? "bash" : provider;
    setActiveCliTab(cliTab);
    setCliPanelOpen(true);
    onClose();
  };

  if (!isOpen) return null;

  const currentModeCount = selectedActiveProviders.length;
  const currentMode: VibeCodingMode =
    currentModeCount >= 3 ? "TRIO" : currentModeCount === 2 ? "DUEL" : "SOLO";

  const currentProvider = providers ? providers[activeTab] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/15 via-cyan-500/15 to-emerald-500/15 border border-primary/25 flex items-center justify-center text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Matrice VibeCoding & Forfaits IA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
                  1, 2 ou 3 Modèles
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connectez n&apos;importe quel forfait (Claude, Gemini, ChatGPT Codex) et composez votre équipe de développement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── SECTION 1: Multi-Provider Selection Bar (Solo / Duel / Trio) ── */}
        <div className="p-5 bg-secondary/30 border-b border-border shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Composition de votre Équipe d&apos;Agents
              </h3>
              <p className="text-xs text-foreground font-medium mt-0.5">
                Cochez 1, 2 ou 3 fournisseurs pour adapter votre flux de VibeCoding :
              </p>
            </div>

            {/* Mode Result Badge */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                  currentMode === "TRIO"
                    ? "bg-gradient-to-r from-purple-500/15 via-cyan-500/15 to-emerald-500/15 text-foreground border-emerald-500/40"
                    : currentMode === "DUEL"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                }`}
              >
                {currentMode === "TRIO" && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                {currentMode === "DUEL" && <Layers className="w-3.5 h-3.5 text-primary" />}
                {currentMode === "SOLO" && <CircleDot className="w-3.5 h-3.5 text-blue-400" />}
                <span>
                  {currentMode === "TRIO"
                    ? "⚡ Mode Triumvirat (3 Modèles)"
                    : currentMode === "DUEL"
                    ? "⚔️ Mode Duel Dual-Branch (2 Modèles)"
                    : "🎯 Mode Solo VibeCoder (1 Modèle)"}
                </span>
              </div>

              <button
                onClick={handleApplyEngineConfig}
                disabled={savingEngine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
              >
                {savingEngine ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Appliquer</span>
              </button>
            </div>
          </div>

          {/* 3 Provider Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Claude Card */}
            <div
              onClick={() => handleToggleProvider("claude")}
              className={`cursor-pointer rounded-xl p-3.5 border transition-all flex items-start gap-3 ${
                selectedActiveProviders.includes("claude")
                  ? "bg-purple-500/10 border-purple-500/50 shadow-sm"
                  : "bg-card/40 border-border opacity-60 hover:opacity-100"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                  selectedActiveProviders.includes("claude")
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-card border-border"
                }`}
              >
                {selectedActiveProviders.includes("claude") && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Claude</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/25">
                    Anthropic
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Rigueur & Typage strict
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      providers?.claude.connectionStatus !== "NOT_CONNECTED"
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="text-muted-foreground truncate">
                    {providers?.claude.accountLabel || "Vérification..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Gemini Card */}
            <div
              onClick={() => handleToggleProvider("gemini")}
              className={`cursor-pointer rounded-xl p-3.5 border transition-all flex items-start gap-3 ${
                selectedActiveProviders.includes("gemini")
                  ? "bg-cyan-500/10 border-cyan-500/50 shadow-sm"
                  : "bg-card/40 border-border opacity-60 hover:opacity-100"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                  selectedActiveProviders.includes("gemini")
                    ? "bg-cyan-500 text-black border-cyan-500 font-bold"
                    : "bg-card border-border"
                }`}
              >
                {selectedActiveProviders.includes("gemini") && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Gemini Pro</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/25">
                    Google
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Vitesse & Contexte 1M
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      providers?.gemini.connectionStatus !== "NOT_CONNECTED"
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="text-muted-foreground truncate">
                    {providers?.gemini.accountLabel || "Vérification..."}
                  </span>
                </div>
              </div>
            </div>

            {/* ChatGPT Codex Card */}
            <div
              onClick={() => handleToggleProvider("openai")}
              className={`cursor-pointer rounded-xl p-3.5 border transition-all flex items-start gap-3 ${
                selectedActiveProviders.includes("openai")
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm"
                  : "bg-card/40 border-border opacity-60 hover:opacity-100"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                  selectedActiveProviders.includes("openai")
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-card border-border"
                }`}
              >
                {selectedActiveProviders.includes("openai") && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">ChatGPT Codex</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/25">
                    OpenAI
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Algorithmes & Raisonnement
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      providers?.openai.connectionStatus !== "NOT_CONNECTED"
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="text-muted-foreground truncate">
                    {providers?.openai.accountLabel || "Vérification..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Detailed Provider Tabs (Configure Specific Plans & Keys) ── */}
        <div className="flex items-center border-b border-border bg-card/60 px-6 shrink-0">
          <button
            onClick={() => setActiveTab("claude")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "claude"
                ? "text-purple-400 border-purple-500 bg-purple-500/5"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Anthropic Claude</span>
          </button>

          <button
            onClick={() => setActiveTab("gemini")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "gemini"
                ? "text-cyan-400 border-cyan-500 bg-cyan-500/5"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Google Gemini</span>
          </button>

          <button
            onClick={() => setActiveTab("openai")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "openai"
                ? "text-emerald-400 border-emerald-500 bg-emerald-500/5"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ChatGPT Codex (OpenAI)</span>
          </button>
        </div>

        {/* ── Tab Content Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !currentProvider ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-foreground">Chargement des forfaits...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{currentProvider.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        currentProvider.connectionStatus === "CONNECTED_CLI"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : currentProvider.connectionStatus === "CONNECTED_API"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {currentProvider.connectionStatus === "CONNECTED_CLI"
                        ? "CLI Liée (0€ Token)"
                        : currentProvider.connectionStatus === "CONNECTED_API"
                        ? "Clé API Active"
                        : "Non Connecté"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentProvider.tagline}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestProvider(activeTab)}
                    disabled={testingProvider === activeTab}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-all disabled:opacity-50"
                  >
                    {testingProvider === activeTab ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <ActivityIcon className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Tester la Connexion</span>
                  </button>

                  <button
                    onClick={() => handleSaveProviderConfig(activeTab)}
                    disabled={savingProvider === activeTab}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {savingProvider === activeTab ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>

              {/* Test Result Display */}
              {testResults[activeTab] && (
                <div
                  className={`p-3.5 rounded-xl border text-xs animate-in fade-in ${
                    testResults[activeTab]?.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5">
                      {testResults[activeTab]?.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Test Réussi ({testResults[activeTab]?.latencyMs} ms)
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          Échec du test de connectivité
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Provider: {testResults[activeTab]?.providerUsed || "N/A"}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/80 font-mono mt-1 bg-black/30 p-2 rounded-lg">
                    {testResults[activeTab]?.snippet || testResults[activeTab]?.error}
                  </p>
                </div>
              )}

              {/* Step 1: Select Plan Tier */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-2">
                  1. Quel forfait détenez-vous pour {currentProvider.name} ?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentProvider.availablePlans.map((plan) => {
                    const isSelected = selectedPlans[activeTab] === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() =>
                          setSelectedPlans((prev) => ({ ...prev, [activeTab]: plan.id }))
                        }
                        className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-sm"
                            : "bg-card hover:bg-secondary/40 border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-foreground">{plan.label}</span>
                            <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground border border-border">
                              {plan.badge}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          {plan.description}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{plan.quotaDescription}</span>
                          <span className="font-semibold text-foreground">{plan.priceNote}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Connection Method & Auth */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-4">
                <label className="block text-xs font-bold text-foreground">
                  2. Authentification & Connexion
                </label>

                {/* CLI Instructions */}
                <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/70 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                      Option Recommandée : Authentification CLI (0€ Token)
                    </span>
                    <button
                      onClick={() =>
                        handleOpenTerminal(
                          activeTab === "claude" ? "claude" : activeTab === "gemini" ? "gemini" : "bash"
                        )
                      }
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Ouvrir Terminal VibeFlow
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Exécutez cette commande dans le terminal intégré pour lier votre compte Pro/Plus/Advanced :
                  </p>
                  <div className="flex items-center justify-between p-2 rounded bg-black/40 font-mono text-xs text-emerald-400">
                    <span>
                      {activeTab === "claude"
                        ? "claude login"
                        : activeTab === "gemini"
                        ? "agy login"
                        : "codex login"}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          activeTab === "claude"
                            ? "claude login"
                            : activeTab === "gemini"
                            ? "agy login"
                            : "codex login"
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                      title="Copier la commande"
                    >
                      {copiedCmd ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* API Key Fallback */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Key className="w-3 h-3 text-muted-foreground" />
                      Option Alternative : Clé API Directe ({activeTab.toUpperCase()})
                    </label>
                    {currentProvider.apiKeyMasked && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Actuelle: {currentProvider.apiKeyMasked}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={apiKeysInput[activeTab]}
                    onChange={(e) =>
                      setApiKeysInput((prev) => ({ ...prev, [activeTab]: e.target.value }))
                    }
                    placeholder={
                      activeTab === "claude"
                        ? "sk-ant-api03-..."
                        : activeTab === "gemini"
                        ? "AIzaSy..."
                        : "sk-proj-..."
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-secondary/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    La clé est chiffrée en AES-256 dans PostgreSQL. Elle ne sera utilisée que si vous activez l&apos;Overage ou en cas d&apos;indisponibilité du CLI.
                  </p>
                </div>

                {/* Model Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-muted-foreground" />
                    Modèle par Défaut
                  </label>
                  <select
                    value={selectedModels[activeTab]}
                    onChange={(e) =>
                      setSelectedModels((prev) => ({ ...prev, [activeTab]: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {currentProvider.availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
