# ⚡ VibeFlow Studio

> **Plateforme d'accompagnement au VibeCoding et d'orchestration d'agents IA autonomes**  
> *Dual-Branch Cross-Pollination (Claude Code × Antigravity) · CloudCLI Embarqué · Boîte à Outils Intelligente · CI/CD Coolify*

---

## 🌟 Présentation

**VibeFlow Studio** est un studio complet conçu pour accompagner les développeurs et créateurs de projets de l'idéation au déploiement continu, en réduisant la surcharge cognitive et en décuplant la vélocité grâce à un duel collaboratif permanent entre deux agents IA spécialisés : **Claude Code** (rigueur architecturale et robustesse transactionnelle) et **Antigravity** (fluidité UI/UX, micro-interactions et optimisations créatives).

---

## 🎯 Fonctionnalités Clés

### 1. 🧭 Vibe Guide & Roadmap Incrémentale
- **Onboarding par le "Vibe" :** Décrivez votre vision en langage naturel.
- **Découpage en 5 Jalons :** `Architecture` → `MVP` → `UI/UX` → `Intégrations` → `Déploiement`.
- **Focus Mono-Étape :** L'assistant ne présente qu'une décision/tâche à la fois pour préserver le flux créatif.
- **Synchronisation GitHub :** Création automatique d'Issues liées à chaque étape validée.

### 2. ⚔️ Dual-Branch Cross-Pollination (Duel Collaboratif)
- **Fork automatique de deux branches Git :** `agent/claude-[task]` et `agent/antigravity-[task]`.
- **Implémentation divergente :** Chaque agent résout le problème selon sa propre philosophie.
- **Peer-Review Automatisé :** Analyse croisée des `git diff`, relevé des forces/faiblesses et scoring de qualité.
- **Arène de Débat Visuelle :** Suivi en direct des échanges et compromis argumentés entre les deux IA.
- **Synthèse & Fusion :** Les meilleures idées sont fusionnées sur la branche `synthesis/[task]` avant création de la Pull Request finale.

### 3. 🧰 Boîte à Outils Intelligente (Gap Analysis)
- **Tableau de bord bi-colonne dynamique :**
  - **Ce que nous avons ✅ :** Détection automatique des dépendances (`package.json`), variables (`.env.example`), conteneurs (`Dockerfile`, `docker-compose.yml`), et base de données (`schema.prisma`).
  - **Ce qu'il nous manque ⚠️ :** Détection proactive des manques (ex: Stripe absent pour un checkout).
- **Actions 1-Clic :** Installation immédiate via le CloudCLI ou génération d'une tâche d'implémentation.

### 4. 💻 CloudCLI Multi-Sessions & Mode Broadcast
- **Terminal Web xterm.js :** Connecté via WebSockets (`node-pty`) avec support complet des codes d'échappement ANSI.
- **Multi-Onglets spécialisés :** Shell Bash Unix, session Claude Code, session Antigravity CLI, et logs conteneur Coolify.
- **Mode Broadcast :** Commande `@broadcast` pour router le même prompt simultanément aux deux agents.
- **Contexte Partagé :** Injection automatique de l'état Git, des alertes de boîte à outils et du statut de déploiement.

### 5. 🚀 Intégration Coolify & Boucle d'Auto-Guérison (Self-Healing)
- **Preview Deployments :** Déploiement automatique de chaque branche en prévisualisation isolée.
- **Comparateur Côte à Côte :** Deux iframes interactives pour tester en direct le rendu de Claude vs Antigravity.
- **Boucle d'Auto-Guérison :** En cas d'échec de build, le webhook Coolify extrait les logs d'erreur et missionne un agent pour corriger le code et relancer le push.

---

## 🛠️ Stack Technique

- **Frontend :** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Zustand.
- **Terminal Embarqué :** `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `socket.io-client`.
- **Backend & API :** Next.js Route Handlers, Server-Sent Events (SSE), Socket.IO, `node-pty`.
- **Base de Données & ORM :** PostgreSQL avec Prisma ORM (8 modèles, 8 énumérations).
- **Tâches d'Arrière-Plan :** BullMQ (Redis) avec mode de repli (fallback in-memory local).
- **Intégrations :** Octokit (GitHub REST & GraphQL API), Coolify API v1, Anthropic Claude SDK.

---

## 🚀 Démarrage Rapide

### 1. Cloner le projet
```bash
git clone https://github.com/anotsu/vibeflow-studio.git
cd vibeflow-studio
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
```

### 4. Démarrer PostgreSQL & Redis (Docker Compose optionnel)
```bash
docker compose up -d
```

### 5. Initialiser la base de données
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 6. Lancer VibeFlow Studio
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 📜 Licence

Projet sous licence MIT.
