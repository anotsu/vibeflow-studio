---
tags: [vibeflow, dashboard, moc, home]
project: VibeFlow Studio
production_url: https://vibeflow.capstation.fr
vps_coolify_id: 8kiofkrrwphlaus9iikr7m0g
cost_philosophy: Pro-First (0€ Token)
updated: 2026-11-07
---

# ⚡ VibeFlow Studio — Cockpit Central (Second Cerveau)

> [!SUCCESS] État de la Production : **OPÉRATIONNEL**
> 🌐 **App Live** : [vibeflow.capstation.fr](https://vibeflow.capstation.fr) | 🐳 **Infra** : Coolify (`8kiofkrrwphlaus9iikr7m0g`) | 💸 **Coût API** : `0.00 €` (Mode CLI Pro)

## 🧭 Navigation Rapide (Map of Content)
- **Stratégie** : [[01_Master_Roadmap|🚀 Master Roadmap Complète]] | [[03_Kanban_Tasks|📌 Backlog Synchronisé]]
- **Frontend** : [[KanbanBoard.tsx]] | [[DualBranchArena.tsx]] | [[CloudCLI.tsx]] | [[CliSetupWizard.tsx]] | [[Toolbox.tsx]]
- **Backend & Infra** : [[self-healing.ts]] | [[git-worktree-manager.ts]] | [[obsidian-sync.ts]] | [[Docker_Coolify_Infra]]

## 🔄 Architecture d'Exécution Réelle Dual-Agent

```mermaid
graph TD
    classDef claude fill:#d97757,stroke:#fff,stroke-width:2px,color:#fff;
    classDef agy fill:#4285f4,stroke:#fff,stroke-width:2px,color:#fff;
    classDef core fill:#1e293b,stroke:#94a3b8,stroke-width:2px,color:#fff;
    classDef win fill:#10b981,stroke:#fff,stroke-width:2px,color:#fff;

    A[📥 Tâche Backlog / Sync Obsidian]:::core --> B(📝 Phase 2 : SPECIFICATION):::core
    B --> C{💬 Débat contradictoire via SSE}:::core
    
    C -->|Git Worktree Isolé 1| D[🧠 Claude Code CLI<br/>Branche: claude-impl<br/>Serveur Preview: Port 4001]:::claude
    C -->|Git Worktree Isolé 2| E[⚡ Antigravity CLI agy<br/>Branche: antigravity-impl<br/>Serveur Preview: Port 4002]:::agy

    D --> F[🖼️ Visual Diff Overlay Slider<br/>Comparaison Iframes Live + Code Diff]:::core
    E --> F

    F --> G[⚖️ Phase 4 : SYNTHESIS<br/>Juge IA + Tests Playwright Auto]:::core
    G --> H[🚀 Phase 5 : DEPLOYED<br/>Merge + PR GitHub + Webhook Coolify]:::win
    H -->|Échec Build ?| I[🛡️ Self-Healing Engine<br/>Analyse Logs & Patch Auto]:::core
    I --> H
```

## 🔥 Tâches Critiques en Cours (Dataview)
```dataview
TABLE WITHOUT ID
  file.link AS "Module",
  priority AS "Priorité",
  agent_owner AS "Agent",
  phase AS "Phase"
FROM #vibeflow
WHERE status = "in-progress" OR priority = "critical"
SORT priority ASC
```
