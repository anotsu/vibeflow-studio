// ============================================================
// VibeFlow Studio — Deployment Worker (BullMQ)
// Handles Coolify deployments and toolbox scanning
// ============================================================

import { Worker, type Job } from "bullmq";
import {
  QUEUE_NAMES,
  getQueueConnection,
  enqueueAgentExecution,
  type DeploymentJobData,
  type ToolboxScanJobData,
} from "@/lib/queue";
import { createCoolifyService } from "@/lib/coolify";
import { createGitHubService } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/utils";

// ─── Deployment Worker ──────────────────────────────────────

const deployWorker = new Worker<DeploymentJobData>(
  QUEUE_NAMES.DEPLOYMENT,
  async (job: Job<DeploymentJobData>) => {
    const { projectId, branch, commitSha, environment, taskId } = job.data;
    console.log(
      `[DeployWorker] Deploying branch "${branch}" for project ${projectId}`
    );

    // Load project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);
    if (!project.coolifyServerUrl || !project.coolifyApiToken) {
      throw new Error("Coolify not configured for this project");
    }
    if (!project.coolifyAppUuid) {
      throw new Error("Coolify app UUID not configured");
    }

    const coolify = createCoolifyService(
      project.coolifyServerUrl,
      decrypt(project.coolifyApiToken)
    );

    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        branch,
        commitSha,
        environment,
        status: "BUILDING",
        triggeredBy: taskId ? "auto" : "user",
        startedAt: new Date(),
      },
    });

    try {
      // Trigger deployment on Coolify
      let result: { deploymentUuid: string };

      if (environment === "PREVIEW") {
        // Create preview deployment
        const preview = await coolify.createPreviewDeployment(
          project.coolifyAppUuid,
          branch
        );
        result = { deploymentUuid: preview.deploymentUuid };

        // Update with preview URL
        await prisma.deployment.update({
          where: { id: deployment.id },
          data: { previewUrl: preview.previewUrl },
        });
      } else {
        // Regular deployment
        result = await coolify.triggerDeployment(project.coolifyAppUuid, {
          branch,
          force: false,
        });
      }

      // Update deployment UUID
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { coolifyDeploymentUuid: result.deploymentUuid },
      });

      // Wait for deployment to complete
      const finalStatus = await coolify.waitForDeployment(
        result.deploymentUuid,
        600_000, // 10 minutes
        10_000 // Poll every 10s
      );

      // Get logs
      const logs = await coolify.getDeploymentLogs(result.deploymentUuid);

      // Determine final status
      const isSuccess =
        finalStatus.status === "running" || finalStatus.status === "finished";

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: isSuccess ? "RUNNING" : "FAILED",
          logs,
          previewUrl: finalStatus.previewUrl || deployment.previewUrl,
          finishedAt: new Date(),
          errorMessage: isSuccess ? null : `Deployment failed: ${finalStatus.status}`,
        },
      });

      if (!isSuccess) {
        // Self-healing: trigger agent to fix the error
        await handleDeploymentFailure(deployment.id, projectId, branch, logs, taskId);
      }

      console.log(
        `[DeployWorker] Deployment ${result.deploymentUuid} completed: ${isSuccess ? "SUCCESS" : "FAILED"}`
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[DeployWorker] Deployment failed: ${errorMsg}`);

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "FAILED",
          errorMessage: errorMsg,
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  },
  {
    connection: getQueueConnection(),
    concurrency: 3,
  }
);

/** Handle deployment failure — trigger self-healing if within retry limit */
async function handleDeploymentFailure(
  deploymentId: string,
  projectId: string,
  branch: string,
  logs: string,
  taskId?: string
) {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
  });

  if (
    !deployment ||
    deployment.healingAttempts >= deployment.maxHealingAttempts
  ) {
    console.log(
      `[DeployWorker] Max healing attempts reached for deployment ${deploymentId}`
    );
    return;
  }

  // Increment healing attempts
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { healingAttempts: { increment: 1 } },
  });

  // If there's an associated task, enqueue agent to fix
  if (taskId) {
    const errorContext = logs.slice(-2000); // Last 2000 chars of logs
    await enqueueAgentExecution({
      taskId,
      projectId,
      agent: "CLAUDE",
      branch,
      prompt: `The deployment for branch "${branch}" failed. Here are the last error logs:\n\n\`\`\`\n${errorContext}\n\`\`\`\n\nPlease analyze the error and fix the code to make the deployment succeed. Push the fix to the same branch.`,
    });

    console.log(
      `[DeployWorker] Self-healing triggered for deployment ${deploymentId} (attempt ${(deployment.healingAttempts || 0) + 1}/${deployment.maxHealingAttempts})`
    );
  }
}

deployWorker.on("completed", (job) => {
  console.log(`[DeployWorker] Job ${job.id} completed`);
});

