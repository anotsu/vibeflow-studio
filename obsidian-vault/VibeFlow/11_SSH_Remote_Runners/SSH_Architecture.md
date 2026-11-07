---
tags: [vibeflow, ssh, remote-runners, mac-mini, vps, terminal, xterm]
project: VibeFlow Studio
version: 1.2.0
updated: 2026-11-07
---

# 🌐 VibeFlow Studio — Architecture Hôtes Distants SSH & Runners (Mac mini / VPS)

> [!INFO] Vue d'Ensemble
> VibeFlow Studio permet désormais de connecter des **hôtes distants en SSH** (comme un **Mac mini Apple Silicon**, un serveur Linux dédié ou un VPS) pour exécuter directement vos sessions de terminal et vos agents CLI Pro (Claude Code, Antigravity CLI) sur une machine distante.

---

## 1. Cas d'Usage Principaux

1. **Mac mini Apple Silicon comme Runner Pro (0€ de tokens API)** :
   - Si votre compte Claude Pro / Max ou votre CLI Antigravity est configuré et authentifié sur votre Mac mini, VibeFlow Studio peut y déléguer les commandes sans transférer vos tokens sur le conteneur Coolify.
2. **Puissance et Écosystème Développeur Local** :
   - Accès aux runtimes natifs macOS/Linux, à Docker Desktop, à Xcode pour les compilations iOS/macOS, ou aux GPUs locaux.
3. **Terminal SSH Interactif Streamé dans CloudCLI** :
   - Un onglet dédié `SSH (Mac mini)` dans le terminal xterm.js permet d'ouvrir une session interactive distante directement dans le navigateur.

---

## 2. Architecture Technique

```mermaid
flowchart LR
    Browser[VibeFlow Web UI] --> API[/api/settings/ssh & /api/terminal/execute]
    API --> SSHService[src/lib/ssh-service.ts]
    SSHService -->|Connexion SSH Port 22\nAuth Clé ou Password| MacMini[Hôte Distant\nMac mini M1/M2/M4]
    MacMini -->|Exécution native| ClaudeCLI[Claude Code CLI\nSession Pro Locale]
    MacMini -->|Exécution native| AgyCLI[Antigravity CLI\nGemini Pro Local]
```

### Modules Développés :
1. **`src/lib/ssh-service.ts`** :
   - Gestion du pool d'hôtes SSH (persistance dans `SystemSetting.ssh_hosts` avec fallback en mémoire).
   - `testSshConnection(config)` : Connecte en SSH et lance une sonde système multi-commandes :
     - `uname -sm` (détection `macOS Darwin arm64` ou `Linux x86_64`)
     - `hostname`
     - Détection de `claude --version` et `agy --version`
     - Versions de `node` et `git`
   - `executeSshCommand(config, cmd, cwd)` : Exécution de commandes avec capture des flux stdout/stderr et code de retour.
2. **`src/app/api/settings/ssh/route.ts`** :
   - `GET` : Liste des hôtes configurés avec masquage automatique des clés privées et mots de passe (`••••••••`).
   - `POST` : Actions `save`, `delete`, `test`, `set_default`.
3. **`src/components/settings/SshHostsManager.tsx`** :
   - Interface d'administration dans `Paramètres` (onglet `Hôtes SSH (Mac mini / VPS)`).
   - Formulaire d'ajout / modification (Host, Port, User, Clé privée avec passphrase ou Mot de passe).
   - Diagnostic en direct 1-clic avec affichage de l'OS et des CLIs détectés.
   - Bouton de lancement direct du terminal CloudCLI sur l'hôte.
4. **`src/components/layout/CloudCLI.tsx` & `src/components/terminal/XtermTerminal.tsx`** :
   - Nouvel onglet de terminal `SSH (Mac mini)`.
   - Commandes interactives : `ssh status`, `ssh test`, `ssh hosts`, et exécution directe.

---

## 3. Sécurité et Chiffrement

- Les secrets (mots de passe et clés privées SSH) sont chiffrés et ne sont jamais exposés en clair dans les payloads d'API envoyés au navigateur.
- Timeout de sécurité strict (10 secondes) évitant tout blocage d'I/O en cas d'hôte injoignable.
