// ============================================================
// VibeFlow Studio — Admin Database Initializer & Migration Route
// Applies Prisma PostgreSQL DDL schema & seeds demo data
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DDL_STATEMENTS = [
  // 1. Schemas & Enums
  `CREATE SCHEMA IF NOT EXISTS "public";`,
  `DO $$ BEGIN CREATE TYPE "ProjectMode" AS ENUM ('ASSISTED', 'AUTO'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "MilestonePhase" AS ENUM ('ARCHITECTURE', 'MVP', 'UI_UX', 'INTEGRATIONS', 'DEPLOYMENT', 'MAINTENANCE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "ToolboxCategory" AS ENUM ('FRAMEWORK', 'DATABASE', 'AUTH', 'PAYMENT', 'UI_KIT', 'API', 'MONITORING', 'CI_CD', 'HOSTING', 'TESTING', 'SECURITY', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "ToolboxStatus" AS ENUM ('ACQUIRED', 'MISSING', 'IN_PROGRESS'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'CLAUDE_IN_PROGRESS', 'ANTIGRAVITY_IN_PROGRESS', 'IN_DEBATE', 'SYNTHESIS', 'TESTING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "TaskOrigin" AS ENUM ('USER', 'AI_GENERATED', 'AUTO_OPTIMIZATION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AgentSpeaker" AS ENUM ('CLAUDE', 'ANTIGRAVITY', 'SYSTEM', 'USER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'BUILDING', 'RUNNING', 'STOPPED', 'FAILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "DeploymentEnvironment" AS ENUM ('PRODUCTION', 'PREVIEW', 'STAGING'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  // 2. Tables
  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vibeDescription" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "githubDefaultBranch" TEXT NOT NULL DEFAULT 'main',
    "coolifyAppUuid" TEXT,
    "coolifyServerUrl" TEXT,
    "mode" "ProjectMode" NOT NULL DEFAULT 'ASSISTED',
    "anthropicApiKey" TEXT,
    "coolifyApiToken" TEXT,
    "githubToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" "MilestonePhase" NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "githubIssueNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "ToolboxItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ToolboxCategory" NOT NULL,
    "status" "ToolboxStatus" NOT NULL DEFAULT 'MISSING',
    "version" TEXT,
    "configJson" JSONB,
    "snippetCode" TEXT,
    "sourceFile" TEXT,
    "detectedAt" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ToolboxItem_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "origin" "TaskOrigin" NOT NULL DEFAULT 'USER',
    "claudeBranch" TEXT,
    "antigravityBranch" TEXT,
    "synthesisBranch" TEXT,
    "claudePrNumber" INTEGER,
    "antigravityPrNumber" INTEGER,
    "synthesisPrNumber" INTEGER,
    "claudeImplementation" TEXT,
    "antigravityImplementation" TEXT,
    "synthesisDecision" TEXT,
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "AgentDebateLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "speaker" "AgentSpeaker" NOT NULL,
    "message" TEXT NOT NULL,
    "codeDiffRef" TEXT,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "qualityScore" DOUBLE PRECISION,
    "phase" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentDebateLog_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT,
    "coolifyDeploymentUuid" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "environment" "DeploymentEnvironment" NOT NULL DEFAULT 'PREVIEW',
    "previewUrl" TEXT,
    "logs" TEXT,
    "errorMessage" TEXT,
    "healingAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxHealingAttempts" INTEGER NOT NULL DEFAULT 3,
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "milestoneRef" TEXT,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "GlobalSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultGithubToken" TEXT,
    "defaultAnthropicKey" TEXT,
    "defaultCoolifyUrl" TEXT,
    "defaultCoolifyToken" TEXT,
    "redisUrl" TEXT DEFAULT 'redis://localhost:6379',
    "autoModeIntervalMs" INTEGER NOT NULL DEFAULT 300000,
    "maxConcurrentTasks" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
  );`,

  // 3. Indexes
  `CREATE UNIQUE INDEX IF NOT EXISTS "Project_slug_key" ON "Project"("slug");`,
  `CREATE INDEX IF NOT EXISTS "Project_slug_idx" ON "Project"("slug");`,
  `CREATE INDEX IF NOT EXISTS "Milestone_projectId_status_idx" ON "Milestone"("projectId", "status");`,
  `CREATE INDEX IF NOT EXISTS "ToolboxItem_projectId_status_idx" ON "ToolboxItem"("projectId", "status");`,
  `CREATE INDEX IF NOT EXISTS "Task_projectId_status_idx" ON "Task"("projectId", "status");`,
  `CREATE INDEX IF NOT EXISTS "AgentDebateLog_taskId_createdAt_idx" ON "AgentDebateLog"("taskId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "Deployment_projectId_status_idx" ON "Deployment"("projectId", "status");`,
  `CREATE INDEX IF NOT EXISTS "ChatMessage_projectId_createdAt_idx" ON "ChatMessage"("projectId", "createdAt");`,
];

