// ============================================================
// VibeFlow Studio — GitHub Project Scanner & Auto-Generator
// Reads an existing GitHub repo (README, package.json, issues, commits)
// and synthesizes full project architecture, milestones, tasks & toolbox
// ============================================================

import { Octokit } from "octokit";
import { prisma } from "@/lib/prisma";
import { decrypt, parseGitHubRepo } from "@/lib/utils";
import { callAI } from "@/lib/ai-provider";
import type { ToolboxCategory } from "@prisma/client";

export interface ScannedToolboxItem {
  name: string;
  category: ToolboxCategory;
  status: "ACQUIRED" | "MISSING";
  description: string;
  version?: string;
  sourceFile?: string;
}

export interface ScannedMilestone {
  title: string;
  description: string;
  phase: "ARCHITECTURE" | "MVP" | "UI_UX" | "INTEGRATIONS" | "DEPLOYMENT" | "MAINTENANCE";
  order: number;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

export interface ScannedTask {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  phaseOrder?: number;
}

export interface GitHubAnalysisResult {
  name: string;
  vibeDescription: string;
  githubRepo: string;
  defaultBranch: string;
  detectedStack: string[];
  toolboxItems: ScannedToolboxItem[];
  milestones: ScannedMilestone[];
  initialTasks: ScannedTask[];
  openIssuesCount: number;
  stargazersCount: number;
  welcomeMessage: string;
}

/**
 * Scan and analyze an existing GitHub repository to generate a full VibeFlow project.
 */
export async function scanAndAnalyzeGitHubRepo(
  repoInput: string,
  providedToken?: string
): Promise<GitHubAnalysisResult> {
  // 1. Clean repo input (supports "owner/repo", full URLs, etc.)
  const cleanInput = repoInput
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^git@github\.com:/, "")
    .replace(/\.git$/, "")
    .replace(/^\/+|\/+$/g, "");

  const { owner, repo } = parseGitHubRepo(cleanInput);
  const fullRepoName = `${owner}/${repo}`;

  // 2. Resolve token (provided -> global settings -> process.env -> anonymous)
  let resolvedToken: string | undefined = providedToken?.trim();

  if (!resolvedToken) {
    try {
      const globalSettings = await prisma.globalSettings.findUnique({
        where: { id: "singleton" },
        select: { defaultGithubToken: true },
      });
      if (globalSettings?.defaultGithubToken) {
        try {
          resolvedToken = decrypt(globalSettings.defaultGithubToken);
        } catch {
          resolvedToken = globalSettings.defaultGithubToken;
        }
      }
    } catch {}
  }

  if (!resolvedToken && process.env.GITHUB_TOKEN) {
    resolvedToken = process.env.GITHUB_TOKEN;
  }

  const octokit = new Octokit(resolvedToken ? { auth: resolvedToken } : {});

