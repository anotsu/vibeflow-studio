// ============================================================
// VibeFlow Studio — Comprehensive Database Seed Script
// Populates full realistic demo dataset for testing & verification
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding VibeFlow Studio database...");

  // Clear existing demo data
  await prisma.agentDebateLog.deleteMany({});
  await prisma.deployment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.toolboxItem.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.globalSettings.deleteMany({});

  // 1. Global Settings
  await prisma.globalSettings.create({
    data: {
      id: "singleton",
      defaultCoolifyUrl: "https://coolify.vibeflow.dev",
      redisUrl: "redis://localhost:6379",
      autoModeIntervalMs: 300000,
      maxConcurrentTasks: 2,
    },
  });

  // 2. Demo Project
  const project = await prisma.project.create({
    data: {
      id: "proj_vibeflow_demo",
      name: "PulseCart AI",
      slug: "pulsecart-ai",
      vibeDescription:
        "Plateforme e-commerce nouvelle génération avec recommandations prédictives en direct, panier instantané synchronisé et checkout fluide intégrant Stripe & Coolify.",
      githubRepo: "vibeflow-team/pulsecart-ai",
      githubDefaultBranch: "main",
      coolifyAppUuid: "app_coolify_pulsecart_001",
      coolifyServerUrl: "https://coolify.vibeflow.dev",
      mode: "ASSISTED",
    },
  });

  console.log(`✔ Created project: ${project.name} (${project.id})`);

  // 3. Milestones (5 distinct phases)
  const m1 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: "Architecture & Modélisation PostgreSQL",
      description: "Conception du schéma Prisma, relations produits/paniers/utilisateurs et migrations.",
      phase: "ARCHITECTURE",
      order: 1,
      status: "COMPLETED",
      progress: 1.0,
      githubIssueNumber: 101,
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: "MVP Cœur Métier & API Routes",
      description: "Routes Next.js pour gestion des catalogues, paniers persistants et recalcul des totaux.",
      phase: "MVP",
      order: 2,
      status: "IN_PROGRESS",
      progress: 0.65,
      githubIssueNumber: 102,
    },
  });

  const m3 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: "UI/UX Cyber-Minimaliste & Fluidité",
      description: "Intégration Tailwind CSS, micro-interactions panier, toasts de confirmation et Dark Mode.",
      phase: "UI_UX",
      order: 3,
      status: "PENDING",
      progress: 0.2,
      githubIssueNumber: 103,
    },
  });

  const m4 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: "Intégrations Externes (Stripe & Redis)",
      description: "Webhooks Stripe pour paiements sécurisés et cache de sessions Redis pour haut débit.",
      phase: "INTEGRATIONS",
      order: 4,
      status: "PENDING",
      progress: 0.0,
      githubIssueNumber: 104,
    },
  });

  const m5 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: "Déploiement Continu & Preview Coolify",
      description: "Pipeline multi-branches avec création automatique d'environnements de prévisualisation.",
      phase: "DEPLOYMENT",
      order: 5,
      status: "PENDING",
      progress: 0.0,
      githubIssueNumber: 105,
    },
  });

  console.log("✔ Created 5 roadmap milestones");

  // 4. Toolbox Items (Acquired vs Missing)
  const toolboxData = [
    {
      name: "Next.js 15 (App Router)",
      category: "FRAMEWORK",
      status: "ACQUIRED",
      version: "15.1.0",
      sourceFile: "package.json",
      description: "Framework React pour le rendu hybride et routes serveur",
    },
    {
      name: "Prisma ORM",
      category: "DATABASE",
      status: "ACQUIRED",
      version: "6.2.0",
      sourceFile: "prisma/schema.prisma",
      description: "Client typé et migrations automatiques PostgreSQL",
    },
    {
      name: "Tailwind CSS",
      category: "UI_KIT",
      status: "ACQUIRED",
      version: "3.4.16",
      sourceFile: "tailwind.config.ts",
      description: "Système de design utilitaire pour thème cyber-minimaliste",
    },
    {
      name: "Docker & Compose",
      category: "CI_CD",
      status: "ACQUIRED",
      version: "24.0",
      sourceFile: "Dockerfile",
      description: "Conteneurisation standardisée pour Coolify",
    },
    {
      name: "Stripe SDK & Webhooks",
      category: "PAYMENT",
      status: "MISSING",
      description: "Nécessaire pour le traitement des cartes bancaires et abonnements",
      configJson: {
        installCommand: "npm install stripe @stripe/stripe-js",
        envVarsNeeded: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      },
    },
    {
      name: "Sentry Error Monitoring",
      category: "MONITORING",
      status: "MISSING",
      description: "Traçage temps réel des exceptions runtime serveur & client",
      configJson: {
        installCommand: "npx @sentry/wizard@latest -i nextjs",
        envVarsNeeded: ["SENTRY_DSN"],
      },
    },
    {
      name: "Redis Cache Client",
      category: "DATABASE",
      status: "MISSING",
      description: "Gestion des files de tâches BullMQ et cache de sessions",
      configJson: {
        installCommand: "npm install ioredis bullmq",
        envVarsNeeded: ["REDIS_URL"],
      },
    },
    {
      name: "Coolify Multi-Branch Previews",
      category: "HOSTING",
      status: "IN_PROGRESS",
      description: "Configuration des webhooks pour déploiements comparatifs",
      sourceFile: "coolify.json",
    },
  ];

  for (const item of toolboxData) {
    await prisma.toolboxItem.create({
      data: {
        projectId: project.id,
        name: item.name,
        category: item.category as any,
        status: item.status as any,
        version: item.version,
        sourceFile: item.sourceFile,
        description: item.description,
        configJson: item.configJson,
      },
    });
  }

  console.log(`✔ Created ${toolboxData.length} toolbox items`);

  // 5. Tasks with Dual-Branch Cross-Pollination details
  const task1 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m2.id,
      title: "Optimisation du Moteur de Panier & Synchronisation Optimiste",
      description:
        "Refonte du store de panier Zustand pour supporter les mises à jour optimistes, la persistance locale et la résolution de conflits de stock.",
      status: "SYNTHESIS",
      priority: "HIGH",
      origin: "USER",
      claudeBranch: "agent/claude-cart-sync",
      antigravityBranch: "agent/antigravity-cart-sync",
      synthesisBranch: "synthesis/cart-sync",
      claudePrNumber: 12,
      antigravityPrNumber: 13,
      synthesisPrNumber: 14,
      claudeImplementation: `// Claude: Approche axée sur la robustesse transactionnelle et typage strict
export interface CartState {
  items: Map<string, CartItem>;
  optimisticLocks: Record<string, number>;
  syncWithServer: (id: string) => Promise<SyncResult>;
}
// Intègre une machine à états à réduction pure pour garantir zéro état corrompu.`,
      antigravityImplementation: `// Antigravity: Approche axée sur la fluidité UI/UX et micro-interactions instantanées
export const useCartStore = create<CartUIStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      items: [],
      badgeAnimationTrigger: 0,
      addItemFast: (product) => set((s) => {
        // Optimistic UI dispatch with rollback on error
        s.items.push(product);
        s.badgeAnimationTrigger++;
      })
    }))
  )
);`,
      synthesisDecision: `Consensus validé par les deux agents :
1. De Claude : Architecture d'intégrité transactionnelle avec verrouillage optimiste et vérification du stock côté serveur.
2. De Antigravity : Utilisation d'Immer pour la réactivité, déclenchement immédiat des micro-animations dans le Header, et affichage non-bloquant des erreurs.
Résultat : La branche synthesis/cart-sync combine 100% de fiabilité avec une expérience utilisateur ultra-fluide.`,
    },
  });

  // Debate Logs for Task 1 (The Inter-Agent Arena conversation)
  const debateLogs = [
    {
      taskId: task1.id,
      speaker: "CLAUDE",
      phase: "review",
      round: 1,
      qualityScore: 8.2,
      message: `J'ai examiné l'implémentation de la branche \`agent/antigravity-cart-sync\`.
Points forts : L'utilisation d'Immer simplifie grandement les mutations du panier et la gestion des micro-interactions visuelles est excellente pour la rétention utilisateur.
Critique constructive : Il manque une stratégie de rollback en cas d'échec réseau 409 (conflit de stock). Si deux requêtes partent en même temps, l'UI affiche un total erroné avant le recalcul serveur.`,
      filePath: "src/stores/cart-store.ts",
      lineStart: 42,
      lineEnd: 78,
    },
    {
      taskId: task1.id,
      speaker: "ANTIGRAVITY",
      phase: "review",
      round: 1,
      qualityScore: 8.7,
      message: `J'ai analysé la branche \`agent/claude-cart-sync\`.
Points forts : L'architecture basée sur une machine à états avec locks optimistes est d'une robustesse exemplaire. Aucun risque d'incohérence monétaire.
Critique constructive : L'expérience utilisateur est trop stricte. Bloquer l'UI pendant l'attente du round-trip serveur casse le "vibe" d'achat impulsif. Nous devrions appliquer l'action immédiatement et avertir par toast discret uniquement en cas d'erreur.`,
      filePath: "src/lib/cart-engine.ts",
      lineStart: 15,
      lineEnd: 55,
    },
    {
      taskId: task1.id,
      speaker: "CLAUDE",
      phase: "debate",
      round: 2,
      qualityScore: 9.1,
      message: `Accord total sur le compromis : adoptons ton dispatch optimiste avec Immer, mais injectons mon validateur de somme de contrôle (checksum) dans le payload d'arrière-plan. Cela préserve la réactivité sans sacrifier l'intégrité.`,
    },
    {
      taskId: task1.id,
      speaker: "ANTIGRAVITY",
      phase: "debate",
      round: 2,
      qualityScore: 9.4,
      message: `Parfait ! Je propose d'intégrer ton validateur dans un middleware Zustand dédié et de fusionner le code sur la branche commune \`synthesis/cart-sync\`.`,
    },
    {
      taskId: task1.id,
      speaker: "SYSTEM",
      phase: "synthesis",
      round: 2,
      message: `Dual-Branch Cross-Pollination achevée avec succès. Création de la Pull Request #14 pour la branche synthesis/cart-sync.`,
    },
  ];

  for (const log of debateLogs) {
    await prisma.agentDebateLog.create({
      data: {
        taskId: log.taskId,
        speaker: log.speaker as any,
        phase: log.phase,
        round: log.round,
        qualityScore: log.qualityScore,
        message: log.message,
        filePath: log.filePath,
        lineStart: log.lineStart,
        lineEnd: log.lineEnd,
      },
    });
  }

  const task2 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m2.id,
      title: "Mise à jour en temps réel des stocks via WebSockets",
      description: "Diffusion des modifications d'inventaire vers tous les clients connectés.",
      status: "IN_DEBATE",
      priority: "MEDIUM",
      origin: "AI_GENERATED",
      claudeBranch: "agent/claude-stock-ws",
      antigravityBranch: "agent/antigravity-stock-ws",
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m1.id,
      title: "Configuration du Schéma Prisma & Migrations Initiales",
      description: "Modélisation des tables PostgreSQL : Product, Order, User, PaymentRecord.",
      status: "COMPLETED",
      priority: "CRITICAL",
      origin: "USER",
    },
  });

  const task4 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m3.id,
      title: "Design System & Composants Radix pour la Modal Panier",
      description: "Création des feuilles de styles et animations d'ouverture du tiroir de commande.",
      status: "BACKLOG",
      priority: "LOW",
      origin: "AUTO_OPTIMIZATION",
    },
  });

  console.log("✔ Created 4 tasks with debate logs and branch tracking");

  // 6. Deployments (Coolify preview environments)
  await prisma.deployment.create({
    data: {
      projectId: project.id,
      branch: "main",
      status: "RUNNING",
      environment: "PRODUCTION",
      previewUrl: "https://pulsecart-prod.vibeflow.dev",
      coolifyDeploymentUuid: "deploy_main_987",
      logs: "[Build] Next.js 15 app built in 14.2s\n[Docker] Image pulsecart:latest deployed\n[Coolify] Container healthy on port 3000.",
    },
  });

  await prisma.deployment.create({
    data: {
      projectId: project.id,
      branch: "agent/claude-cart-sync",
      status: "RUNNING",
      environment: "PREVIEW",
      previewUrl: "https://preview-claude-cart.vibeflow.dev",
      coolifyDeploymentUuid: "deploy_claude_112",
      logs: "[Preview Claude] Branch agent/claude-cart-sync deployed successfully.",
    },
  });

  await prisma.deployment.create({
    data: {
      projectId: project.id,
      branch: "agent/antigravity-cart-sync",
      status: "RUNNING",
      environment: "PREVIEW",
      previewUrl: "https://preview-antigravity-cart.vibeflow.dev",
      coolifyDeploymentUuid: "deploy_antigravity_113",
      logs: "[Preview Antigravity] Branch agent/antigravity-cart-sync deployed with Tailwind optimizations.",
    },
  });

  console.log("✔ Created 3 Coolify deployments");
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
