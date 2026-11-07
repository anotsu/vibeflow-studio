// ============================================================
// VibeFlow Studio — Credit Balance & Pro CLI Quota Controller
// Tracks live quotas on Claude Code CLI & Antigravity (ary) CLI
// Plus switch for Overage authorization & paid credit usage
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ShieldCheck,
  Zap,
  Bot,
  Sparkles,
  RefreshCw,
  X,
  Lock,
  Unlock,
  Sliders,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

export interface CreditProviderInfo {
  provider: "claude" | "gemini";
  name: string;
  planType: "PRO_SUBSCRIPTION" | "FREE_TIER" | "PAY_AS_YOU_GO";
  balanceEur: number;
  quotaUsedPercent: number;
  quotaRemainingLabel: string;
  status: "HEALTHY" | "LOW_CREDIT" | "EXHAUSTED" | "NOT_CONFIGURED";
  resetPeriod?: string;
  tokensConsumedToday: number;
  lastUpdated: string;
}

export interface CliQuotaInfo {
  provider: "claude-code" | "antigravity";
  name: string;
  cliBinary: string;
  installed: boolean;
  authenticated: boolean;
  accountLabel: string;
  remainingPercent: number;
  remainingLabel: string;
  usedTodayCount: number;
  maxLimitLabel: string;
  resetEstimate: string;
  status: "OPTIMAL" | "MODERATE" | "LOW" | "NOT_CONNECTED";
  statusText: string;
  tokenSnippet?: string;
}

export interface CreditOverageSettings {
  overageAllowed: boolean;
  overageLimitEur: number;
  currentOverageUsedEur: number;
  autoStopOnExhausted: boolean;
  updatedAt: string;
}

export interface CreditStatusSummary {
  claude: CreditProviderInfo;
  gemini: CreditProviderInfo;
  cliQuotas: {
    claudeCode: CliQuotaInfo;
    antigravity: CliQuotaInfo;
  };
  overageSettings: CreditOverageSettings;
  totalEstimatedBalanceEur: number;
  modeActiveLabel: string;
  timestamp: string;
}

const DEFAULT_SUMMARY: CreditStatusSummary = {
  claude: {
    provider: "claude",
    name: "Anthropic Claude",
    planType: "PRO_SUBSCRIPTION",
    balanceEur: 20.0,
    quotaUsedPercent: 12,
    quotaRemainingLabel: "Claude Pro (0€ token)",
    status: "HEALTHY",
    tokensConsumedToday: 0,
    lastUpdated: new Date().toISOString(),
  },
  gemini: {
    provider: "gemini",
    name: "Google Gemini (Antigravity)",
    planType: "FREE_TIER",
    balanceEur: 45.0,
    quotaUsedPercent: 6,
    quotaRemainingLabel: "1 500 / 1 500 req/jour",
    status: "HEALTHY",
    tokensConsumedToday: 0,
    lastUpdated: new Date().toISOString(),
  },
  cliQuotas: {
    claudeCode: {
      provider: "claude-code",
      name: "Claude Code CLI",
      cliBinary: "claude",
      installed: true,
      authenticated: true,
      accountLabel: "Abonnement Claude Pro lié (0€)",
      remainingPercent: 92,
      remainingLabel: "92% dispo (Fenêtre 5h)",
      usedTodayCount: 0,
      maxLimitLabel: "Fenêtre glissante 5h · Claude Pro Illimité",
      resetEstimate: "Continu / Immédiat",
      status: "OPTIMAL",
      statusText: "Quota fluide (0€)",
    },
    antigravity: {
      provider: "antigravity",
      name: "Antigravity CLI (ary)",
      cliBinary: "agy",
      installed: true,
      authenticated: true,
      accountLabel: "Google AI Studio Free Tier (0€)",
      remainingPercent: 96,
      remainingLabel: "1 440 / 1 500 req/jour",
      usedTodayCount: 0,
      maxLimitLabel: "1 500 RPD · 15 RPM (Free Tier)",
      resetEstimate: "Quotidien (Minuit UTC)",
      status: "OPTIMAL",
      statusText: "Quota abondant (0€)",
    },
  },
  overageSettings: {
    overageAllowed: false,
    overageLimitEur: 10.0,
    currentOverageUsedEur: 0.0,
    autoStopOnExhausted: true,
    updatedAt: new Date().toISOString(),
  },
  totalEstimatedBalanceEur: 65.0,
  modeActiveLabel: "Overage Désactivé (0€ Garanti)",
  timestamp: new Date().toISOString(),
};

/**
 * TopBar compact widget showing remaining quotas for Claude Code and ary (Antigravity),
 * along with the live Overage status.
 */