  // 3. Fetch repo metadata
  let repoData: any;
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    repoData = data;
  } catch (err: any) {
    throw new Error(
      `Impossible d'accéder au dépôt GitHub "${fullRepoName}". Vérifiez le nom ou vos droits d'accès (HTTP ${err.status || err.message}).`
    );
  }

  const defaultBranch = repoData.default_branch || "main";

  // 4. Helper to read a file from the repository
  const fetchFile = async (filePath: string): Promise<string | null> => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: defaultBranch,
      });
      if (!Array.isArray(data) && "content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch {}
    return null;
  };

  // 5. Read key files in parallel
  const [
    readmeRaw,
    packageJsonRaw,
    dockerfileRaw,
    dockerComposeRaw,
    prismaSchemaRaw,
    pyprojectRaw,
    requirementsRaw,
  ] = await Promise.all([
    fetchFile("README.md").then((r) => r || fetchFile("readme.md")).then((r) => r || fetchFile("README")),
    fetchFile("package.json"),
    fetchFile("Dockerfile"),
    fetchFile("docker-compose.yml").then((r) => r || fetchFile("docker-compose.yaml")),
    fetchFile("prisma/schema.prisma"),
    fetchFile("pyproject.toml"),
    fetchFile("requirements.txt"),
  ]);

  // 6. Fetch recent issues and commits
  let openIssues: Array<{ title: string; body?: string; number: number }> = [];
  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 8,
    });
    // Filter out PRs which GitHub issues API includes
    openIssues = data
      .filter((i: any) => !i.pull_request)
      .map((i: any) => ({
        title: i.title,
        body: i.body ? i.body.slice(0, 300) : "",
        number: i.number,
      }));
  } catch {}

  let recentCommits: string[] = [];
  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 5,
    });
    recentCommits = data.map((c: any) => c.commit.message.split("\n")[0]);
  } catch {}

  // 7. Heuristic analysis of dependencies
  const detectedStack: string[] = [];
  const toolboxItems: ScannedToolboxItem[] = [];

  let parsedPackage: any = null;
  if (packageJsonRaw) {
    try {
      parsedPackage = JSON.parse(packageJsonRaw);
    } catch {}
  }

  const allDeps: Record<string, string> = {
    ...(parsedPackage?.dependencies || {}),
    ...(parsedPackage?.devDependencies || {}),
  };

  // Check known stacks and libraries
  const checkDep = (
    pkgName: string,
    toolName: string,
    category: ToolboxCategory,
    desc: string
  ) => {
    if (allDeps[pkgName]) {
      detectedStack.push(toolName);
      toolboxItems.push({
        name: toolName,
        category,
        status: "ACQUIRED",
        description: desc,
        version: allDeps[pkgName].replace(/^[\^~]/, ""),
        sourceFile: "package.json",
      });
      return true;
    }
    return false;
  };

  // Frameworks & Core
  if (checkDep("next", "Next.js", "FRAMEWORK", "Framework React Fullstack SSR & Edge")) {
    if (allDeps["typescript"]) detectedStack.push("TypeScript");
  } else if (checkDep("react", "React", "FRAMEWORK", "Bibliothèque UI")) {
    // React alone
  } else if (checkDep("vue", "Vue.js", "FRAMEWORK", "Framework UI progressif")) {}

  if (pyprojectRaw || requirementsRaw) {
    detectedStack.push("Python");
    toolboxItems.push({
      name: "Python Runtime",
      category: "FRAMEWORK",
      status: "ACQUIRED",
      description: "Environnement Python",
      sourceFile: pyprojectRaw ? "pyproject.toml" : "requirements.txt",
    });
  }

  // Styling
  checkDep("tailwindcss", "Tailwind CSS", "UI_KIT", "Framework CSS utility-first");
  checkDep("@radix-ui/react-dialog", "Radix UI", "UI_KIT", "Composants accessibles sans style");

  // Database & ORM
  if (prismaSchemaRaw || checkDep("@prisma/client", "Prisma ORM", "DATABASE", "ORM TypeScript & Générateur de schémas")) {
    if (!toolboxItems.some((t) => t.name === "Prisma ORM")) {
      toolboxItems.push({
        name: "Prisma ORM",
        category: "DATABASE",
        status: "ACQUIRED",
        description: "ORM TypeScript & Modélisation de base de données",
        sourceFile: "prisma/schema.prisma",
      });
      detectedStack.push("Prisma ORM");
    }
  }
  checkDep("drizzle-orm", "Drizzle ORM", "DATABASE", "ORM TypeScript léger & SQL-like");
  checkDep("@supabase/supabase-js", "Supabase", "DATABASE", "Backend-as-a-Service PostgreSQL & Auth");
  checkDep("ioredis", "Redis (ioredis)", "DATABASE", "Cache mémoire & gestionnaire de files");

  // Auth
  const hasAuth =
    checkDep("next-auth", "NextAuth / Auth.js", "AUTH", "Authentification universelle Next.js") ||
    checkDep("@auth0/nextjs-auth0", "Auth0", "AUTH", "Authentification Identity Provider") ||
    checkDep("@clerk/nextjs", "Clerk", "AUTH", "Gestion des utilisateurs & Auth");

  // Payments
  const hasPayment =
    checkDep("stripe", "Stripe", "PAYMENT", "Paiements récurrents et checkout") ||
    checkDep("@lemonsqueezy/lemonsqueezy.js", "Lemon Squeezy", "PAYMENT", "Merchant of Record pour SaaS");

  // Testing
  const hasTesting =
    checkDep("vitest", "Vitest", "TESTING", "Test runner unitaire ultra-rapide") ||
    checkDep("jest", "Jest", "TESTING", "Framework de test JavaScript") ||
    checkDep("@playwright/test", "Playwright", "TESTING", "Tests end-to-end multi-navigateurs");

  // Docker
  if (dockerfileRaw || dockerComposeRaw) {
    detectedStack.push("Docker");
    toolboxItems.push({
      name: "Docker Container",
      category: "HOSTING",
      status: "ACQUIRED",
      description: "Conteneurisation pour déploiement Coolify / Cloud",
      sourceFile: dockerfileRaw ? "Dockerfile" : "docker-compose.yml",
    });
  }

  // Propose Missing / Recommended Tools if absent
  if (!hasAuth) {
    toolboxItems.push({
      name: "Authentification (NextAuth / Auth0)",
      category: "AUTH",
      status: "MISSING",
      description: "Module de connexion utilisateur, sessions sécurisées & OAuth",
    });
  }
  if (!hasPayment) {
    toolboxItems.push({
      name: "Stripe Payment",
      category: "PAYMENT",
      status: "MISSING",
      description: "Gestion des abonnements, facturation et paiements sécurisés",
    });
  }
  if (!hasTesting) {
    toolboxItems.push({
      name: "Vitest & Playwright",
      category: "TESTING",
      status: "MISSING",
      description: "Tests unitaires et tests end-to-end d'intégration continue",
    });
  }
  if (!allDeps["@sentry/nextjs"]) {
    toolboxItems.push({
      name: "Sentry Monitoring",
      category: "MONITORING",
      status: "MISSING",
      description: "Surveillance des erreurs et performance en production",
    });
  }

  // Ensure unique stack labels
  const uniqueStack = Array.from(new Set(detectedStack));
  if (uniqueStack.length === 0 && repoData.language) {
    uniqueStack.push(repoData.language);
  }

  // 8. AI Synthesis of Project Identity, Tailored Milestones, and Actionable Tasks
  const readmeSnippet = (readmeRaw || "").slice(0, 3500);
  const promptContext = `
Vous êtes le Lead Architecte IA de VibeFlow Studio.
Vous analysez un dépôt GitHub existant pour l'importer dans VibeFlow Studio :
- Dépôt : "${fullRepoName}"
- Description originale : "${repoData.description || "Aucune description"}"
- Langage principal : "${repoData.language || "N/A"}"
- Branche : "${defaultBranch}"
- Stack détectée : ${uniqueStack.join(", ") || "Non spécifiée"}
- Issues ouvertes : ${openIssues.length > 0 ? openIssues.map((i) => `#${i.number} ${i.title}`).join(", ") : "Aucune issue"}
- Commits récents : ${recentCommits.join(" | ") || "N/A"}

