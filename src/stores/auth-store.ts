// ============================================================
// VibeFlow Studio — Auth Store (Zustand)
// Manages authentication state, current user, role & session
// ============================================================

import { create } from "zustand";
import type { SafeUser } from "@/lib/auth";

interface AuthState {
  user: SafeUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;

  fetchMe: () => Promise<SafeUser | null>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<SafeUser>) => void;
  forgotPassword: (
    email: string
  ) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    sent?: boolean;
    code?: string;
    directLink?: string;
  }>;
  resetPassword: (
    tokenOrCode: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  changePassword: (
    oldPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isAdmin: false,
  isAuthenticated: false,

  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        const user = data.user || null;
        set({
          user,
          isAdmin: user?.role === "ADMIN",
          isAuthenticated: Boolean(user),
          loading: false,
        });
        return user;
      }
      set({ user: null, isAdmin: false, isAuthenticated: false, loading: false });
      return null;
    } catch {
      set({ user: null, isAdmin: false, isAuthenticated: false, loading: false });
      return null;
    }
  },

  login: async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Identifiants invalides." };
      }
      const user = data.user;
      set({
        user,
        isAdmin: user?.role === "ADMIN",
        isAuthenticated: true,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur de connexion." };
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erreur lors de l'inscription." };
      }
      const user = data.user;
      set({
        user,
        isAdmin: user?.role === "ADMIN",
        isAuthenticated: true,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur lors de l'inscription." };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({
        user: null,
        isAdmin: false,
        isAuthenticated: false,
      });
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...updates };
      set({
        user: updated,
        isAdmin: updated.role === "ADMIN",
      });
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Échec de la demande." };
      }
      return {
        success: true,
        message: data.message,
        sent: data.sent,
        code: data.code,
        directLink: data.directLink,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur réseau." };
    }
  },

  resetPassword: async (tokenOrCode: string, newPassword: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenOrCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Impossible de réinitialiser le mot de passe." };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur réseau." };
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Impossible de modifier le mot de passe." };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur réseau." };
    }
  },
}));
