---
tags: [vibeflow, roadmap, planning, master]
project: VibeFlow Studio
version: 1.0.0-PROD
updated: 2026-11-07
---

# 🚀 VibeFlow Studio — Master Roadmap Industrielle (4 Phases)

> [!NOTE] Philosophie d'Exécution
> Chaque action est assignée soit à **Claude Code Pro** (Architecture & Robustesse), soit à **Antigravity CLI** (UI/UX & Challengers Rapides), soit en mode **Dual** pour fusion collective.
> Aucun mock n'est toléré dans l'architecture finale.

---

## 🧱 PHASE 1 : Consolidation Core & Plomberie Système Réelle (Zéro Mock)
*Objectif : Garantir que le duel entre Claude et Antigravity s'exécute physiquement et sans conflit dans le conteneur Docker.*

### 1.1 Isolation Physique des Branches via Git Worktrees (`git-worktree-manager.ts`)
- **Problème** : Deux agents qui codent en même temps dans le même répertoire écrasent leurs fichiers respectifs s'ils font `git checkout`.
- **Actions** :
  - [ ] #task #claude [priority:: critical] Créer `src/lib/git-worktree-manager.ts` pour provisionner deux dossiers isolés par tâche : `/tmp/vibeflow-worktrees/[taskId]/claude-impl` et `/tmp/vibeflow-worktrees/[taskId]/antigravity-impl`.
  - [ ] #task #claude [priority:: high] Exécuter les sessions `claude` et `agy` chacune dans son propre `cwd` (Worktree dédié).
  - [ ] #task #claude [priority:: medium] Nettoyer automatiquement les worktrees (`git worktree remove --force` + `git worktree prune`) dès que la tâche passe en `DEPLOYED`.

### 1.2 Serveurs de Prévisualisation Éphémères pour le Visual Diff Slider (`preview-orchestrator.ts`)
- **Problème** : Le `DualBranchArena.tsx` a besoin de deux vraies URLs live pour superposer les rendus de `claude-impl` et `antigravity-impl` via `clip-path`.
- **Actions** :
  - [ ] #task #claude [priority:: critical] Créer `src/lib/preview-orchestrator.ts` qui détecte 2 ports libres (ex: `4001` et `4002`), lance les serveurs de dev de chaque worktree en arrière-plan et expose un reverse-proxy interne (`/api/preview/[taskId]/claude` et `/api/preview/[taskId]/antigravity`).
  - [ ] #task #antigravity [priority:: high] Connecter les `<iframe>` du `Visual Diff Overlay Slider` dans `DualBranchArena.tsx` à ces routes dynamiques avec indicateur de chargement et bouton "Hard Reload Preview".
  - [ ] #task #claude [priority:: medium] Ajouter un "Auto-Sleep" qui tue les processus de preview après 15 minutes d'inactivité pour économiser la RAM du VPS Coolify.

### 1.3 Vrai Terminal Interactif PTY & Correction des Permissions Docker
- **Problème** : Les commandes interactives (`claude login`, `agy login`, `htop`, prompts de confirmation) nécessitent un vrai flux PTY bidirectionnel, et l'utilisateur Docker `nextjs` ne peut pas lire `/root/.claude` sans ajustement des droits.
- **Actions** :
  - [ ] #task #claude [priority:: critical] Corriger le `Dockerfile` et `CliSetupWizard.tsx` pour unifier les variables `$HOME`, `CLAUDE_CONFIG_DIR` et les permissions `chown -R nextjs:nodejs` sur les volumes persistés.
  - [ ] #task #dual [priority:: high] Connecter `XtermTerminal.tsx` à un flux `node-pty` temps réel (via WebSocket ou streaming SSE + input POST) pour supporter les couleurs ANSI, le redimensionnement (`fitAddon`) et les sessions persistantes.

---

## 🧠 PHASE 2 : Pont Bidirectionnel VibeFlow <-> Obsidian ("Second Cerveau")
*Objectif : Faire d'Obsidian la mémoire long terme et l'éditeur de spécifications de VibeFlow Studio.*

### 2.1 Synchronisation Temps Réel Kanban <-> Notes Markdown (`obsidian-sync.ts`)
- **Actions** :
  - [ ] #task #antigravity [priority:: critical] Créer `src/lib/obsidian-sync.ts` et l'endpoint `POST /api/obsidian/sync`.
  - [ ] #task #antigravity [priority:: high] Chaque création ou déplacement de carte dans `KanbanBoard.tsx` met à jour automatiquement un fichier `/obsidian-vault/03_Kanban_Tasks/TASK-[ID]-[Slug].md` (avec Frontmatter YAML `status`, `priority`, `agent_owner`).
  - [ ] #task #claude [priority:: high] Ajouter un File Watcher (`chokidar`) sur `/obsidian-vault/03_Kanban_Tasks/` : si l'utilisateur modifie une note dans Obsidian ou coche une sous-tâche, la base PostgreSQL (Prisma) se met à jour et notifie l'UI via `/api/events` (SSE).

