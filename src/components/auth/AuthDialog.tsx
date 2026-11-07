// ============================================================
// VibeFlow Studio — Authentication Dialog (Login, Register & Password Reset)
// Smooth tabbed interface with 1-click testing credentials & self-service reset
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
  ArrowLeft,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register" | "forgot" | "reset";
}

export function AuthDialog({
  isOpen,
  onClose,
  defaultMode = "login",
}: AuthDialogProps) {
  const { login, register, forgotPassword, resetPassword } = useAuthStore();
  const { addNotification } = useUIStore();

  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotResult, setForgotResult] = useState<{
    sent?: boolean;
    code?: string;
    directLink?: string;
    message?: string;
  } | null>(null);

  // Reset password states
  const [resetTokenOrCode, setResetTokenOrCode] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");

  if (!isOpen) return null;

  // Handle Login & Register submission
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

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setLoading(true);
    setError(null);
    setForgotResult(null);

    try {
      const res = await forgotPassword(forgotEmail);
      if (!res.success) {
        setError(res.error || "Impossible d'initier la réinitialisation.");
        return;
      }

      setForgotResult({
        sent: res.sent,
        code: res.code,
        directLink: res.directLink,
        message: res.message,
      });

      if (res.code) {
        setResetTokenOrCode(res.code);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password submission
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newResetPassword.length < 8) {
      setError("Le nouveau mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(resetTokenOrCode, newResetPassword);
      if (!res.success) {
        setError(res.error || "Échec de réinitialisation.");
        return;
      }

      addNotification({
        type: "success",
        title: "Mot de passe réinitialisé !",
        message: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
        autoDismissMs: 4000,
      });

      setForm((prev) => ({ ...prev, password: "" }));
      setMode("login");
      setForgotResult(null);
      setError(null);
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
                {mode === "login" && "Connexion à VibeFlow"}
                {mode === "register" && "Créer un Compte"}
                {mode === "forgot" && "Mot de Passe Oublié"}
                {mode === "reset" && "Nouveau Mot de Passe"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === "forgot" || mode === "reset"
                  ? "Récupération sécurisée d'accès"
                  : "Gestion des droits d'accès et rôles utilisateurs"}
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

        {/* Tab switch for Login / Register */}
        {(mode === "login" || mode === "register") && (
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
        )}

        {/* Back button for Forgot / Reset modes */}
        {(mode === "forgot" || mode === "reset") && (
          <div className="px-6 pt-4 pb-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setForgotResult(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à la connexion</span>
            </button>
          </div>
        )}

        {/* --- FORM 1: LOGIN & REGISTER --- */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  Mot de passe
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(form.email);
                      setMode("forgot");
                      setError(null);
                    }}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
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
        )}

        {/* --- FORM 2: FORGOT PASSWORD --- */}
        {mode === "forgot" && (
          <div className="px-6 pb-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              Entrez l&apos;adresse email de votre compte. Nous vous enverrons un lien et un code de réinitialisation sécurisé.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!forgotResult ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="votre-email@domaine.com"
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
                    <Mail className="w-4 h-4" />
                  )}
                  <span>Envoyer la demande</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Result box */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <Check className="w-4 h-4" />
                    <span>Demande traitée avec succès</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {forgotResult.message}
                  </p>

                  {forgotResult.code && (
                    <div className="p-3 rounded-lg bg-card border border-border text-center space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                        Votre Code de Vérification :
                      </span>
                      <span className="text-xl font-mono font-bold tracking-widest text-amber-400 block">
                        {forgotResult.code}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Saisir mon nouveau mot de passe</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- FORM 3: RESET PASSWORD --- */}
        {mode === "reset" && (
          <form onSubmit={handleResetSubmit} className="px-6 pb-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              Saisissez le code à 6 chiffres reçu (ou le jeton), puis définissez votre nouveau mot de passe.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Code à 6 chiffres ou Jeton
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={resetTokenOrCode}
                  onChange={(e) => setResetTokenOrCode(e.target.value)}
                  placeholder="ex: 849201"
                  className="w-full bg-secondary text-foreground text-xs rounded-xl pl-9 pr-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  className="w-full bg-secondary text-foreground text-xs rounded-xl pl-9 pr-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
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
                <Check className="w-4 h-4" />
              )}
              <span>Valider le nouveau mot de passe</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
