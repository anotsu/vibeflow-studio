// ============================================================
// VibeFlow Studio — Authentication Dialog (Login & Register)
// Smooth tabbed interface with 1-click testing credentials
// ============================================================
"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Sparkles,
  Loader2,
  ArrowRight,
  KeyRound,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
}

export function AuthDialog({
  isOpen,
  onClose,
  defaultMode = "login",
}: AuthDialogProps) {
  const { login, register } = useAuthStore();
  const { addNotification } = useUIStore();

  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const res = await login(form.email, form.password);
        if (!res.success) {
          setError(res.error || "Échec de connexion.");
          return;
        }
        addNotification({
          type: "success",
          title: "Connexion réussie",
          message: "Session authentifiée avec succès.",
          autoDismissMs: 3000,
        });
        onClose();
      } else {
        const res = await register(form.name, form.email, form.password);
        if (!res.success) {
          setError(res.error || "Échec de l'inscription.");
          return;
        }
        addNotification({
          type: "success",
          title: "Compte créé !",
          message: "Bienvenue sur VibeFlow Studio.",
          autoDismissMs: 3000,
        });
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type: "admin" | "user") => {
    if (type === "admin") {
      setForm({
        name: "Lead Administrator",
        email: "admin@vibeflow.local",
        password: "AdminVibe2026!",
      });
    } else {
      setForm({
        name: "Alex Developer",
        email: "dev@vibeflow.local",
        password: "UserVibe2026!",
      });
    }
    setMode("login");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VibeFlowLogo size="sm" showText={false} withGlow />
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {mode === "login" ? "Connexion à VibeFlow" : "Créer un Compte"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Gestion des droits d&apos;accès et rôles utilisateurs
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

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 m-6 mb-2 bg-secondary/40 rounded-xl border border-border/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              mode === "login"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              mode === "register"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            S&apos;inscrire
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: Jean Dupont"
                  required
                  className="w-full bg-secondary text-foreground text-xs rounded-xl pl-9 pr-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="votre-email@domaine.com"
                required
                className="w-full bg-secondary text-foreground text-xs rounded-xl pl-9 pr-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full bg-secondary text-foreground text-xs rounded-xl pl-9 pr-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{mode === "login" ? "Se Connecter" : "Créer mon Compte"}</span>
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-border/60">
            <span className="text-[10px] text-muted-foreground block text-center uppercase tracking-wider mb-2">
              Comptes de Test Rapide (1-Clic) :
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleFillDemo("admin")}
                className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-left transition-colors"
              >
                <span className="font-bold block">🛡️ Admin</span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  admin@vibeflow.local
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo("user")}
                className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-left transition-colors"
              >
                <span className="font-bold block">👤 Développeur</span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  dev@vibeflow.local
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
