// ============================================================
// VibeFlow Studio — Token Savings Tracker (Pro-First 0€ Cost)
// Real-time calculation of avoided API costs & Subscription ROI
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  TrendingUp,
  PiggyBank,
  Zap,
  Bot,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  Info,
  Layers,
} from "lucide-react";

export interface TokenSavingsData {
  totalSavedEur: number;
  realCostBilledEur: number;
  netSavingsPercent: number;
  monthlySubscriptionsEur: number;
  amortizationRatio: number;
  netGainsEur: number;
  tokensCount: {
    total: number;
    claude: number;
    antigravity: number;
  };
  costsBreakdown: {
    claudeAvoidedEur: number;
    antigravityAvoidedEur: number;
  };
  pricingRates?: {
    claudeBlendedPerMillion: string;
    antigravityBlendedPerMillion: string;
  };
  status: string;
  timestamp: string;
}

const DEFAULT_SAVINGS: TokenSavingsData = {
  totalSavedEur: 0.0,
  realCostBilledEur: 0.0,
  netSavingsPercent: 100,
  monthlySubscriptionsEur: 37.0,
  amortizationRatio: 0.0,
  netGainsEur: 0.0,
  tokensCount: {
    total: 0,
    claude: 0,
    antigravity: 0,
  },
  costsBreakdown: {
    claudeAvoidedEur: 0.0,
    antigravityAvoidedEur: 0.0,
  },
  status: "PRO_FIRST_READY",
  timestamp: new Date().toISOString(),
};

export function TokenSavingsBadge() {
  const [data, setData] = useState<TokenSavingsData>(DEFAULT_SAVINGS);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSavings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stats/token-savings");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Keep existing data on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
    // Poll every 30 seconds
    const interval = setInterval(fetchSavings, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium transition-all shadow-sm group"
        title="Visualiser les économies réalisées grâce à la philosophie Pro-First (0€ de token facturé)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <Coins className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="hidden md:inline text-muted-foreground">Économisé :</span>
        <span className="font-bold text-emerald-300">~{data.totalSavedEur.toFixed(2)} €</span>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
          0€ facturé
        </span>
      </button>

      {modalOpen && (
        <TokenSavingsModal
          data={data}
          onClose={() => setModalOpen(false)}
          onRefresh={fetchSavings}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

export function TokenSavingsModal({
  data,
  onClose,
  onRefresh,
  isLoading,
}: {
  data: TokenSavingsData;
  onClose: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const claudeShare = Math.round(
    (data.tokensCount.claude / Math.max(1, data.tokensCount.total)) * 100
  );
  const antiShare = 100 - claudeShare;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Cockpit Économique Pro-First</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  0.00 € API Cost
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Valeur financière matérialisée par l&apos;exécution locale des CLIs Claude Pro et Gemini Pro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              title="Rafraîchir les métriques"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* 4 Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-secondary/40 border border-border rounded-xl p-3">
              <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                Total Économisé
              </span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                ~{data.totalSavedEur.toFixed(2)} €
              </span>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">vs tarifs API Pay-As-You-Go</span>
            </div>

            <div className="bg-secondary/40 border border-border rounded-xl p-3">
              <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                Facturation Réelle
              </span>
              <span className="text-lg font-extrabold text-foreground font-mono">0.00 €</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">100% inclus forfait CLI</span>
            </div>

            <div className="bg-secondary/40 border border-border rounded-xl p-3">
              <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                Rentabilité Pro
              </span>
              <span className="text-lg font-extrabold text-purple-400 font-mono">
                {data.amortizationRatio.toFixed(1)}x
              </span>
              <span className="text-[10px] text-purple-400/80 block mt-0.5">forfaits rentabilisés</span>
            </div>

            <div className="bg-secondary/40 border border-border rounded-xl p-3">
              <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                Volume Traité
              </span>
              <span className="text-lg font-extrabold text-blue-400 font-mono">
                {(data.tokensCount.total / 1_000_000).toFixed(1)}M
              </span>
              <span className="text-[10px] text-blue-400/80 block mt-0.5">tokens échangés</span>
            </div>
          </div>

          {/* Breakdown Per Agent */}
          <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Répartition par Moteur IA</span>
              <span className="font-mono text-[11px] text-foreground">
                {(data.tokensCount.total).toLocaleString()} tokens totaux
              </span>
            </h4>

            {/* Distribution Bar */}
            <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden flex">
              <div
                style={{ width: `${claudeShare}%` }}
                className="bg-claude h-full transition-all"
                title={`Claude Code : ${claudeShare}%`}
              />
              <div
                style={{ width: `${antiShare}%` }}
                className="bg-antigravity h-full transition-all"
                title={`Antigravity : ${antiShare}%`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Claude Card */}
              <div className="p-3 rounded-lg border border-claude/30 bg-claude-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-claude" />
                    <span className="text-xs font-bold text-claude">Claude Code Pro</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{data.costsBreakdown.claudeAvoidedEur.toFixed(2)} €
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{(data.tokensCount.claude / 1_000_000).toFixed(2)}M tokens</span>
                  <span>Tarif API évité : ~8.28 €/M</span>
                </div>
              </div>

              {/* Antigravity Card */}
              <div className="p-3 rounded-lg border border-antigravity/30 bg-antigravity-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-antigravity" />
                    <span className="text-xs font-bold text-antigravity">Antigravity CLI (Gemini Pro)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{data.costsBreakdown.antigravityAvoidedEur.toFixed(2)} €
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{(data.tokensCount.antigravity / 1_000_000).toFixed(2)}M tokens</span>
                  <span>Tarif API évité : ~2.87 €/M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground block mb-0.5">
                Philosophie d&apos;ingénierie &quot;Pro-First (0€ Token)&quot;
              </span>
              VibeFlow Studio se connecte directement aux sessions authentifiées locales de vos abonnements
              personnels (Claude Pro à ~20$/mois et Gemini Advanced à ~20$/mois). Le système pilote les CLIs
              officielles via le terminal sans consommer d&apos;unités d&apos;API tierces Pay-As-You-Go.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[10px]">
            Dernière mise à jour : {new Date(data.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