Extrait du README :
\`\`\`markdown
${readmeSnippet || "README absent ou vide."}
\`\`\`

CONSIGNE :
Générez une réponse STRICTEMENT au format JSON (sans bloc markdown autour, juste le JSON pur ou encapsulé dans \`\`\`json) avec les propriétés suivantes :
{
  "name": "Nom élégant et lisible du projet (ex: VibeFlow Studio, MonApp)",
  "vibeDescription": "Description complète et inspirante (2 à 4 phrases) expliquant l'objectif du projet, la stack technologique et les chantiers en cours.",
  "milestones": [
    {
      "phase": "ARCHITECTURE", // obligatoire: ARCHITECTURE, MVP, UI_UX, INTEGRATIONS, DEPLOYMENT ou MAINTENANCE
      "title": "Titre du jalon",
      "description": "Explication détaillée adaptée à l'état réel du dépôt",
      "order": 1,
      "status": "COMPLETED" // COMPLETED si déjà fait d'après le repo, IN_PROGRESS si en cours, PENDING sinon
    }
  ],
  "initialTasks": [
    {
      "title": "Titre de tâche d'action immédiate",
      "description": "Détails techniques, fichiers concernés et critère d'acceptation",
      "priority": "HIGH", // LOW, MEDIUM, HIGH, ou CRITICAL
      "phaseOrder": 1
    }
  ],
  "welcomeMessage": "Court message d'accueil pour le chat VibeGuide résumant l'audit du repo et la prochaine étape prioritaire."
}
Fournissez 5 jalons ordonnés de 1 à 5 et 4 à 6 tâches initiales concrètes.
`;

  let aiName = repoData.name || repo;
  let aiVibe = repoData.description || `Projet issu du dépôt GitHub ${fullRepoName}.`;
  let aiMilestones: ScannedMilestone[] = [];
  let aiTasks: ScannedTask[] = [];
  let aiWelcome = `Bienvenue ! J'ai analysé votre dépôt GitHub **${fullRepoName}**. La stack (${uniqueStack.join(", ")}) et l'état d'avancement ont été configurés.`;

  try {
    const aiResponse = await callAI({
      systemPrompt: "Tu es un extracteur JSON d'architecture logicielle. Réponds uniquement en JSON valide.",
      userPrompt: promptContext,
      modelType: "synthesis",
    });

    const cleanJson = aiResponse.content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleanJson);
    if (parsed.name) aiName = parsed.name;
    if (parsed.vibeDescription) aiVibe = parsed.vibeDescription;
    if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
      aiMilestones = parsed.milestones.map((m: any, idx: number) => ({
        title: m.title || `Phase ${idx + 1}`,
        description: m.description || "",
        phase: (["ARCHITECTURE", "MVP", "UI_UX", "INTEGRATIONS", "DEPLOYMENT", "MAINTENANCE"].includes(m.phase)
          ? m.phase
          : "MVP") as any,
        order: m.order || idx + 1,
        status: m.status || (idx === 0 ? "IN_PROGRESS" : "PENDING"),
      }));
    }
    if (Array.isArray(parsed.initialTasks) && parsed.initialTasks.length > 0) {
      aiTasks = parsed.initialTasks.map((t: any) => ({
        title: t.title || "Tâche initiale",
        description: t.description || "",
        priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(t.priority)
          ? t.priority
          : "MEDIUM",
        phaseOrder: t.phaseOrder || 1,
      }));
    }
    if (parsed.welcomeMessage) aiWelcome = parsed.welcomeMessage;
  } catch (aiErr) {
    console.warn("[GitHubScanner] AI synthesis fallback to heuristics:", aiErr);
  }

  // Fallback milestones if AI didn't return any
  if (aiMilestones.length === 0) {
    aiMilestones = [
      {
        phase: "ARCHITECTURE",
        title: "Audit & Socle Architectural",
        description: `Stabilisation de la stack (${uniqueStack.join(", ")}) et alignement des configurations.`,
        order: 1,
        status: "IN_PROGRESS",
      },
      {
        phase: "MVP",
        title: "Fonctionnalités Clés & Résolution d'Issues",
        description: `Traitement des priorités du README et des ${openIssues.length} issue(s) GitHub ouvertes.`,
        order: 2,
        status: "PENDING",
      },
      {
        phase: "UI_UX",
        title: "Refonte & Polish UI/UX",
        description: "Optimisation du design, composants réutilisables et expérience utilisateur.",
        order: 3,
        status: "PENDING",
      },
      {
        phase: "INTEGRATIONS",
        title: "Services Externes & Briques Manquantes",
        description: "Intégration des outils identifiés manquants (Auth, Paiement, Monitoring).",
        order: 4,
        status: "PENDING",
      },
      {
        phase: "DEPLOYMENT",
        title: "Déploiement Continu Coolify & Monitoring",
        description: "Configuration du conteneur Docker, CI/CD et surveillance de production.",
        order: 5,
        status: "PENDING",
      },
    ];
  }

  // Fallback initial tasks from open issues & stack needs
  if (aiTasks.length === 0) {
    if (openIssues.length > 0) {
      openIssues.slice(0, 4).forEach((issue) => {
        aiTasks.push({
          title: `[Issue #${issue.number}] ${issue.title}`,
          description: issue.body || "Issue importée directement depuis le dépôt GitHub.",
          priority: "HIGH",
          phaseOrder: 2,
        });
      });
    } else {
      aiTasks.push({
        title: "Audit de la boîte à outils et dépendances",
        description: `Passer en revue les outils détectés (${uniqueStack.join(", ")}) et configurer les modules manquants.`,
        priority: "MEDIUM",
        phaseOrder: 1,
      });
      aiTasks.push({
        title: "Vérification des tests et de la compilation de build",
        description: "Exécuter la vérification des types TypeScript et des tests unitaires sur la branche principale.",
        priority: "HIGH",
        phaseOrder: 1,
      });
    }
  }

  return {
    name: aiName,
    vibeDescription: aiVibe,
    githubRepo: fullRepoName,
    defaultBranch,
    detectedStack: uniqueStack,
    toolboxItems,
    milestones: aiMilestones,
    initialTasks: aiTasks,
    openIssuesCount: repoData.open_issues_count || 0,
    stargazersCount: repoData.stargazers_count || 0,
    welcomeMessage: aiWelcome,
  };
}
