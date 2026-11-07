// ============================================================
// VibeFlow Studio — SSH Hosts & Remote Runners Manager
// Configure and test connections to remote hosts (e.g. Mac mini, VPS)
// ============================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Terminal,
  Key,
  Lock,
  Star,
  Cpu,
  Folder,
  Sparkles,
  Bot,
  Laptop,
} from "lucide-react";
import type { SshHostConfig } from "@/types";
import { useUIStore } from "@/stores/ui-store";

interface SshHostsManagerProps {
  onCloseParent?: () => void;
}

export function SshHostsManager({ onCloseParent }: SshHostsManagerProps) {
  const { addNotification, setActiveCliTab, setCliPanelOpen, setCliPanelMaximized } = useUIStore();
  const [hosts, setHosts] = useState<SshHostConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHost, setEditingHost] = useState<Partial<SshHostConfig> | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Load existing SSH hosts
  const fetchHosts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/ssh");
      const data = await res.json();
      if (data.success && Array.isArray(data.hosts)) {
        setHosts(data.hosts);
      }
    } catch (err) {
      console.error("Failed to fetch SSH hosts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const handleAddNew = () => {
    setEditingHost({
      name: "Mac mini Bureau",
      host: "192.168.1.50",
      port: 22,
      username: "user",
      authType: "key",
      privateKey: "",
      password: "",
      remoteWorkspace: "~/Projects",
      isDefault: hosts.length === 0,
    });
    setTestResult(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHost || !editingHost.host || !editingHost.username) return;

    setSaving(true);
    try {
      const res = await fetch("/api/settings/ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          host: editingHost,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "success",
          title: "Hôte SSH enregistré",
          message: data.message || "L'hôte distant est prêt à être utilisé.",
          autoDismissMs: 3500,
        });
        setEditingHost(null);
        await fetchHosts();
      } else {
        throw new Error(data.error || "Échec de sauvegarde");
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur SSH",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'hôte SSH '${name}' ?`)) return;

    try {
      const res = await fetch("/api/settings/ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          type: "info",
          title: "Hôte supprimé",
          message: `L'hôte ${name} a été retiré.`,
          autoDismissMs: 3000,
        });
        await fetchHosts();
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: err.message,
        autoDismissMs: 3000,
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch("/api/settings/ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default", id }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchHosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async (hostConfig: Partial<SshHostConfig>) => {
    const idKey = hostConfig.id || "temp";
    setTestingId(idKey);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings/ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          ...hostConfig,
        }),
      });

      const data = await res.json();
      setTestResult({
        id: idKey,
        ok: data.success,
        msg: data.message || data.error || "Réponse reçue",
      });

      if (data.success) {
        addNotification({
          type: "success",
          title: "Connexion SSH Réussie !",
          message: data.message,
          autoDismissMs: 4000,
        });
        if (hostConfig.id) {
          await fetchHosts();
        }
      } else {
        addNotification({
          type: "warning",
          title: "Échec connexion SSH",
          message: data.error || data.message,
          autoDismissMs: 4500,
        });
      }
    } catch (err: any) {
      setTestResult({
        id: idKey,
        ok: false,
        msg: err.message || "Erreur réseau",
      });
    } finally {
      setTestingId(null);
    }
  };

  const openTerminalOnHost = (host: SshHostConfig) => {
    setActiveCliTab("ssh");
    setCliPanelOpen(true);
    setCliPanelMaximized(true);
    addNotification({
      type: "info",
      title: `Session SSH : ${host.name}`,
      message: `Terminal connecté à ${host.username}@${host.host}. Tapez 'ssh status' ou vos commandes.`,
      autoDismissMs: 4000,
    });
    if (onCloseParent) {
      onCloseParent();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Description */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-cyan-400" />
            Hôtes Distants SSH & Runners (Mac mini / VPS)
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Connectez votre <strong>Mac mini</strong> ou un serveur distant pour y exécuter vos CLIs Pro (Claude Code, Antigravity) et ouvrir des terminaux SSH interactifs en direct.
          </p>
        </div>

        {!editingHost && (
          <button
            type="button"
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-all shrink-0 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un Hôte</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && hosts.length === 0 && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
          <span>Chargement des hôtes SSH...</span>
        </div>
      )}

      {/* Host Edit / Create Form */}
      {editingHost && (
        <form
          onSubmit={handleSave}
          className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 space-y-4 animate-in fade-in zoom-in-98"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-cyan-400" />
              {editingHost.id ? "Modifier l'hôte SSH" : "Nouvel Hôte SSH (ex. Mac mini)"}
            </span>
            <button
              type="button"
              onClick={() => setEditingHost(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Nom d&apos;affichage
              </label>
              <input
                type="text"
                required
                value={editingHost.name || ""}
                onChange={(e) => setEditingHost({ ...editingHost, name: e.target.value })}
                placeholder="ex. Mac mini Bureau (M2 Pro)"
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Utilisateur SSH
              </label>
              <input
                type="text"
                required
                value={editingHost.username || ""}
                onChange={(e) => setEditingHost({ ...editingHost, username: e.target.value })}
                placeholder="ex. developer ou apple"
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Hôte ou IP
              </label>
              <input
                type="text"
                required
                value={editingHost.host || ""}
                onChange={(e) => setEditingHost({ ...editingHost, host: e.target.value })}
                placeholder="ex. 192.168.1.50 ou macmini.local"
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Port SSH (défaut 22)
              </label>
              <input
                type="number"
                min="1"
                max="65535"
                value={editingHost.port || 22}
                onChange={(e) => setEditingHost({ ...editingHost, port: Number(e.target.value) })}
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Authentication Type Switcher */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
              Méthode d&apos;authentification
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingHost({ ...editingHost, authType: "key" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  editingHost.authType === "key"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Clé Privée SSH (Recommandé)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingHost({ ...editingHost, authType: "password" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  editingHost.authType === "password"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Mot de passe</span>
              </button>
            </div>
          </div>

          {/* Key or Password input */}
          {editingHost.authType === "key" ? (
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground block">
                Clé privée SSH (OpenSSH / PEM / ed25519 / RSA)
              </label>
              <textarea
                rows={4}
                value={editingHost.privateKey || ""}
                onChange={(e) => setEditingHost({ ...editingHost, privateKey: e.target.value })}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-[11px]"
              />
              <input
                type="password"
                value={editingHost.passphrase || ""}
                onChange={(e) => setEditingHost({ ...editingHost, passphrase: e.target.value })}
                placeholder="Passphrase de la clé (si chiffrée, optionnel)"
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 text-[11px]"
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Mot de passe SSH
              </label>
              <input
                type="password"
                value={editingHost.password || ""}
                onChange={(e) => setEditingHost({ ...editingHost, password: e.target.value })}
                placeholder="Mot de passe utilisateur..."
                className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>
          )}

          {/* Remote Workspace Directory */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Dossier de travail distant (Workspace)
            </label>
            <input
              type="text"
              value={editingHost.remoteWorkspace || ""}
              onChange={(e) => setEditingHost({ ...editingHost, remoteWorkspace: e.target.value })}
              placeholder="ex. ~/Projects/vibeflow-workspace"
              className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>

          {/* Default host checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
            <input
              type="checkbox"
              checked={Boolean(editingHost.isDefault)}
              onChange={(e) => setEditingHost({ ...editingHost, isDefault: e.target.checked })}
              className="rounded border-border text-cyan-500 focus:ring-cyan-500"
            />
            <span>Définir comme hôte distant par défaut pour les CLIs Pro et l&apos;Arène</span>
          </label>

          {/* Test result message */}
          {testResult && testResult.id === (editingHost.id || "temp") && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                testResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="truncate">{testResult.msg}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => handleTestConnection(editingHost)}
              disabled={Boolean(testingId) || !editingHost.host || !editingHost.username}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-md text-xs font-medium transition-colors disabled:opacity-40"
            >
              {testingId === (editingHost.id || "temp") ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Tester la connexion</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingHost(null)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Enregistrer l&apos;hôte</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of Configured SSH Hosts */}
      {!editingHost && hosts.length === 0 && !loading && (
        <div className="p-6 text-center border border-dashed border-border rounded-xl bg-card/40">
          <Server className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">Aucun hôte SSH configuré</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
            Ajoutez votre Mac mini pour exécuter vos agents Claude Code et Antigravity sur votre machine locale via SSH.
          </p>
          <button
            type="button"
            onClick={handleAddNew}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configurer mon Mac mini</span>
          </button>
        </div>
      )}

      {!editingHost && hosts.length > 0 && (
        <div className="space-y-2.5">
          {hosts.map((host) => (
            <div
              key={host.id}
              className={`p-3.5 rounded-xl border transition-all ${
                host.isDefault
                  ? "bg-cyan-950/20 border-cyan-500/40 shadow-sm"
                  : "bg-secondary/40 border-border/80 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">
                      {host.name}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {host.username}@{host.host}:{host.port}
                    </span>
                    {host.isDefault && (
                      <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> Par défaut
                      </span>
                    )}
                    {host.status === "ONLINE" && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En ligne
                      </span>
                    )}
                    {host.status === "OFFLINE" && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Hors ligne
                      </span>
                    )}
                  </div>

                  {/* System & CLIs Detection Summary */}
                  {host.systemInfo && (
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      {host.systemInfo.os && (
                        <span className="flex items-center gap-1 text-foreground/80">
                          <Cpu className="w-3 h-3 text-cyan-400" />
                          {host.systemInfo.os} ({host.systemInfo.arch})
                        </span>
                      )}
                      {host.systemInfo.hasClaudeCli && (
                        <span className="flex items-center gap-1 text-claude font-medium">
                          <Bot className="w-3 h-3" />
                          Claude CLI ({host.systemInfo.claudeVersion || "OK"})
                        </span>
                      )}
                      {host.systemInfo.hasAgyCli && (
                        <span className="flex items-center gap-1 text-antigravity font-medium">
                          <Sparkles className="w-3 h-3" />
                          AGY CLI ({host.systemInfo.agyVersion || "OK"})
                        </span>
                      )}
                      {host.remoteWorkspace && (
                        <span className="flex items-center gap-1 text-muted-foreground font-mono text-[10px]">
                          <Folder className="w-3 h-3" />
                          {host.remoteWorkspace}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openTerminalOnHost(host)}
                    className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs transition-colors"
                    title="Ouvrir le terminal interactif CloudCLI sur cet hôte"
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestConnection(host)}
                    disabled={testingId === host.id}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    title="Tester la connexion et sonder les CLIs"
                  >
                    {testingId === host.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {!host.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(host.id)}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-amber-400 transition-colors"
                      title="Définir comme hôte distant par défaut"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingHost({ ...host });
                      setTestResult(null);
                    }}
                    className="px-2 py-1 rounded-md hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(host.id, host.name)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Supprimer l'hôte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