export function CreditBalanceBadge() {
  const [data, setData] = useState<CreditStatusSummary>(DEFAULT_SUMMARY);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats/credits");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 25000);
    return () => clearInterval(interval);
  }, []);

  const isOverageOn = Boolean(data.overageSettings?.overageAllowed);
  const claudeCode = data.cliQuotas?.claudeCode;
  const ary = data.cliQuotas?.antigravity;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-xs transition-all shadow-sm group"
        title="Quotas restants sur Claude Code & ary · Contrôleur d'Overage"
      >
        <Gauge className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />

        {/* Claude Code Remaining Quota */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              claudeCode?.authenticated ? "bg-claude animate-pulse" : "bg-zinc-500"
            }`}
          />
          <span className="text-claude font-semibold hidden sm:inline">Claude:</span>
          <span className="text-foreground font-medium">
            {claudeCode?.authenticated ? `${claudeCode.remainingPercent}%` : "Non lié"}
          </span>
        </div>

        <span className="text-muted-foreground/60">·</span>

        {/* ary (Antigravity) Remaining Quota */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              ary?.authenticated ? "bg-antigravity animate-pulse" : "bg-zinc-500"
            }`}
          />
          <span className="text-antigravity font-semibold hidden sm:inline">ary:</span>
          <span className="text-foreground font-medium">
            {ary?.authenticated ? `${ary.remainingPercent}%` : "Free"}
          </span>
        </div>

        {/* Overage Status Pill */}
        <span
          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border transition-colors ${
            isOverageOn
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {isOverageOn ? "Overage ON" : "0€ Max"}
        </span>
      </button>

      {modalOpen && (
        <CreditBalanceModal
          data={data}
          onClose={() => setModalOpen(false)}
          onRefresh={fetchCredits}
          isLoading={loading}
        />
      )}
    </>
  );
}

/**
 * Detailed modal with remaining quotas on Claude Code CLI and ary (Antigravity),
 * plus the main ON/OFF Switch for Overage / paid credit usage.
 */
