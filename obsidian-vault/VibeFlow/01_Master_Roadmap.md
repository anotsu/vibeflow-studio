---
tags: [vibeflow, roadmap, planning, master]
project: VibeFlow Studio
version: 2.0.0-PROD
updated: 2026-11-07
---

# 🚀 VibeFlow Studio — Master Roadmap Industrielle (8 Phases)

> [!NOTE] Philosophie d'Exécution Dual-Agent
> Chaque action est assignée soit à **Claude Code Pro** (Architecture, Robustesse & Typage), soit à **Antigravity CLI** (UI/UX, 60fps & Challengers Rapides), soit en mode **Dual** pour fusion collective.
> Aucun mock n'est toléré dans l'architecture finale.

---

## 🧱 PHASE 1 : Consolidation Core & Plomberie Système Réelle (Zéro Mock)
*Objectif : Garantir que le duel entre Claude et Antigravity s'exécute physiquement et sans conflit dans le conteneur Docker.*

### 1.1 Isolation Physique des Branches via Git Worktrees (`git-worktree-manager.ts`)
- **Problème résolu** : Deux agents qui codent en même temps dans le même répertoire écrasaient leurs fichiers respectifs s'ils faisaient `git checkout`.
- **Actions** :
  - [x] #task #claude [priority:: critical] Créer `src/lib/git-worktree-manager.ts` pour provisionner deux dossiers isolés par tâche : `/tmp/vibeflow-worktrees/[taskId]/claude-impl` et `/tmp/vibeflow-worktrees/[taskId]/antigravity-impl`.
  - [x] #task #claude [priority:: high] Exécuter les sessions `claude` et `agy` chacune dans son propre `cwd` (Worktree dédié).
  - [x] #task #claude [priority:: medium] Nettoyer automatiquement les worktrees (`git worktree remove --force` + `git worktree prune`) dès que la tâche passe en `COMPLETED`.

### 1.2 Serveurs de Prévisualisation Éphémères pour le Visual Diff Slider (`preview-orchestrator.ts`)
- **Problème résolu** : Le `DualBranchArena.tsx` a besoin de deux vraies URLs live pour superposer les rendus de `claude-impl` et `antigravity-impl` via `clip-path`.
- **Actions** :
  - [x] #task #claude [priority:: critical] Créer `src/lib/preview-orchestrator.ts` qui détecte 2 ports libres (ex: `4100` à `4999`), lance les serveurs de dev de chaque worktree en arrière-plan et expose un reverse-proxy interne (`/api/preview/[taskId]/claude` et `/api/preview/[taskId]/antigravity`).
  - [x] #task #antigravity [priority:: high] Connecter les `<iframe>` du `Visual Diff Overlay Slider` dans `DualBranchArena.tsx` à ces routes dynamiques avec indicateur de chargement et bouton "Hard Reload Preview".
  - [x] #task #claude [priority:: medium] Ajouter un "Auto-Sleep" qui stoppe les processus de preview après 15 minutes d'inactivité pour économiser la RAM du VPS Coolify.

### 1.3 Vrai Terminal Interactif PTY & Permissions Docker
- **Problème résolu** : Les commandes interactives (`claude login`, `agy login`, `htop`, invites interactives) nécessitent un vrai flux PTY bidirectionnel.
- **Actions** :
  - [x] #task #claude [priority:: critical] Unifier `$HOME=/home/nextjs`, sessions persistées dans le `Dockerfile` et permissions non-root `nextjs:nodejs`.
  - [x] #task #dual [priority:: high] Connecter `XtermTerminal.tsx` à un flux `node-pty` temps réel avec bascule automatique sur l'interpréteur de commandes sécurisé `/api/terminal/execute`.
  - [x] #task #dual [priority:: high] Intégrer le moteur de détection d'état d'agent inspiré de Herdr (`src/lib/agent-state-detector.ts` via regex `claude.toml` & `antigravity.toml` + protocole OSC 7501) avec bannière de déblocage en 1 clic dans `XtermTerminal.tsx` et `DualBranchArena.tsx`.

---

## 🧠 PHASE 2 : Pont Bidirectionnel VibeFlow <-> Obsidian ("Second Cerveau")
*Objectif : Faire d'Obsidian la mémoire long terme et l'éditeur de spécifications de VibeFlow Studio.*

