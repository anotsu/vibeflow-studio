// ============================================================
// VibeFlow Studio — Admin Console & RBAC Management Modal
// User accounts, Role switching (USER <-> ADMIN), Account suspension,
// Audit logs, System health & Worktree cleanup.
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Shield,
  Users,
  FileText,
  Activity,
  Plus,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Clock,
  Search,
  Filter,
  Check,
  UserCheck,
  UserX,
  Mail,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import type { SafeUser } from "@/lib/auth";
import { VibeFlowLogo } from "@/components/brand/VibeFlowLogo";

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = "users" | "audit" | "system" | "smtp";

export function AdminConsoleModal({ isOpen, onClose }: AdminConsoleModalProps) {
  const { addNotification } = useUIStore();
  const { user: currentAdmin } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // SMTP Settings state
  const [smtpForm, setSmtpForm] = useState({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "VibeFlow Studio <noreply@vibeflow.local>",
    enabled: false,
  });
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Admin password reset modal for a specific user
  const [resetUserModal, setResetUserModal] = useState<{
    user: SafeUser;
    newPassword: string;
  } | null>(null);
  const [resettingUserPassword, setResettingUserPassword] = useState(false);

  // New user form state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as "USER" | "ADMIN",
  });

  // Audit filter state
  const [auditCategory, setAuditCategory] = useState("ALL");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {}
  };

  const fetchAuditLogs = async (category = "ALL") => {
    try {
      const url =
        category !== "ALL"
          ? `/api/admin/audit-logs?category=${category}&limit=60`
          : "/api/admin/audit-logs?limit=60";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {}
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch("/api/admin/system");
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch {}
  };

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch("/api/admin/smtp");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSmtpForm(data.config);
        }
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchAuditLogs(auditCategory),
      fetchSystemHealth(),
      fetchSmtpConfig(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", config: smtpForm }),
      });
      const data = await res.json();
      if (res.ok) {
        addNotification({
          type: "success",
          title: "Configuration enregistrée",
          message: data.message,
          autoDismissMs: 3500,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur enregistrement",
        message: err.message,
        autoDismissMs: 3500,
      });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          testEmail: testEmail || currentAdmin?.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpTestResult({
          success: true,
          message: data.message,
          details: data.details,
        });
        addNotification({
          type: "success",
          title: "Test SMTP réussi !",
          message: data.message,
          autoDismissMs: 4000,
        });
      } else {
        setSmtpTestResult({
          success: false,
          message: data.error || "Échec de connexion",
          details: data.details,
        });
        addNotification({
          type: "error",
          title: "Échec test SMTP",
          message: data.error,
          autoDismissMs: 4000,
        });
      }
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message,
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserModal) return;
    if (resetUserModal.newPassword.length < 8) {
      addNotification({
        type: "error",
        title: "Mot de passe trop court",
        message: "Le mot de passe doit comporter au moins 8 caractères.",
        autoDismissMs: 3000,
      });
      return;
    }

    setResettingUserPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUserModal.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetUserModal.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        addNotification({
          type: "success",
          title: "Mot de passe réinitialisé",
          message: `Le mot de passe pour ${resetUserModal.user.email} a été mis à jour.`,
          autoDismissMs: 4000,
        });
        setResetUserModal(null);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur réinitialisation",
        message: err.message,
        autoDismissMs: 3500,
      });
    } finally {
      setResettingUserPassword(false);
    }
  };

  if (!isOpen) return null;

  // Role toggle (USER <-> ADMIN)
  const handleToggleRole = async (targetUser: SafeUser) => {
    const newRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
    setActionLoadingId(`role_${targetUser.id}`);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        addNotification({
          type: "success",
          title: "Rôle modifié",
          message: `${targetUser.name} est désormais ${newRole}.`,
          autoDismissMs: 3000,
        });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status toggle (ACTIVE <-> SUSPENDED)
  const handleToggleStatus = async (targetUser: SafeUser) => {
    const newStatus = targetUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoadingId(`status_${targetUser.id}`);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u))
        );
        addNotification({
          type: newStatus === "ACTIVE" ? "success" : "warning",
          title: newStatus === "ACTIVE" ? "Compte réactivé" : "Compte suspendu",
          message: `Le compte ${targetUser.email} est ${newStatus === "ACTIVE" ? "actif" : "suspendu"}.`,
          autoDismissMs: 3500,
        });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete user
  const handleDeleteUser = async (targetUser: SafeUser) => {
    if (!confirm(`Confirmer la suppression définitive du compte ${targetUser.email} ?`)) {
      return;
    }
    setActionLoadingId(`del_${targetUser.id}`);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        addNotification({
          type: "success",
          title: "Compte supprimé",
          message: `L'utilisateur ${targetUser.email} a été supprimé.`,
          autoDismissMs: 3000,
        });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId("create_user");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => [data.user, ...prev]);
        setShowCreateUser(false);
        setNewUserForm({ name: "", email: "", password: "", role: "USER" });
        addNotification({
          type: "success",
          title: "Utilisateur créé",
          message: `Le compte pour ${data.user.email} (${data.user.role}) est prêt.`,
          autoDismissMs: 3500,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur création",
        message: err.message,
        autoDismissMs: 3500,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Purge worktrees
  const handlePurgeWorktrees = async () => {
    setActionLoadingId("purge_worktrees");
    try {
      const res = await fetch("/api/admin/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_worktrees" }),
      });
      const data = await res.json();
      if (res.ok) {
        addNotification({
          type: "success",
          title: "Nettoyage réussi",
          message: data.message,
          autoDismissMs: 4000,
        });
        await fetchSystemHealth();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VibeFlowLogo size="md" showText={false} withGlow />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Console d&apos;Administration VibeFlow (RBAC)
                </h2>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  Accès Administrateur
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Gestion des comptes, privilèges utilisateurs, audit de sécurité et maintenance système
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-border bg-secondary/30 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Utilisateurs &amp; Droits ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
              activeTab === "audit"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Journaux d&apos;Audit &amp; Sécurité ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
              activeTab === "system"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Santé Système &amp; Worktrees</span>
          </button>

          <button
            onClick={() => setActiveTab("smtp")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
              activeTab === "smtp"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Messagerie &amp; SMTP</span>
          </button>
        </div>

        {/* Main Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Chargement des données d&apos;administration...</p>
            </div>
          ) : (
            <>
              {/* ── TAB 1 : UTILISATEURS & DROITS ──────────────────────── */}
              {activeTab === "users" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Comptes Enregistrés ({users.length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Contrôle d&apos;accès basé sur les rôles (RBAC) : les administrateurs disposent des privilèges totaux.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateUser(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer un utilisateur</span>
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4">Utilisateur</th>
                          <th className="py-2.5 px-4">Rôle</th>
                          <th className="py-2.5 px-4">Statut</th>
                          <th className="py-2.5 px-4">Créé le</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {users.map((u) => {
                          const isSelf = currentAdmin?.id === u.id;
                          return (
                            <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.name} className="w-full h-full" />
                                    ) : (
                                      <span className="font-bold text-primary">{u.name[0]}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                      <span>{u.name}</span>
                                      {isSelf && (
                                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-bold">
                                          Vous
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                      {u.email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    u.role === "ADMIN"
                                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                      : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                                  }`}
                                >
                                  {u.role === "ADMIN" ? (
                                    <>
                                      <Shield className="w-2.5 h-2.5 text-amber-400" />
                                      ADMIN
                                    </>
                                  ) : (
                                    "USER"
                                  )}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    u.status === "ACTIVE"
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                                  }`}
                                >
                                  {u.status === "ACTIVE" ? "Actif" : "Suspendu"}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-muted-foreground text-[11px]">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* Toggle Role */}
                                  <button
                                    onClick={() => handleToggleRole(u)}
                                    disabled={actionLoadingId === `role_${u.id}`}
                                    className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[10px] font-semibold text-foreground transition-colors"
                                    title={`Changer le rôle en ${u.role === "ADMIN" ? "USER" : "ADMIN"}`}
                                  >
                                    {u.role === "ADMIN" ? "Rétrograder User" : "Promouvoir Admin"}
                                  </button>

                                  {/* Suspend / Reactivate */}
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    disabled={isSelf || actionLoadingId === `status_${u.id}`}
                                    className={`p-1.5 rounded transition-colors ${
                                      u.status === "ACTIVE"
                                        ? "text-yellow-400 hover:bg-yellow-400/10"
                                        : "text-emerald-400 hover:bg-emerald-400/10"
                                    } disabled:opacity-40`}
                                    title={u.status === "ACTIVE" ? "Suspendre le compte" : "Réactiver le compte"}
                                  >
                                    {u.status === "ACTIVE" ? (
                                      <UserX className="w-3.5 h-3.5" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* Reset Password */}
                                  <button
                                    onClick={() => setResetUserModal({ user: u, newPassword: "" })}
                                    className="p-1.5 rounded text-blue-400 hover:bg-blue-400/10 transition-colors"
                                    title="Réinitialiser le mot de passe de cet utilisateur"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={isSelf || actionLoadingId === `del_${u.id}`}
                                    className="p-1.5 rounded text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                                    title="Supprimer définitivement"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 2 : AUDIT LOGS ──────────────────────────────────── */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Piste d&apos;Audit &amp; Événements de Sécurité
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Traçabilité complète des connexions, changements de permissions et actions sensibles.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {["ALL", "AUTH", "ADMIN", "DEPLOYMENT", "SECURITY"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setAuditCategory(cat);
                            fetchAuditLogs(cat);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            auditCategory === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-border rounded-xl divide-y divide-border/60 bg-card max-h-[500px] overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {log.action}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground bg-secondary px-1.5 py-0.2 rounded border border-border">
                              {log.category}
                            </span>
                            {log.user && (
                              <span className="text-[10px] text-primary">
                                par @{log.user.name || log.user.email}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {log.details || "Événement système enregistré."}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}

                    {auditLogs.length === 0 && (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        Aucun journal d&apos;audit pour cette catégorie.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3 : SANTÉ SYSTÈME & WORKTREES ───────────────────── */}
              {activeTab === "system" && systemHealth && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Santé de l&apos;Infrastructure &amp; Ressources
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Monitoring en temps réel de PostgreSQL, de l&apos;isolation des worktrees et de l&apos;hôte Node.js.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Database Health */}
                    <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Database className="w-4 h-4 text-green-400" />
                          Base PostgreSQL
                        </span>
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                          {systemHealth.health.database.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Latence de requête : <span className="text-foreground font-mono font-bold">{systemHealth.health.database.latencyMs} ms</span>
                      </p>
                    </div>

                    {/* Worktrees Storage */}
                    <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Server className="w-4 h-4 text-blue-400" />
                          Worktrees Physiques
                        </span>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                          {systemHealth.health.worktrees.activeCount} Actifs
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate" title={systemHealth.health.worktrees.path}>
                        {systemHealth.health.worktrees.path}
                      </p>
                    </div>

                    {/* Node / Host */}
                    <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-purple-400" />
                          Hôte Système
                        </span>
                        <span className="text-[10px] font-mono text-purple-300">
                          {systemHealth.health.system.platform} {systemHealth.health.system.arch}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        RAM : <span className="text-foreground font-mono">{systemHealth.health.system.freeMemoryMB} MB libres</span> / {systemHealth.health.system.totalMemoryMB} MB
                      </p>
                    </div>
                  </div>

                  {/* Maintenance Actions */}
                  <div className="p-4 rounded-xl border border-border/80 bg-secondary/20 space-y-3">
                    <span className="text-xs font-bold text-foreground block">
                      Opérations de Maintenance Système Immédiates :
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handlePurgeWorktrees}
                        disabled={actionLoadingId === "purge_worktrees"}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors disabled:opacity-50"
                      >
                        {actionLoadingId === "purge_worktrees" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span>Purger les Worktrees Orphelins sur Disque</span>
                      </button>

                      <button
                        onClick={() => fetchSystemHealth()}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Actualiser les métriques</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 4: SMTP CONFIGURATION */}
          {activeTab === "smtp" && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30 shrink-0 mt-0.5">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Configuration du Serveur de Messagerie (SMTP)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      Permet l&apos;envoi d&apos;emails pour la réinitialisation de mot de passe, les alertes de sécurité, et les notifications d&apos;auto-guérison Coolify.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpForm.enabled}
                      onChange={(e) => setSmtpForm({ ...smtpForm, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <span className={`text-xs font-bold ${smtpForm.enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {smtpForm.enabled ? "Actif" : "Désactivé"}
                  </span>
                </div>
              </div>

              {/* Settings Form */}
              <form onSubmit={handleSaveSmtp} className="p-5 rounded-xl border border-border bg-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold mb-1 text-foreground">Hôte SMTP (Serveur)</label>
                    <input
                      type="text"
                      required
                      value={smtpForm.host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      placeholder="ex: smtp.gmail.com, mail.capstation.fr"
                      className="w-full bg-secondary text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-foreground">Port SMTP</label>
                    <input
                      type="number"
                      required
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                      placeholder="587"
                      className="w-full bg-secondary text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-foreground">Utilisateur / Login SMTP</label>
                    <input
                      type="text"
                      value={smtpForm.user}
                      onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                      placeholder="ex: apikey ou utilisateur@domaine.com"
                      className="w-full bg-secondary text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-foreground">Mot de passe SMTP</label>
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {showSmtpPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showSmtpPassword ? "Masquer" : "Voir"}</span>
                      </button>
                    </div>
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-secondary text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-foreground">Adresse Expéditeur (&quot;De&quot;)</label>
                    <input
                      type="text"
                      required
                      value={smtpForm.from}
                      onChange={(e) => setSmtpForm({ ...smtpForm, from: e.target.value })}
                      placeholder="VibeFlow Studio &lt;noreply@vibeflow.local&gt;"
                      className="w-full bg-secondary text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={smtpForm.secure}
                        onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="font-semibold text-foreground">Connexion sécurisée SSL / TLS (obligatoire pour port 465)</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
                  >
                    {savingSmtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Enregistrer la Configuration SMTP</span>
                  </button>
                </div>
              </form>

              {/* Direct SMTP Test Card */}
              <div className="p-5 rounded-xl border border-border bg-secondary/30 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    Tester la Connexion SMTP &amp; Envoi d&apos;Email en Direct
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Envoyez un email de test pour valider la connectivité réseau, la négociation TLS et les identifiants.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder={currentAdmin?.email || "admin@vibeflow.local"}
                    className="w-full sm:flex-1 bg-card text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !smtpForm.host}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs border border-border flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
                  >
                    {testingSmtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-primary" />
                    )}
                    <span>Tester la connexion</span>
                  </button>
                </div>

                {/* Test results banner */}
                {smtpTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs animate-in fade-in ${
                      smtpTestResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {smtpTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>{smtpTestResult.message}</span>
                    </div>
                    {smtpTestResult.details && (
                      <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap opacity-80 overflow-x-auto">
                        {smtpTestResult.details}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card/90 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Connecté en tant que <span className="text-foreground font-bold">{currentAdmin?.name}</span> ({currentAdmin?.email})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>

        {/* Create User Sub-Modal */}
        {showCreateUser && (
          <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-xs font-bold text-foreground">
                  Créer un Nouvel Utilisateur
                </h4>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    placeholder="ex: Marie Curie"
                    className="w-full bg-secondary text-foreground rounded-lg p-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Adresse Email</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="marie@domaine.com"
                    className="w-full bg-secondary text-foreground rounded-lg p-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Mot de passe provisoire</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-secondary text-foreground rounded-lg p-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Rôle Attribué</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full bg-secondary text-foreground rounded-lg p-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="USER">Utilisateur Standard (USER)</option>
                    <option value="ADMIN">Administrateur Système (ADMIN)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="px-3 py-1.5 bg-secondary text-foreground rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === "create_user"}
                    className="px-4 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoadingId === "create_user" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Enregistrer</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Reset User Password Sub-Modal */}
        {resetUserModal && (
          <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-foreground">
                    Réinitialiser le mot de passe
                  </h4>
                </div>
                <button
                  onClick={() => setResetUserModal(null)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminResetPassword} className="space-y-4 text-xs">
                <p className="text-xs text-muted-foreground">
                  Définissez un nouveau mot de passe pour l&apos;utilisateur{" "}
                  <strong className="text-foreground">{resetUserModal.user.name}</strong> ({resetUserModal.user.email}).
                </p>

                <div>
                  <label className="block font-semibold mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={resetUserModal.newPassword}
                    onChange={(e) =>
                      setResetUserModal({
                        ...resetUserModal,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Au moins 8 caractères"
                    className="w-full bg-secondary text-foreground rounded-lg p-2.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetUserModal(null)}
                    className="px-3.5 py-2 bg-secondary text-foreground rounded-xl font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={resettingUserPassword || resetUserModal.newPassword.length < 8}
                    className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {resettingUserPassword ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Mettre à jour</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