deployWorker.on("failed", (job, error) => {
  console.error(`[DeployWorker] Job ${job?.id} failed:`, error.message);
});

// ─── Toolbox Scan Worker ────────────────────────────────────

const toolboxWorker = new Worker<ToolboxScanJobData>(
  QUEUE_NAMES.TOOLBOX_SCAN,
  async (job: Job<ToolboxScanJobData>) => {
    const { projectId, githubRepo, githubToken } = job.data;
    console.log(`[ToolboxScan] Scanning project ${projectId}`);

    const github = createGitHubService(githubRepo, githubToken);

    // Define what to scan
    const scanTargets = [
      { file: "package.json", parser: parsePackageJson },
      { file: ".env.example", parser: parseEnvExample },
      { file: "Dockerfile", parser: parseDockerfile },
      { file: "docker-compose.yml", parser: parseDockerCompose },
      { file: "prisma/schema.prisma", parser: parsePrismaSchema },
    ];

    const detectedItems: Array<{
      name: string;
      category: string;
      status: "ACQUIRED" | "MISSING";
      version?: string;
      sourceFile: string;
      description: string;
    }> = [];

    for (const target of scanTargets) {
      try {
        const content = await github.getFileContent(target.file);
        const items = target.parser(content, target.file);
        detectedItems.push(...items);
      } catch {
        // File doesn't exist — that might indicate missing tools
        console.log(
          `[ToolboxScan] File ${target.file} not found in repo. Skipping.`
        );
      }
    }

    // Upsert items into database
    for (const item of detectedItems) {
      await prisma.toolboxItem.upsert({
        where: {
          id: `${projectId}-${item.name}`.slice(0, 25), // Deterministic ID for upsert
        },
        create: {
          id: `${projectId}-${item.name}`.slice(0, 25) + `-${Date.now()}`,
          projectId,
          name: item.name,
          category: item.category as any,
          status: item.status,
          version: item.version,
          sourceFile: item.sourceFile,
          description: item.description,
          detectedAt: new Date(),
          installedAt: item.status === "ACQUIRED" ? new Date() : undefined,
        },
        update: {
          status: item.status,
          version: item.version,
          detectedAt: new Date(),
          installedAt: item.status === "ACQUIRED" ? new Date() : undefined,
        },
      });
    }

    console.log(
      `[ToolboxScan] Scan complete. Found ${detectedItems.length} items.`
    );
    return { itemCount: detectedItems.length };
  },
  {
    connection: getQueueConnection(),
    concurrency: 2,
  }
);

// ─── File Parsers ───────────────────────────────────────────

interface DetectedItem {
  name: string;
  category: string;
  status: "ACQUIRED" | "MISSING";
  version?: string;
  sourceFile: string;
  description: string;
}

function parsePackageJson(content: string, sourceFile: string): DetectedItem[] {
  const items: DetectedItem[] = [];

  try {
    const pkg = JSON.parse(content);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Map known packages to categories
    const packageCategories: Record<string, { category: string; desc: string }> =
      {
        next: { category: "FRAMEWORK", desc: "Next.js React framework" },
        react: { category: "FRAMEWORK", desc: "React UI library" },
        express: { category: "FRAMEWORK", desc: "Express.js server" },
        prisma: { category: "DATABASE", desc: "Prisma ORM" },
        "@prisma/client": { category: "DATABASE", desc: "Prisma Client" },
        mongoose: { category: "DATABASE", desc: "MongoDB ODM" },
        "next-auth": { category: "AUTH", desc: "NextAuth.js authentication" },
        "@auth/core": { category: "AUTH", desc: "Auth.js core" },
        bcrypt: { category: "AUTH", desc: "Password hashing" },
        jsonwebtoken: { category: "AUTH", desc: "JWT token handling" },
        stripe: { category: "PAYMENT", desc: "Stripe payment SDK" },
        "@stripe/stripe-js": { category: "PAYMENT", desc: "Stripe.js client" },
        tailwindcss: { category: "UI_KIT", desc: "Tailwind CSS" },
        "@radix-ui/react-dialog": { category: "UI_KIT", desc: "Radix UI primitives" },
        "shadcn-ui": { category: "UI_KIT", desc: "shadcn/ui components" },
        axios: { category: "API", desc: "HTTP client" },
        swr: { category: "API", desc: "SWR data fetching" },
        "@tanstack/react-query": { category: "API", desc: "TanStack Query" },
        sentry: { category: "MONITORING", desc: "Error tracking" },
        "@sentry/nextjs": { category: "MONITORING", desc: "Sentry for Next.js" },
        jest: { category: "TESTING", desc: "Jest testing framework" },
        vitest: { category: "TESTING", desc: "Vitest testing framework" },
        playwright: { category: "TESTING", desc: "Playwright E2E testing" },
        cypress: { category: "TESTING", desc: "Cypress E2E testing" },
        eslint: { category: "TESTING", desc: "ESLint code linting" },
        helmet: { category: "SECURITY", desc: "Security headers" },
        "rate-limiter-flexible": { category: "SECURITY", desc: "Rate limiting" },
      };

    for (const [pkg, version] of Object.entries(allDeps)) {
      const known = packageCategories[pkg];
      if (known) {
        items.push({
          name: pkg,
          category: known.category,
          status: "ACQUIRED",
          version: String(version).replace(/[\^~]/, ""),
          sourceFile,
          description: known.desc,
        });
      }
    }
  } catch {
    console.error("[ToolboxScan] Failed to parse package.json");
  }

  return items;
}