### 2.1 Synchronisation Temps Réel Kanban <-> Notes Markdown (`obsidian-sync.ts`)
- **Actions** :
  - [x] #task #antigravity [priority:: critical] Créer `src/lib/obsidian-sync.ts` et l'endpoint `POST /api/obsidian/sync`.
  - [x] #task #antigravity [priority:: high] Chaque création ou déplacement de carte dans `KanbanBoard.tsx` met à jour automatiquement un fichier `VibeFlow/03_Kanban_Tasks/TASK-[ID]-[Slug].md` (avec Frontmatter YAML `status`, `priority`, `agent_owner`).
  - [x] #task #antigravity [priority:: high] Synchronisation directe via l'API REST locale d'Obsidian (`http://192.168.1.203:27123`) avec token Bearer.

### 2.2 Archivage Automatique des Débats & Rapports d'Auto-Guérison
- **Actions** :
  - [x] #task #antigravity [priority:: medium] À la fin de chaque phase `DUAL_DEV`, exporter la transcription complète du débat Claude vs Antigravity + les notes du Juge IA dans `VibeFlow/04_AI_Debates_Logs/DEBATE-[TaskID].md`.
  - [x] #task #claude [priority:: medium] À chaque intervention de `self-healing.ts` suite à un webhook Coolify en échec, générer un rapport Post-Mortem dans `VibeFlow/05_Self_Healing_Reports/HEAL-[DeploymentID].md` détaillant l'erreur, le diff du patch et le résultat du re-build.

---

## ⚡ PHASE 3 : Nouvelles Fonctionnalités "Killer Features"
*Objectif : Enrichir l'outil avec des fonctionnalités exclusives.*

### 3.1 Mode "Fusion Hybride / Cherry-Pick Assisté" dans l'Arène (`DualBranchArena.tsx`)
- **Concept** : Permettre une fusion chirurgicale entre le meilleur code de Claude (Backend/API) et celui d'Antigravity (UI/UX).
- **Actions** :
  - [x] #task #antigravity [priority:: high] Ajouter dans `DualBranchArena.tsx` une sélection couche par couche (`CherryPickView` : Architecture Prisma, API Routes & Sécurité, Composants React 19, Design System Tailwind, Performance 60fps).
  - [x] #task #claude [priority:: high] Ajouter un bouton **"🧬 Synthèse Hybride IA"** où le Juge IA fusionne automatiquement le meilleur des deux branches dans la 3ème branche `synthesis/solution`, vérifie que `tsc --noEmit` passe, et ouvre la PR.

### 3.2 Juge IA Équipé de Tests E2E Visuels (Playwright Runner)
- **Concept** : Le Juge IA teste réellement l'application générée dans un navigateur sans tête.
- **Actions** :
  - [x] #task #claude [priority:: high] Intégrer un runner Playwright léger (`playwright-runner.ts`) qui visite les deux serveurs de preview, capture les erreurs `console.error` runtime, mesure le temps de rendu (LCP) et prend des captures d'écran comparatives.

### 3.3 Widget "Économiseur de Tokens Pro-First" (`TokenSavingsTracker.tsx`)
- **Concept** : Matérialiser la valeur économique de l'architecture 0€ de token.
- **Actions** :
  - [x] #task #antigravity [priority:: medium] Compter le nombre de caractères/tokens échangés dans les CLIs locales et afficher dans `TopBar.tsx` un compteur : *"💰 Économisé : ~148.60 € (0.00 € facturé via CLIs Pro)"*.
  - [x] #task #antigravity [priority:: medium] Modal interactif avec ROI, barres comparatives par moteur et calcul d'amortissement des abonnements Pro.

---

## 🛡️ PHASE 4 : Sécurité, Daemon Autonome 24/7 & Scalabilité
- [x] #task #claude [priority:: high] **Hardening de `/api/terminal/execute`** : Filtrage sur liste blanche de commandes sûres (`git`, `node`, `npm`, `npx`, `pnpm`, `ls`, etc.) et isolation.
- [x] #task #claude [priority:: medium] **Contrôleur du Daemon (`/api/daemon/tick`)** : Ajouter dans la `TopBar.tsx` un interrupteur maître **"🤖 Mode Autonome 24/7 (ON/OFF)"** avec modal de réglage de la fréquence des ticks, limites de tâches et auto-guérison Coolify.

---

## 🔬 PHASE 5 : Tests Visuels E2E & Juge IA Multimodal (Playwright + AI Vision)
*Objectif : Transformer le Juge IA en véritable testeur automatisé capable de naviguer dans l'UI, d'auditer les performances et de détecter les régressions visuelles.*

