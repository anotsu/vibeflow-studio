// ============================================================
// VibeFlow Studio — Credit Balance & Overage Controller
// Replaces previous Token Savings cockpit with remaining credits
// vision for Claude & Gemini, plus toggle for Overage authorization
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Bot,
  Sparkles,
  RefreshCw,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Sliders,
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
    quotaUsedPercent: 15,
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
    quotaUsedPercent: 8,
    quotaRemainingLabel: "1 500 / 1 500 req/jour",
    status: "HEALTHY",
    tokensConsumedToday: 0,
    lastUpdated: new Date().toISOString(),
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
 * TopBar compact badge showing remaining credits for Claude and Gemini,
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

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-xs transition-all shadow-sm group"
        title="Vision des crédits restants Claude & Gemini · Contrôleur d'Overage"
      >
        <Wallet className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />

        {/* Claude Remaining */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-claude" />
          <span className="text-claude font-semibold hidden sm:inline">Claude:</span>
          <span className="text-foreground font-medium">
            {data.claude.planType === "PRO_SUBSCRIPTION"
              ? "Pro 0€"
              : `${data.claude.balanceEur.toFixed(1)}$`}
          </span>
        </div>

        <span className="text-muted-foreground/60">·</span>

        {/* Gemini Remaining */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-antigravity" />
          <span className="text-antigravity font-semibold hidden sm:inline">Gemini:</span>
          <span className="text-foreground font-medium">
            {data.gemini.quotaRemainingLabel.includes("req/jour")
              ? "Free"
              : `${data.gemini.balanceEur.toFixed(1)}$`}
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
 * Detailed modal with remaining credits breakdown for Claude and Gemini,
 * and the main ON/OFF Switch for Overage / paid credit usage.
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
  const { addNotification } = useUIStore();
  const [toggling, setToggling] = useState(false);
  const [overageAllowed, setOverageAllowed] = useState(
    Boolean(data.overageSettings?.overageAllowed)
  );
  const [overageLimit, setOverageLimit] = useState(
    data.overageSettings?.overageLimitEur || 10
  );

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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Vision des Crédits & Contrôle Overage</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Suivi des quotas Claude & Gemini · Protection contre les dépassements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Rafraîchir les soldes"
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

        {/* Body Content */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* ── 1. MAIN OVERAGE SWITCH (USER REQUESTED) ── */}
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
                    Autoriser l&apos;Overage & les Crédits Payants
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {overageAllowed
                      ? "ACTIVÉ : Si votre compte Pro ou quota gratuit s'épuise, VibeFlow utilise vos crédits API pour éviter d'interrompre vos tâches."
                      : "DÉSACTIVÉ (Mode Sécurisé 0€) : Les agents s'en tiennent strictement aux abonnements Pro et quotas gratuits. Zéro frais imprévu."}
                  </p>
                </div>
              </div>

              {/* Big Toggle Button */}
              <button
                type="button"
                onClick={handleToggleOverage}
                disabled={toggling}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  overageAllowed ? "bg-amber-500" : "bg-zinc-700"
                }`}
                title={overageAllowed ? "Cliquer pour désactiver l'overage (sécurisé)" : "Cliquer pour autoriser l'overage"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    overageAllowed ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Spending Cap Selector when Overage is ON */}
            {overageAllowed && (
              <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" /> Plafond d&apos;overage max :
                </span>
                <div className="flex items-center gap-1">
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

          {/* ── 2. REMAINING CREDITS CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Claude Remaining Card */}
            <div className="p-3.5 rounded-xl border border-claude/30 bg-claude/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-claude" />
                  <span className="text-xs font-bold text-claude">Claude (Anthropic)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-claude/15 text-claude font-semibold border border-claude/30">
                  {data.claude.planType === "PRO_SUBSCRIPTION" ? "Claude Pro (0€)" : "API Pay-as-you-go"}
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">Solde / Quota restant :</span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {data.claude.quotaRemainingLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-claude rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(8, 100 - data.claude.quotaUsedPercent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>Cycle : {data.claude.resetPeriod || "Mensuel"}</span>
                  <span>{data.claude.tokensConsumedToday.toLocaleString()} tokens j.</span>
                </div>
              </div>
            </div>

            {/* Gemini Remaining Card */}
            <div className="p-3.5 rounded-xl border border-antigravity/30 bg-antigravity/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-antigravity" />
                  <span className="text-xs font-bold text-antigravity">Gemini (Antigravity)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-antigravity/15 text-antigravity font-semibold border border-antigravity/30">
                  Google AI Studio Free
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">Requêtes restantes :</span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {data.gemini.quotaRemainingLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-antigravity rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, 100 - data.gemini.quotaUsedPercent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>Reset : Quotidien (minuit)</span>
                  <span>{data.gemini.tokensConsumedToday.toLocaleString()} tokens j.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. SAFETY & BILLING GUARANTEES ── */}
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="text-foreground font-semibold">Politique Zéro Mauvaise Surprise :</span>
              <p className="text-[11px]">
                Tant que l&apos;option <strong>Overage</strong> est désactivée, VibeFlow Studio s&apos;interdit formellement de facturer vos cartes ou d&apos;épuiser vos clés d&apos;API de secours. Seuls vos abonnements et quotas déjà payés sont sollicités.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
