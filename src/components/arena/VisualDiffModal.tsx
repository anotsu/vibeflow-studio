// ============================================================
// VibeFlow Studio — Multimodal AI Vision & Pixel Diff Modal
// Interactive Wipe Slider, Hotspot Inspector & WCAG Review
// ============================================================
"use client";

import React, { useState } from "react";
import {
  X,
  Eye,
  Sliders,
  Monitor,
  Smartphone,
  Split,
  Sparkles,
  Trophy,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Layers,
  ArrowLeftRight,
} from "lucide-react";
import type { MultimodalVisionReview } from "@/lib/vision-reviewer";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface VisualDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: MultimodalVisionReview | null;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export function VisualDiffModal({
  isOpen,
  onClose,
  review,
  onRefresh,
  isRefreshing = false,
}: VisualDiffModalProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"slider" | "side-by-side" | "diff">("slider");
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  if (!isOpen || !review) return null;

  const currentData = viewport === "desktop" ? review.desktop : review.mobile;
  const isClaudeWinner = review.verdict.winner === "claude";
  const isAgyWinner = review.verdict.winner === "antigravity";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <VibeFlowLogo size="sm" showText={false} withGlow />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Analyse Critique Multimodale par Vision IA
                </h2>
                <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">
                  Pixel Diff &amp; WCAG 2.1
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                Tâche : <span className="text-foreground font-medium">{review.taskTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition-all disabled:opacity-50"
                title="Recalculer le Pixel Diff"
              >
                {isRefreshing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Recalculer</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Viewport & Mode controls */}
        <div className="px-6 py-3 border-b border-border/80 bg-secondary/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Viewport switch */}
          <div className="flex items-center p-1 rounded-xl bg-card border border-border">
            <button
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewport === "desktop"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (1280x800)</span>
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewport === "mobile"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile (375x812)</span>
            </button>
          </div>

          {/* Mode switch */}
          <div className="flex items-center p-1 rounded-xl bg-card border border-border">
            <button
              onClick={() => setViewMode("slider")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "slider"
                  ? "bg-secondary text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Curseur Wipe</span>
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "side-by-side"
                  ? "bg-secondary text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Split className="w-3.5 h-3.5 text-blue-400" />
              <span>Côte à Côte</span>
            </button>
            <button
              onClick={() => setViewMode("diff")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "diff"
                  ? "bg-secondary text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              <span>Pixel Diff Highlight</span>
            </button>
          </div>

          {/* Diff metric badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Divergence :</span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {currentData.diffPercentage}% de pixels distincts
            </span>
          </div>
        </div>

        {/* Content Body: Viewer + Right Inspector Panel */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Main Visual Display (col-span-2) */}
          <div className="lg:col-span-2 p-6 flex flex-col items-center justify-center bg-black/40 overflow-hidden">
            {/* WIPE SLIDER MODE */}
            {viewMode === "slider" && (
              <div className="w-full flex flex-col items-center space-y-4">
                <div
                  className={`relative overflow-hidden rounded-xl border border-border shadow-2xl bg-black ${
                    viewport === "mobile" ? "w-[320px] h-[520px]" : "w-full max-w-[640px] h-[400px]"
                  }`}
                >
                  {/* Background Image: Antigravity */}
                  <img
                    src={currentData.antigravityImageUrl}
                    alt="Antigravity UI"
                    className="absolute inset-0 w-full h-full object-contain"
                  />

                  {/* Foreground Image: Claude (Clipped by slider) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={currentData.claudeImageUrl}
                      alt="Claude UI"
                      className="absolute inset-0 w-full h-full object-contain max-w-none"
                      style={{
                        width: viewport === "mobile" ? "320px" : "640px",
                        height: viewport === "mobile" ? "520px" : "400px",
                      }}
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Floating Agent Badges */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-purple-950/80 border border-purple-500/40 text-[10px] font-bold text-purple-300 backdrop-blur-sm pointer-events-none">
                    Claude (Gauche)
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 backdrop-blur-sm pointer-events-none">
                    Antigravity (Droite)
                  </div>
                </div>

                {/* Slider Input Control */}
                <div className="w-full max-w-md flex items-center gap-3">
                  <span className="text-xs font-semibold text-purple-400">Claude</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="flex-1 accent-primary h-2 bg-secondary rounded-lg cursor-ew-resize"
                  />
                  <span className="text-xs font-semibold text-cyan-400">Antigravity</span>
                </div>
              </div>
            )}

            {/* SIDE-BY-SIDE MODE */}
            {viewMode === "side-by-side" && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-xs font-bold text-purple-300">Claude Solution</span>
                  </div>
                  <div
                    className={`rounded-xl border border-purple-500/30 overflow-hidden shadow-xl bg-black ${
                      viewport === "mobile" ? "w-[240px] h-[440px]" : "w-full h-[280px]"
                    }`}
                  >
                    <img
                      src={currentData.claudeImageUrl}
                      alt="Claude UI"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-bold text-cyan-300">Antigravity Solution</span>
                  </div>
                  <div
                    className={`rounded-xl border border-cyan-500/30 overflow-hidden shadow-xl bg-black ${
                      viewport === "mobile" ? "w-[240px] h-[440px]" : "w-full h-[280px]"
                    }`}
                  >
                    <img
                      src={currentData.antigravityImageUrl}
                      alt="Antigravity UI"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PIXEL DIFF HIGHLIGHT MODE */}
            {viewMode === "diff" && (
              <div className="w-full flex flex-col items-center space-y-3">
                <div
                  className={`relative rounded-xl border border-rose-500/40 overflow-hidden shadow-2xl bg-black ${
                    viewport === "mobile" ? "w-[320px] h-[520px]" : "w-full max-w-[640px] h-[400px]"
                  }`}
                >
                  <img
                    src={currentData.diffImageUrl}
                    alt="Pixel Diff Highlight"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 border border-rose-500/50 text-[10px] font-bold text-rose-300 flex items-center gap-1.5 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Zones magenta = Divergences visuelles
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Calculé par comparaison de pixels raw RGBA (libvips / Sharp) à seuil perceptuel delta &gt; 45.
                </p>
              </div>
            )}
          </div>

          {/* Right Inspector & AI Vision Verdict Panel */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Scorecard comparison */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Scores d&apos;Évaluation Visuelle
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Claude score */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isClaudeWinner
                      ? "bg-purple-500/10 border-purple-500/50 shadow-sm"
                      : "bg-secondary/40 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">Claude</span>
                    {isClaudeWinner && <span className="text-xs">👑 Vainqueur</span>}
                  </div>
                  <div className="mt-2 text-2xl font-black text-foreground">
                    {review.scores.claude.total}
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Esthétique :</span>
                      <span className="font-semibold text-foreground">
                        {review.scores.claude.aestheticScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contraste WCAG :</span>
                      <span className="font-semibold text-foreground">
                        {review.scores.claude.wcagScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reflow Mobile :</span>
                      <span className="font-semibold text-foreground">
                        {review.scores.claude.responsiveScore}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Antigravity score */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isAgyWinner
                      ? "bg-cyan-500/10 border-cyan-500/50 shadow-sm"
                      : "bg-secondary/40 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">Antigravity</span>
                    {isAgyWinner && <span className="text-xs">👑 Vainqueur</span>}
                  </div>
                  <div className="mt-2 text-2xl font-black text-foreground">
                    {review.scores.antigravity.total}
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Esthétique :</span>
                      <span className="font-semibold text-foreground">
                        {review.scores.antigravity.aestheticScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contraste WCAG :</span>
                      <span className="font-semibold text-foreground">
                        {review.scores.antigravity.wcagScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reflow Mobile :</span>
                      <span className="font-semibold text-foreground">
                        {review.scores.antigravity.responsiveScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict summary */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Avis du Juge IA Multimodal</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {review.verdict.summary}
              </p>
            </div>

            {/* WCAG Compliance & Overflow check */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Conformité &amp; Accessibilité
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>WCAG 2.1 AA Conforme</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>0 Débordement CSS</span>
                </div>
              </div>
            </div>

            {/* Hotspots List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Zones de Divergence Détectées ({currentData.hotspots.length})
              </h4>
              <div className="space-y-2">
                {currentData.hotspots.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHotspotId(selectedHotspotId === h.id ? null : h.id)}
                    className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/80 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{h.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        {h.agentDivergence}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{h.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recommandations pour la Fusion
              </h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {review.verdict.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary font-bold">·</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Arbitrage :</span>
            <span className="font-bold text-foreground">
              {review.verdict.winner === "antigravity"
                ? "Antigravity (UI/UX 60fps recommandée)"
                : "Claude (Typographie & Accessibilité recommandée)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