export function CreditBalanceModal({
  data,
  onClose,
  onRefresh,
  isLoading,
}: {
  data: CreditStatusSummary;
  onClose: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const { addNotification, setActiveCliTab, setCliPanelOpen, setCliPanelMaximized } = useUIStore();
  const [activeTab, setActiveTab] = useState<"quotas" | "overage">("quotas");
  const [toggling, setToggling] = useState(false);
  const [overageAllowed, setOverageAllowed] = useState(
    Boolean(data.overageSettings?.overageAllowed)
  );
  const [overageLimit, setOverageLimit] = useState(
    data.overageSettings?.overageLimitEur || 10
  );

  const claudeCode = data.cliQuotas?.claudeCode;
  const ary = data.cliQuotas?.antigravity;

  const handleToggleOverage = async () => {
    setToggling(true);
    const nextVal = !overageAllowed;
    try {
      const res = await fetch("/api/stats/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_overage",
          overageAllowed: nextVal,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setOverageAllowed(nextVal);
        addNotification({
          type: nextVal ? "warning" : "success",
          title: nextVal ? "Overage Activé" : "Overage Désactivé",
          message: resData.message,
          autoDismissMs: 4000,
        });
        onRefresh();
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: err.message || "Impossible de modifier le mode overage",
        autoDismissMs: 3000,
      });
    } finally {
      setToggling(false);
    }
  };

  const handleUpdateLimit = async (limitVal: number) => {
    setOverageLimit(limitVal);
    try {
      await fetch("/api/stats/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          overageLimitEur: limitVal,
        }),
      });
      onRefresh();
    } catch {}
  };

  const openTerminalTab = (tab: "claude" | "antigravity") => {
    setActiveCliTab(tab);
    setCliPanelOpen(true);
    setCliPanelMaximized(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 border-b border-border bg-card/90">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Quotas CLIs (Claude Code & ary) · Contrôle Overage
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Suivi en temps réel des quotas restants et protection 0€
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                title="Rafraîchir les quotas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 -mb-px">
            <button
              onClick={() => setActiveTab("quotas")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "quotas"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Quotas Restants CLIs (ary & Claude)</span>
            </button>
            <button
              onClick={() => setActiveTab("overage")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "overage"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Contrôle Overage ({overageAllowed ? "ON" : "OFF"})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* ════════════ TAB 1: CLI QUOTAS (CLAUDE CODE & ARY) ════════════ */}
          {activeTab === "quotas" && (
            <div className="space-y-4">
              {/* Card 1: Claude Code CLI */}
              <div className="p-4 rounded-xl border border-claude/30 bg-claude/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-claude/20 text-claude flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-claude">Claude Code CLI (`claude`)</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {claudeCode?.accountLabel || "Session Claude Pro"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      claudeCode?.authenticated
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {claudeCode?.authenticated ? "● Quota Actif (0€)" : "Non associé"}
                  </span>
                </div>

                {/* Quota Progress Bar */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Quota restant (Fenêtre glissante 5h) :
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {claudeCode?.remainingLabel}
                    </span>
                  </div>

                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-claude rounded-full transition-all duration-500"
                      style={{ width: `${claudeCode?.remainingPercent || 10}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-claude/20 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-claude" />
                      <span>Reset fenêtre : {claudeCode?.resetEstimate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Activity className="w-3 h-3 text-claude" />
                      <span>{claudeCode?.usedTodayCount || 0} prompts traités j.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-400">
                    Limite : {claudeCode?.maxLimitLabel}
                  </span>
                  <button
                    onClick={() => openTerminalTab("claude")}
                    className="flex items-center gap-1 text-[11px] font-medium text-claude hover:underline"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Ouvrir terminal (`claude`)</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Antigravity CLI (`ary`) */}
              <div className="p-4 rounded-xl border border-antigravity/30 bg-antigravity/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-antigravity/20 text-antigravity flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-antigravity">Antigravity CLI (`ary` / Gemini)</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {ary?.accountLabel || "Google AI Studio Free Tier"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      ary?.authenticated
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {ary?.authenticated ? "● Quota Actif (0€)" : "Non associé"}
                  </span>
                </div>

                {/* Quota Progress Bar */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Requêtes gratuites restantes :
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {ary?.remainingLabel} ({ary?.remainingPercent}%)
                    </span>
                  </div>

                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-antigravity rounded-full transition-all duration-500"
                      style={{ width: `${ary?.remainingPercent || 10}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-antigravity/20 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-antigravity" />
                      <span>Reset quota : {ary?.resetEstimate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Zap className="w-3 h-3 text-antigravity" />
                      <span>Débit : 15 RPM max</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-400">
                    Limite : {ary?.maxLimitLabel}
                  </span>
                  <button
                    onClick={() => openTerminalTab("antigravity")}
                    className="flex items-center gap-1 text-[11px] font-medium text-antigravity hover:underline"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Ouvrir terminal (`agy`)</span>
                  </button>
                </div>
              </div>

              {/* Status summary guarantee */}
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="text-foreground font-semibold">100% Autonomie Pro & Quota Gratuit : </span>
                  Vos requêtes s&apos;exécutent sur vos abonnements illimités Claude Pro et les 1 500 req/jour offertes par Google AI Studio. Vos cartes bancaires ne sont pas sollicitées.
                </div>
              </div>
            </div>
          )}

          {/* ════════════ TAB 2: OVERAGE CONTROLLER ════════════ */}
          {activeTab === "overage" && (
            <div className="space-y-4">
              {/* Main Switch */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  overageAllowed
                    ? "bg-amber-950/20 border-amber-500/40"
                    : "bg-emerald-950/20 border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        overageAllowed
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {overageAllowed ? (
                        <Unlock className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Bouton Overage : Utiliser des crédits payants
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {overageAllowed
                          ? "ACTIVÉ : En cas de dépassement des quotas de Claude Code ou d'ary, VibeFlow utilise vos clés d'API payantes pour ne pas bloquer le développement."
                          : "DÉSACTIVÉ (Mode Sécurisé 0€) : Les agents s'en tiennent strictement aux quotas gratuits et abonnements Pro. Aucun centime supplémentaire."}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={handleToggleOverage}
                    disabled={toggling}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      overageAllowed ? "bg-amber-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        overageAllowed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Spending Cap */}
                {overageAllowed && (
                  <div className="mt-3.5 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" /> Plafond d&apos;overage max autorisé :
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[5, 10, 20, 50].map((val) => (
                        <button
                          key={val}
                          onClick={() => handleUpdateLimit(val)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                            overageLimit === val
                              ? "bg-amber-500 text-black font-bold"
                              : "bg-secondary hover:bg-secondary/80 text-foreground"
                          }`}
                        >
                          {val} €
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Safety policy */}
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Lorsque l&apos;option Overage est <strong>DÉSACTIVÉE</strong>, le système applique un verrou strict au niveau du routeur d&apos;intelligence artificielle (`ai-provider.ts`). Aucun appel API tarifé n&apos;est déclenché.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-card/60">
          <span className="text-[11px] text-muted-foreground font-mono">
            Mode : {overageAllowed ? "Overage Autorisé" : "0€ Garanti (Sécurisé)"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