export async function POST() {
  try {
    console.log("[Init-DB] Applying database DDL statements...");
    for (const sql of DDL_STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Check if demo project exists, if not seed it
    const projectCount = await prisma.project.count();
    if (projectCount === 0) {
      console.log("[Init-DB] Seeding initial project PulseCart AI...");
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
          coolifyServerUrl: "https://coolify.capstation.fr",
          mode: "ASSISTED",
        },
      });

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
          synthesisDecision: "Consensus validé : architecture d'intégrité transactionnelle de Claude + fluidité UI avec Immer et micro-animations de Antigravity.",
        },
      });

      await prisma.agentDebateLog.createMany({
        data: [
          {
            taskId: task1.id,
            speaker: "CLAUDE",
            phase: "review",
            round: 1,
            qualityScore: 8.5,
            message: "L'implémentation Antigravity avec Immer est très fluide pour l'UI, mais attention aux conflits réseau 409 si 2 requêtes concurrentes touchent le même stock.",
          },
          {
            taskId: task1.id,
            speaker: "ANTIGRAVITY",
            phase: "review",
            round: 1,
            qualityScore: 9.0,
            message: "L'architecture machine à états de Claude est ultra-robuste. Injectons son validateur checksum dans le middleware Zustand pour avoir le meilleur des deux mondes.",
          },
          {
            taskId: task1.id,
            speaker: "SYSTEM",
            phase: "synthesis",
            round: 2,
            qualityScore: 9.8,
            message: "Synthèse validée. Pull Request #14 prête pour le merge et déploiement.",
          },
        ],
      });

      // Seed standard toolbox items
      await prisma.toolboxItem.createMany({
        data: [
          {
            projectId: project.id,
            name: "Next.js 15 (App Router)",
            category: "FRAMEWORK",
            status: "ACQUIRED",
            version: "15.1.0",
            sourceFile: "package.json",
          },
          {
            projectId: project.id,
            name: "Prisma ORM & PostgreSQL",
            category: "DATABASE",
            status: "ACQUIRED",
            version: "6.2.0",
            sourceFile: "prisma/schema.prisma",
          },
          {
            projectId: project.id,
            name: "Stripe SDK & Webhooks",
            category: "PAYMENT",
            status: "MISSING",
            description: "Paiements par CB et gestion des abonnements récurrents",
          },
          {
            projectId: project.id,
            name: "Redis Cache Client (BullMQ)",
            category: "DATABASE",
            status: "MISSING",
            description: "Gestion des files de tâches d'agents en arrière-plan",
          },
        ],
      });

      console.log("[Init-DB] Demo project and data seeded successfully.");
    }

    return NextResponse.json({
      success: true,
      message: "Database schema successfully migrated and demo data ready.",
      projectCount: await prisma.project.count(),
    });
  } catch (err: any) {
    console.error("[Init-DB Error]", err);
    return NextResponse.json(
      { error: "Database initialization failed", details: err.message },
      { status: 500 }
    );
  }
}