### 2.2 Archivage Automatique des Débats & Rapports d'Auto-Guérison
- **Actions** :
  - [ ] #task #antigravity [priority:: medium] À la fin de chaque phase `DUAL_DEV`, exporter la transcription complète du débat Claude vs Antigravity + les notes du Juge IA dans `/obsidian-vault/04_AI_Debates_Logs/DEBATE-[TaskID].md`.
  - [ ] #task #claude [priority:: medium] À chaque intervention de `self-healing.ts` suite à un webhook Coolify en échec, générer un rapport Post-Mortem dans `/obsidian-vault/05_Self_Healing_Reports/HEAL-[DeploymentID].md` détaillant l'erreur, le diff du patch et le résultat du re-build.

---

## ⚡ PHASE 3 : Nouvelles Fonctionnalités "Killer Features" (Expérience Utilisateur Ultime)
*Objectif : Enrichir l'outil avec des fonctionnalités exclusives introuvables dans les IDE classiques.*

### 3.1 Mode "Fusion Hybride / Cherry-Pick Assisté" dans l'Arène (`DualBranchArena.tsx`)
- **Concept** : Souvent, Claude produit une meilleure architecture Backend/API et Antigravity une meilleure interface UI/UX. Au lieu de choisir un seul gagnant et jeter le travail de l'autre, permettre une fusion chirurgicale.
- **Actions** :
  - [ ] #task #antigravity [priority:: high] Ajouter dans `DualBranchArena.tsx` une sélection fichier par fichier (cases à cocher dans le Code Diff : "Prendre de Claude" vs "Prendre d'Antigravity").
  - [ ] #task #claude [priority:: high] Ajouter un bouton **"🧬 Synthèse Hybride IA"** où le Juge IA fusionne automatiquement le meilleur des deux branches dans une 3ème branche `synthesis-impl`, vérifie que `tsc --noEmit` passe, et ouvre la PR.

### 3.2 Juge IA Équipé de Tests E2E Visuels (Playwright Runner)
- **Concept** : Le Juge IA ne se contente plus de lire le code statiquement ; il teste réellement l'application générée.
- **Actions** :
  - [ ] #task #claude [priority:: medium] Intégrer un runner Playwright léger qui visite les deux serveurs de preview, capture les erreurs `console.error` runtime, mesure le temps de rendu (LCP) et prend des screenshots automatiques pour les 3 viewports (Desktop, Tablette, Mobile).

### 3.3 Widget "Économiseur de Tokens Pro-First" (`TokenSavingsTracker.tsx`)
- **Concept** : Matérialiser la valeur économique de l'architecture 0€ de token.
- **Actions** :
  - [ ] #task #antigravity [priority:: medium] Compter le nombre de caractères/tokens échangés dans les CLIs locales et afficher dans `TopBar.tsx` un compteur : *"💰 Économisé ce mois-ci : ~142.50 € (0.00 € facturé via CLIs Pro)"*.

### 3.4 Mode "Prompt-to-Architecture" & Dictée Vocale (Voice-to-Vibe)
- **Actions** :
  - [ ] #task #antigravity [priority:: low] Ajouter un bouton microphone dans `KanbanBoard.tsx` (Web Speech API) permettant de dicter une idée de fonctionnalité à la volée, qui est instantanément structurée en spécification technique par Antigravity et placée en colonne `SPECIFICATION`.

---

## 🛡️ PHASE 4 : Sécurité, Daemon Autonome 24/7 & Scalabilité
- [ ] #task #claude [priority:: high] **Hardening de `/api/terminal/execute`** : Implémenter une liste blanche/noire de commandes destructrices (`rm -rf /`, modification système hors `/tmp` et `/app`) et authentifier strictement toutes les routes API et SSE.
- [ ] #task #claude [priority:: medium] **Contrôleur du Daemon (`/api/daemon/tick`)** : Ajouter dans la `TopBar.tsx` un interrupteur maître **"🤖 Mode Autonome 24/7 (ON/OFF)"** avec réglage de la fréquence des ticks BullMQ et limite du nombre de tâches traitées sans validation humaine.