### 5.1 Runner Playwright E2E Headless Automatisé (`playwright-runner.ts`)
- **Concept** : Faire naviguer un navigateur Chromium sans tête sur chaque worktree avant validation de la tâche.
- **Actions** :
  - [x] #task #claude [priority:: critical] Créer `src/lib/playwright-runner.ts` pour visiter automatiquement les serveurs de preview (`/api/preview/[taskId]/claude` vs `/api/preview/[taskId]/antigravity`).
  - [x] #task #claude [priority:: high] Détecter et consigner les `console.error`, erreurs de rendu React (Hydration mismatch, unhandled exceptions) et erreurs 404/500 sur les routes dynamiques.
  - [x] #task #antigravity [priority:: medium] Afficher un onglet et modal de rapport de tests automatisés dans `DualBranchArena.tsx` (`E2EReportModal`) avec les logs de console capturés en temps réel.

### 5.2 Analyse Critique Multimodale par Vision IA (Pixel Diff & Review Visuelle)
- **Concept** : Évaluer l'esthétique et l'accessibilité comme un designer humain expert.
- **Actions** :
  - [ ] #task #antigravity [priority:: high] Captures d'écran pleine page Desktop (1920x1080) et Mobile (375x812) pour chaque branche.
  - [ ] #task #antigravity [priority:: high] Comparaison visuelle pixel par pixel (`pixelmatch`) et injection des images dans le Juge IA Antigravity Vision pour évaluer les débordements CSS, le contraste et l'accessibilité WCAG.
  - [ ] #task #claude [priority:: medium] Générer une image de diff superposée annotant automatiquement en rouge les zones de conflit visuel.

### 5.3 Métriques Web Vitals & Benchmark LCP/FID/CLS
- **Concept** : Arbitrer les duels sur des critères objectifs de performance web.
- **Actions** :
  - [x] #task #claude [priority:: medium] Audit automatique de performance : temps de chargement du premier octet (TTFB), Largest Contentful Paint (LCP) et score de stabilité visuelle (CLS) pour chaque branche.
  - [x] #task #antigravity [priority:: medium] Intégration de badges de scores Core Web Vitals dans l'en-tête de comparaison de `DualBranchArena.tsx`.

---

## 🌐 PHASE 6 : Multi-Projets Polyglottes & Architecture Tunnels Sécurisés
*Objectif : Rendre VibeFlow Studio compatible avec tout type de framework et permettre le test instantané sur appareils mobiles réels.*

### 6.1 Prise en Charge Multi-Stacks Polyglottes (Next.js, Vite, FastAPI, Rust)
- **Concept** : Permettre à VibeFlow d'importer et d'optimiser n'importe quel dépôt GitHub, quel que soit le langage.
- **Actions** :
  - [ ] #task #claude [priority:: high] Détection automatique du moteur de build (`Next.js`, `Vite/React`, `Vue/Nuxt`, `SvelteKit`, `FastAPI/Python`, `Rust Axum`).
  - [ ] #task #claude [priority:: high] Génération dynamique du script de démarrage du serveur de preview éphémère selon la stack détectée (`npm run dev`, `uvicorn`, `cargo watch`).
  - [ ] #task #antigravity [priority:: medium] Badges de technologie détectée affichés sur la fiche projet dans la TopBar.

### 6.2 Tunnels Éphémères Mobiles (Cloudflare Tunnel / Ngrok / Tailscale)
- **Concept** : Tester l'application sur un smartphone réel sans configuration DNS ou port-forwarding.
- **Actions** :
  - [x] #task #antigravity [priority:: high] Créer un endpoint `POST /api/preview/[taskId]/tunnel` (`tunnel-manager.ts`) pour générer un lien public temporaire sécurisé.
  - [x] #task #antigravity [priority:: medium] Afficher un QR Code interactif dans `DualBranchArena.tsx` (`MobileTunnelModal`) permettant au développeur de scanner et tester immédiatement le rendu mobile en conditions réelles.
  - [x] #task #claude [priority:: medium] Fermeture automatique du tunnel dès la mise en sommeil du serveur de preview.

### 6.3 Gestionnaire Multi-Tenancy & Espaces de Travail Multiples
- **Concept** : Orchestrer plusieurs projets en parallèle sans interférence de mémoire ou de ports.
- **Actions** :
  - [ ] #task #claude [priority:: high] Isolation étanche des environnements de dev lorsque plusieurs projets sont gérés simultanément dans VibeFlow.
  - [ ] #task #antigravity [priority:: medium] Vue d'ensemble multi-projets dans le tableau de bord avec statut des daemons respectifs.

---