function parseEnvExample(content: string, sourceFile: string): DetectedItem[] {
  const items: DetectedItem[] = [];
  const lines = content.split("\n");

  const envCategories: Record<string, { category: string; desc: string }> = {
    DATABASE_URL: { category: "DATABASE", desc: "Database connection" },
    REDIS_URL: { category: "DATABASE", desc: "Redis connection" },
    NEXTAUTH_SECRET: { category: "AUTH", desc: "NextAuth secret" },
    GITHUB_TOKEN: { category: "CI_CD", desc: "GitHub API token" },
    STRIPE_SECRET_KEY: { category: "PAYMENT", desc: "Stripe secret key" },
    STRIPE_PUBLISHABLE_KEY: { category: "PAYMENT", desc: "Stripe publishable key" },
    SENTRY_DSN: { category: "MONITORING", desc: "Sentry DSN" },
    COOLIFY_API_URL: { category: "HOSTING", desc: "Coolify server URL" },
    COOLIFY_API_TOKEN: { category: "HOSTING", desc: "Coolify API token" },
  };

  for (const line of lines) {
    const match = line.match(/^([A-Z_]+)=/);
    if (match) {
      const key = match[1];
      const known = envCategories[key];
      if (known) {
        items.push({
          name: `ENV: ${key}`,
          category: known.category,
          status: "ACQUIRED",
          sourceFile,
          description: known.desc,
        });
      }
    }
  }

  return items;
}

function parseDockerfile(content: string, sourceFile: string): DetectedItem[] {
  return [
    {
      name: "Docker",
      category: "CI_CD",
      status: "ACQUIRED",
      sourceFile,
      description: "Dockerfile found — containerization configured",
    },
  ];
}

function parseDockerCompose(
  content: string,
  sourceFile: string
): DetectedItem[] {
  const items: DetectedItem[] = [
    {
      name: "Docker Compose",
      category: "CI_CD",
      status: "ACQUIRED",
      sourceFile,
      description: "Docker Compose orchestration configured",
    },
  ];

  // Detect services
  if (content.includes("postgres")) {
    items.push({
      name: "PostgreSQL (Docker)",
      category: "DATABASE",
      status: "ACQUIRED",
      sourceFile,
      description: "PostgreSQL database via Docker Compose",
    });
  }
  if (content.includes("redis")) {
    items.push({
      name: "Redis (Docker)",
      category: "DATABASE",
      status: "ACQUIRED",
      sourceFile,
      description: "Redis cache via Docker Compose",
    });
  }

  return items;
}

function parsePrismaSchema(
  content: string,
  sourceFile: string
): DetectedItem[] {
  const items: DetectedItem[] = [
    {
      name: "Prisma Schema",
      category: "DATABASE",
      status: "ACQUIRED",
      sourceFile,
      description: "Prisma ORM schema defined",
    },
  ];

  // Detect provider
  const providerMatch = content.match(/provider\s*=\s*"(\w+)"/);
  if (providerMatch) {
    items.push({
      name: `DB Provider: ${providerMatch[1]}`,
      category: "DATABASE",
      status: "ACQUIRED",
      sourceFile,
      description: `Database provider: ${providerMatch[1]}`,
    });
  }

  return items;
}

toolboxWorker.on("completed", (job) => {
  console.log(`[ToolboxScan] Job ${job.id} completed`);
});

toolboxWorker.on("failed", (job, error) => {
  console.error(`[ToolboxScan] Job ${job?.id} failed:`, error.message);
});

// ─── Graceful Shutdown ──────────────────────────────────────

async function shutdown() {
  console.log("[Workers] Shutting down deploy workers...");
  await Promise.all([deployWorker.close(), toolboxWorker.close()]);
  console.log("[Workers] Deploy workers shut down.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[Workers] Deploy & Toolbox workers started.");
console.log(`  - Deployment: listening on "${QUEUE_NAMES.DEPLOYMENT}"`);
console.log(`  - Toolbox Scan: listening on "${QUEUE_NAMES.TOOLBOX_SCAN}"`);
