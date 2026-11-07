// ============================================================
// VibeFlow Studio — Brand Logo Component (SVG Vector)
// High-tech, crisp at all resolutions, supports dark/light mode
// ============================================================
"use client";

import React from "react";
import Link from "next/link";

interface VibeFlowLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  withGlow?: boolean;
  className?: string;
  href?: string;
}

const SIZE_MAP = {
  xs: { box: "w-5 h-5", text: "text-xs", badge: "text-[9px]" },
  sm: { box: "w-7 h-7", text: "text-sm", badge: "text-[10px]" },
  md: { box: "w-9 h-9", text: "text-base", badge: "text-xs" },
  lg: { box: "w-12 h-12", text: "text-xl", badge: "text-xs" },
  xl: { box: "w-16 h-16", text: "text-2xl", badge: "text-sm" },
};

export function VibeFlowLogo({
  size = "sm",
  showText = true,
  withGlow = false,
  className = "",
  href,
}: VibeFlowLogoProps) {
  const currentSize = SIZE_MAP[size];

  const emblem = (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${currentSize.box} ${
        withGlow ? "filter drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 256 256"
        className="w-full h-full select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="vLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#020617" />
          </linearGradient>

          <linearGradient id="vLogoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.9" />
            <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.4" />
          </linearGradient>

          <linearGradient id="vLogoViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#c084fc" />
            <stop offset="40%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#6366f1" />
          </linearGradient>

          <linearGradient id="vLogoCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="50%" stop-color="#06b6d4" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>

          <radialGradient id="vLogoSpark" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="50%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
          </radialGradient>
        </defs>

        {/* Container Rounded Box */}
        <rect
          x="10"
          y="10"
          width="236"
          height="236"
          rx="52"
          fill="url(#vLogoBg)"
          stroke="url(#vLogoBorder)"
          stroke-width="5"
        />

        {/* Left Stream: Violet Loop */}
        <path
          d="M 68 64
             C 78 64, 88 80, 96 112
             L 116 172
             C 122 190, 134 190, 140 172
             L 156 124
             C 160 112, 168 108, 176 116
             C 184 124, 180 136, 172 152
             L 148 196
             C 138 214, 118 214, 108 196
             L 60 76
             C 56 68, 60 64, 68 64 Z"
          fill="url(#vLogoViolet)"
        />

        {/* Right Stream: Cyan Loop */}
        <path
          d="M 188 64
             C 178 64, 168 80, 160 112
             L 142 166
             C 138 178, 128 178, 124 166
             L 104 118
             C 100 108, 92 108, 86 116
             C 80 124, 84 136, 92 152
             L 114 192
             C 122 206, 134 206, 142 192
             L 196 76
             C 200 68, 196 64, 188 64 Z"
          fill="url(#vLogoCyan)"
        />

        {/* Central Synthesis Spark */}
        <circle cx="128" cy="180" r="16" fill="url(#vLogoSpark)" />
        <circle cx="128" cy="180" r="5" fill="#ffffff" />
      </svg>
    </div>
  );

  const content = (
    <div className="flex items-center gap-2.5">
      {emblem}
      {showText && (
        <div className="flex items-center gap-1.5 leading-none select-none">
          <span
            className={`font-bold tracking-tight text-foreground ${currentSize.text}`}
          >
            VibeFlow
          </span>
          <span
            className={`font-extrabold bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent ${currentSize.text}`}
          >
            Studio
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
