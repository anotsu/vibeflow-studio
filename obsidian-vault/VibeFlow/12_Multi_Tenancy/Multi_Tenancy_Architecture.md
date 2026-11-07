---
tags: [vibeflow, multi-tenancy, architecture, daemons, worktree, flotte]
project: VibeFlow Studio
version: 1.2.0
updated: 2026-11-07
---

# 🏢 VibeFlow Studio — Architecture Multi-Tenancy & Flotte de Daemons 24/7

> [!INFO] Vue d'Ensemble
> Ce document spécifie l'architecture multi-tenancy étanche de VibeFlow Studio, permettant d'exécuter plusieurs projets et dépôts simultanément sans interférence de mémoire, de ports TCP, de verrous Git ou de processus concurrents.

---

## 1. Principe d'Isolation Physique Multi-Projets

Pour garantir une étanchéité absolue entre plusieurs projets gérés au sein d'une même instance VibeFlow Studio :

```
/tmp/vibeflow-worktrees/
  ├── [projectId_A]/
  │     └── [taskId_1]/
  │           ├── claude-impl/       --> Git worktree agent/claude-[taskId]
  │           ├── antigravity-impl/  --> Git worktree agent/antigravity-[taskId]
  │           └── synthesis-impl/    --> Git worktree synthesis/[taskId]
  │
  └── [projectId_B]/
        └── [taskId_2]/
              ├── claude-impl/
              ├── antigravity-impl/
              └── synthesis-impl/
```

### Règles d'Étanchéité
1. **Namespacing Strict par Projet** : Chaque dossier de travail est partitionné par `projectId` puis par `taskId`. Deux projets distincts ne peuvent jamais se partager ou écraser un worktree local.
2. **Isolation des Variables d'Environnement** : L'exécution de commandes (`executeInWorktree`) injecte un environnement clos contenant `VIBEFLOW_PROJECT_ID`, `VIBEFLOW_TASK_ID`, et le rôle d'agent cible.
3. **Plafonnement des Ports de Prévisualisation** : L'orchestrateur de preview (`preview-orchestrator.ts`) alloue des ports TCP dynamiques dans la plage `4100-4999` et maintient une table associative `projectId:taskId:role`.
4. **Purge Ciblée 1-Clic** : La fonction `cleanupProjectWorktrees(projectId)` permet de supprimer l'intégralité des worktrees d'un projet sans impacter les autres projets en cours.

---

## 2. Cockpit de Flotte Multi-Projets & Daemons 24/7

L'interface propose une modal dédiée (`ProjectsOverviewModal.tsx`) et un endpoint API (`/api/projects/overview`) pour monitorer l'ensemble des dépôts :

### Métriques Clés de Flotte
- **Projets Gérés** : Nombre total de projets sous surveillance.
- **Daemons Auto 24/7** : Ratio de projets configurés en mode autonome continu vs mode accompagné.
- **Tâches en Cours d'Arbitrage** : Total des tâches actives dans le pipeline dual-branch (`CLAUDE_IN_PROGRESS`, `ANTIGRAVITY_IN_PROGRESS`, `IN_DEBATE`, `SYNTHESIS`).
- **Worktrees Isolés & Previews** : Suivi en temps réel de l'empreinte disque et mémoire sur le serveur Coolify.

### Contrôles Autonomes
- **Bascule de Mode Instantanée** : Passage d'un projet de `Accompagné` à `Auto 24/7` d'un simple clic.
- **Déclenchement Global de Flotte** : Bouton *"Exécuter Tous"* pour lancer un cycle d'inspection et d'auto-optimisation simultané sur tous les projets configurés en mode automatique.
- **Purge Mémoire à la Demande** : Bouton *"Purger"* pour éliminer les fichiers éphémères d'un projet inactif.

---

## 3. Matrice de Synchronisation et API

| Route API | Méthode | Rôle |
| :--- | :--- | :--- |
| `/api/projects/overview` | `GET` | Récupère la cartographie complète des projets, tâches, jalons, états des daemons et worktrees. |
| `/api/projects/overview` | `POST` | Exécute des actions de flotte : `toggle_mode`, `trigger_daemon`, `clean_worktrees`. |
| `/api/daemon/tick` | `POST` | Exécute un cycle de veille / optimisation sur un projet ciblé ou sur l'ensemble de la flotte. |