## 📱 PHASE 7 : Cockpit Mobile Développeur, Alertes Webhooks & Spécifications Structurées
*Objectif : Permettre au lead developer de cadrer des tâches de manière chirurgicale, de recevoir des alertes en temps réel et de monitorer la vélocité de l'équipe IA.*

### 7.1 Guide de Cadrage Pré-VibeCoding & Générateur de Blueprint (`ProjectFramingGuide.tsx` & `frame-blueprint`)
- **Concept** : Cadrer un projet de manière exhaustive (Vision, Stack, Modèle de données, Jalons et Règles d'agents) avant de rentrer dans le code.
- **Actions** :
  - [x] #task #claude [priority:: high] Créer un guide de cadrage interactif en 5 étapes (`ProjectFramingGuide.tsx` & `/api/projects/frame-blueprint`) structurant la vision, la matrice technique, le schéma de données et les règles d'or des agents.
  - [x] #task #claude [priority:: high] Génération automatique du Project Charter Markdown et synchronisation dans Obsidian (`VibeFlow/06_Project_Blueprints/[slug]_Charter.md`).
  - [ ] #task #antigravity [priority:: medium] Prévisualisation interactive des spécifications dans l'onglet `SPECIFICATION` du Kanban avec validation en un clic.

### 7.2 Hub de Notifications Développeur (Telegram / Discord / Slack Webhooks)
- **Concept** : Être alerté en mobilité lorsqu'une PR est prête ou qu'un build Coolify a été guéri.
- **Actions** :
  - [x] #task #claude [priority:: high] Configuration du répartiteur de webhooks Discord et bot Telegram dans `src/lib/notifications.ts`.
  - [x] #task #claude [priority:: high] Envoi automatique de notifications enrichies (titre de la tâche, scores de duel, lien de preview, diff résumé).
  - [x] #task #antigravity [priority:: medium] Prise en charge des payloads formatés avec liens de review et synthèse IA.

### 7.3 Dashboard Analytics de Vitesse & Vélocité d'Équipe IA
- **Concept** : Visualiser la progression et la vélocité de l'ingénierie augmentée.
- **Actions** :
  - [ ] #task #antigravity [priority:: medium] Graphiques de progression dans le Cockpit : vélocité hebdomadaire, temps moyen de résolution de tâche (MTTR), ratio de victoires Claude vs Antigravity.
  - [ ] #task #antigravity [priority:: medium] Projection financière des économies de tokens cumulées sur l'année.

---

## 🧩 PHASE 8 : Marketplace de Briques, Auto-Documentation & Custom Skills
*Objectif : Capitaliser sur le code produit pour créer un écosystème réutilisable et auto-documenté.*

### 8.1 Boîte à Outils ("Toolbox Store") & Export 1-Clic de Modules
- **Concept** : Sauvegarder les modules consensuels validés pour les réutiliser dans n'importe quel autre projet en 1 clic.
- **Actions** :
  - [ ] #task #antigravity [priority:: high] Possibilité d'exporter n'importe quelle implémentation consensuelle vers la `Toolbox` globale comme module prêt à l'emploi (ex: Auth NextAuth, Stripe Checkout, Dark Mode, etc.).
  - [ ] #task #claude [priority:: medium] Injection automatique du code et des dépendances associées dans un nouveau projet via `npm install` et copie de templates.

### 8.2 Auto-Génération de Documentation Technique Continue (Obsidian Docs & OpenAPI)
- **Concept** : Une documentation vivante toujours à jour avec le code réel en production.
- **Actions** :
  - [ ] #task #claude [priority:: high] À chaque PR fusionnée sur main, génération automatique de la fiche d'architecture dans `VibeFlow/06_API_Specs/` et mise à jour du `README.md` du dépôt GitHub.
  - [ ] #task #antigravity [priority:: medium] Génération automatique de diagrammes Mermaid d'architecture basés sur les composants React et relations Prisma réels.

### 8.3 Marketplace de Compétences IA Personnalisées (Custom Skills & Personas)
- **Concept** : Étendre l'intelligence des agents avec des règles métiers spécialisées.
- **Actions** :
  - [ ] #task #claude [priority:: high] Système de "Skills" pluggables pour orienter le débat IA (ex: Skill Sécurité OWASP, Skill SEO & Métadonnées, Skill Accessibilité RGAA/WCAG).
  - [ ] #task #antigravity [priority:: medium] Éditeur d'instructions de personas dans l'interface permettant de personnaliser le tempérament de chaque agent (ex: Claude "Auditeur Sécurité Paranoïaque" vs Antigravity "Designer Apple Minimaliste").
