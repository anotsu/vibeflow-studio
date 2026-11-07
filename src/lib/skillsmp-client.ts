// ============================================================
// VibeFlow Studio — SkillsMP (skillsmp.com) Integration Client
// Connects to the open AI agent skills marketplace (skillsmp.com)
// Provides live search, curated offline store, automatic project framing
// recommendations, and seamless Obsidian vault synchronization.
// ============================================================

import fs from "fs";
import path from "path";
import { pushToLiveObsidianApi, getVibeFlowVaultDir } from "@/lib/obsidian-sync";

export interface SkillsMpSkill {
  id: string; // e.g. "skillsmp/stripe-webhook-guardian"
  name: string;
  author: string;
  category: "DevOps" | "Database" | "Security" | "Frontend" | "Architecture" | "Testing" | "Payment" | "AI";
  description: string;
  stars: number;
  githubUrl?: string;
  sourceUrl: string;
  tags: string[];
  systemPromptInjection: string;
  matchKeywords: string[];
  version?: string;
  installed?: boolean;
}

export interface SkillRecommendation {
  skill: SkillsMpSkill;
  score: number; // 0 - 100
  reason: string;
  selectedByDefault: boolean;
}

// ── Curated High-Grade SkillsMP Directory ────────────────────
export const CURATED_SKILLSMP_CATALOG: SkillsMpSkill[] = [
  // 1. Payment
  {
    id: "skillsmp/stripe-webhook-guardian",
    name: "Stripe Webhook Guardian & Idempotency",
    author: "anthropics-community",
    category: "Payment",
    description: "Protection et traitement transactionnel robuste des webhooks Stripe, validation de signature, gestion de l'idempotence et récupération automatique en cas d'échec.",
    stars: 1420,
    githubUrl: "https://github.com/skillsmp/stripe-webhook-guardian",
    sourceUrl: "https://skillsmp.com/skills/stripe-webhook-guardian",
    tags: ["stripe", "payment", "webhooks", "idempotency", "fintech"],
    matchKeywords: ["stripe", "payment", "monetization", "checkout", "abonnement", "subscription", "billing", "paiement"],
    systemPromptInjection: `[SKILLMP - STRIPE GUARDIAN] Toutes les routes de webhooks Stripe doivent impérativement vérifier la signature brute (raw body) avec le STRIPE_WEBHOOK_SECRET. Toute mutation d'abonnement ou de facture doit être enveloppée dans une transaction idempotente (enregistrement de l'event.id pour interdire le double traitement).`,
  },
  {
    id: "skillsmp/lemon-squeezy-billing",
    name: "Lemon Squeezy Merchant-of-Record",
    author: "lmsqueezy-devs",
    category: "Payment",
    description: "Intégration Merchant-of-Record (MoR) Lemon Squeezy : gestion automatique de la TVA globale, portail client, clés de licences et webhooks de résiliation.",
    stars: 840,
    githubUrl: "https://github.com/skillsmp/lemon-squeezy-billing",
    sourceUrl: "https://skillsmp.com/skills/lemon-squeezy-billing",
    tags: ["lemon-squeezy", "billing", "mor", "vat", "saas"],
    matchKeywords: ["lemon", "squeezy", "mor", "licence", "tax"],
    systemPromptInjection: `[SKILLMP - LEMON SQUEEZY] Les webhooks Lemon Squeezy doivent valider le header x-signature avec la clé secrète du webhook. Synchronisez le statut de licence (active, expired, paused) avec la table Subscription locale.`,
  },

  // 2. Database & ORM
  {
    id: "skillsmp/prisma-performance-tuner",
    name: "Prisma High-Performance Indexer",
    author: "prisma-fellows",
    category: "Database",
    description: "Audit d'optimisation Prisma ORM : indexation composite ciblée, élimination des requêtes N+1 via select partiel, et isolation des transactions lourdes.",
    stars: 2150,
    githubUrl: "https://github.com/skillsmp/prisma-performance-tuner",
    sourceUrl: "https://skillsmp.com/skills/prisma-performance-tuner",
    tags: ["prisma", "postgresql", "indexing", "performance", "sql"],
    matchKeywords: ["prisma", "postgres", "postgresql", "database", "sql", "orm", "relationnel", "donnees"],
    systemPromptInjection: `[SKILLMP - PRISMA TUNER] Tout modèle comportant des filtres fréquents ou des jointures (foreign keys) doit comporter un @@index ou @@unique explicite. Interdiction de rapatrier l'ensemble des champs (toujours privilégier select: { id: true, ... } pour éviter l'explosion mémoire).`,
  },
  {
    id: "skillsmp/supabase-rls-architect",
    name: "Supabase Row-Level Security Shield",
    author: "supabase-community",
    category: "Database",
    description: "Conception de politiques de sécurité au niveau des lignes (RLS) impénétrables pour PostgreSQL/Supabase avec support multi-tenants étanche.",
    stars: 1890,
    githubUrl: "https://github.com/skillsmp/supabase-rls-architect",
    sourceUrl: "https://skillsmp.com/skills/supabase-rls-architect",
    tags: ["supabase", "rls", "postgres", "security", "multi-tenant"],
    matchKeywords: ["supabase", "rls", "row-level-security", "postgrest"],
    systemPromptInjection: `[SKILLMP - SUPABASE RLS] Aucune table publique ne doit être créée sans l'instruction 'ALTER TABLE ... ENABLE ROW LEVEL SECURITY;'. Définissez systématiquement une politique pour SELECT, INSERT, UPDATE, DELETE liée à auth.uid().`,
  },

  // 3. Security
  {
    id: "skillsmp/owasp-nextjs-shield",
    name: "OWASP Top 10 Next.js 15 Shield",
    author: "owasp-ai-working-group",
    category: "Security",
    description: "Protection complète contre les vulnérabilités web : validation Zod sur Server Actions, en-têtes HTTP de sécurité (CSP, HSTS, X-Frame), et assainissement des entrées.",
    stars: 3100,
    githubUrl: "https://github.com/skillsmp/owasp-nextjs-shield",
    sourceUrl: "https://skillsmp.com/skills/owasp-nextjs-shield",
    tags: ["security", "owasp", "nextjs", "zod", "csrf", "xss"],
    matchKeywords: ["security", "securite", "owasp", "auth", "authentification", "jwt", "nextjs", "api"],
    systemPromptInjection: `[SKILLMP - OWASP SHIELD] Chaque Server Action et route API mutative doit valider son payload via un schéma Zod explicite. Interdisez toute interpolation directe dans des requêtes et configurez les security headers (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin).`,
  },
  {
    id: "skillsmp/nextauth-v5-sentinel",
    name: "NextAuth v5 & Auth.js Session Sentinel",
    author: "authjs-community",
    category: "Security",
    description: "Gestion des sessions JWT sécurisées, rotation des refresh tokens, callbacks de validation de rôle (RBAC) et protection middleware sans fuite d'état.",
    stars: 1650,
    githubUrl: "https://github.com/skillsmp/nextauth-v5-sentinel",
    sourceUrl: "https://skillsmp.com/skills/nextauth-v5-sentinel",
    tags: ["nextauth", "authjs", "jwt", "rbac", "sessions"],
    matchKeywords: ["nextauth", "auth.js", "auth", "session", "jwt", "oauth", "roles"],
    systemPromptInjection: `[SKILLMP - NEXTAUTH SENTINEL] Les routes protégées doivent être vérifiées en middleware avec un fallback de redirection vers /login. Le token JWT doit uniquement transporter les identifiants minimaux (sub, role, orgId) sans données confidentielles.`,
  },

  // 4. Frontend & UI Polish
  {
    id: "skillsmp/tailwind-60fps-polish",
    name: "Tailwind 60fps Micro-Interactions & GPU",
    author: "antigravity-elite",
    category: "Frontend",
    description: "Optimisation des animations à 60 images par seconde : accélération matérielle transform3d, glassmorphism optimisé, layout-shift zéro et fluidité sensorielle.",
    stars: 2750,
    githubUrl: "https://github.com/skillsmp/tailwind-60fps-polish",
    sourceUrl: "https://skillsmp.com/skills/tailwind-60fps-polish",
    tags: ["tailwind", "ui", "60fps", "animation", "ux", "glassmorphism"],
    matchKeywords: ["tailwind", "ui", "styling", "design", "ux", "animation", "micro-interactions", "interface"],
    systemPromptInjection: `[SKILLMP - 60FPS POLISH] Les transitions visuelles doivent se limiter aux propriétés accélérées par le GPU (transform, opacity). Évitez absolument d'animer height, width ou top/left pour bannir tout layout thrashing.`,
  },
  {
    id: "skillsmp/shadcn-radix-accessible",
    name: "Shadcn UI & Radix Primitives Accessible",
    author: "radix-enthusiasts",
    category: "Frontend",
    description: "Implémentation exemplaire des composants Shadcn UI et primitives Radix : accessibilité clavier intégrale, ARIA live regions et conformité WCAG 2.1 AA.",
    stars: 2420,
    githubUrl: "https://github.com/skillsmp/shadcn-radix-accessible",
    sourceUrl: "https://skillsmp.com/skills/shadcn-radix-accessible",
    tags: ["shadcn", "radix", "accessibility", "wcag", "rgaa", "components"],
    matchKeywords: ["shadcn", "radix", "accessibilite", "wcag", "rgaa", "accessible", "dialog", "dropdown"],
    systemPromptInjection: `[SKILLMP - RADIX ACCESSIBLE] Tous les dialogues, modales et menus déroulants doivent capturer le focus clavier (FocusTrap) et le restituer à l'élément déclencheur à la fermeture avec support de la touche Echap (Escape).`,
  },

  // 5. Architecture
  {
    id: "skillsmp/nextjs15-app-router-master",
    name: "Next.js 15 App Router & React 19 Patterns",
    author: "vercel-insiders",
    category: "Architecture",
    description: "Architecture Server Components (RSC) vs Client Components, streaming granulaire via React Suspense, Parallel Routes et Server Actions optimisées.",
    stars: 3600,
    githubUrl: "https://github.com/skillsmp/nextjs15-app-router-master",
    sourceUrl: "https://skillsmp.com/skills/nextjs15-app-router-master",
    tags: ["nextjs15", "react19", "rsc", "suspense", "server-actions"],
    matchKeywords: ["next", "next.js", "nextjs", "react", "react19", "app-router", "rsc", "frontend"],
    systemPromptInjection: `[SKILLMP - NEXTJS 15 RSC] Gardez les composants au maximum en Server Components par défaut. Déplacez la directive 'use client' uniquement au niveau des feuilles interactives de l'arbre pour minimiser la taille du bundle JavaScript.`,
  },
  {
    id: "skillsmp/clean-architecture-ddd",
    name: "Clean Architecture & Domain DTOs",
    author: "ddd-practitioners",
    category: "Architecture",
    description: "Isolation hermétique entre couche domaine, cas d'usage et infrastructure : typage strict TypeScript, zéro fuite de détails ORM dans l'UI.",
    stars: 1980,
    githubUrl: "https://github.com/skillsmp/clean-architecture-ddd",
    sourceUrl: "https://skillsmp.com/skills/clean-architecture-ddd",
    tags: ["clean-architecture", "ddd", "typescript", "patterns", "dto"],
    matchKeywords: ["architecture", "clean", "ddd", "typage", "typescript", "entities", "domain"],
    systemPromptInjection: `[SKILLMP - CLEAN ARCHITECTURE] Interdiction formelle du type 'any'. Les mutations d'état et règles métiers doivent être encapsulées dans un service ou une fonction métier pure, testable indépendamment du framework UI.`,
  },

  // 6. DevOps & CI/CD
  {
    id: "skillsmp/coolify-docker-optimizer",
    name: "Coolify Multi-Stage Dockerfile Optimizer",
    author: "coolify-hackers",
    category: "DevOps",
    description: "Génération de Dockerfile multi-stage ultra-légers pour conteneurs Coolify / VPS : images distroless/alpine, cache optimisé de dépendances et utilisateur non-root.",
    stars: 1210,
    githubUrl: "https://github.com/skillsmp/coolify-docker-optimizer",
    sourceUrl: "https://skillsmp.com/skills/coolify-docker-optimizer",
    tags: ["coolify", "docker", "vps", "devops", "alpine", "caching"],
    matchKeywords: ["coolify", "docker", "vps", "hosting", "hebergement", "deploy", "deploiement"],
    systemPromptInjection: `[SKILLMP - COOLIFY DOCKER] Les Dockerfile pour Coolify doivent utiliser un build multi-stage (deps, builder, runner) avec utilisateur non-root (nextjs:nodejs UID 1001), et copier uniquement standalone et public pour réduire la taille à moins de 150MB.`,
  },

  // 7. Testing
  {
    id: "skillsmp/playwright-e2e-tester",
    name: "Playwright Headless & Web Vitals Hunter",
    author: "microsoft-playwright-community",
    category: "Testing",
    description: "Suite de tests E2E automatisés : navigation sans tête, vérification des erreurs console runtime, assertion sur LCP < 1.2s et captures d'écran responsives.",
    stars: 2890,
    githubUrl: "https://github.com/skillsmp/playwright-e2e-tester",
    sourceUrl: "https://skillsmp.com/skills/playwright-e2e-tester",
    tags: ["playwright", "e2e", "testing", "web-vitals", "ci-cd"],
    matchKeywords: ["test", "testing", "playwright", "e2e", "qualite", "vitals", "performance"],
    systemPromptInjection: `[SKILLMP - PLAYWRIGHT HUNTER] Chaque flux critique utilisateur (login, création, paiement) doit être couvert par un test de fumée headless avec surveillance des erreurs uncaught et vérification des délais de premier affichage.`,
  },

  // 8. Backend & Polyglot
  {
    id: "skillsmp/fastapi-async-architect",
    name: "FastAPI Async & Pydantic v2 Architect",
    author: "tiangolo-community",
    category: "Architecture",
    description: "Architecture FastAPI haute performance : endpoints asynchrones avec asyncpg/SQLAlchemy 2, validation stricte Pydantic v2 et documentation OpenAPI interactive.",
    stars: 2340,
    githubUrl: "https://github.com/skillsmp/fastapi-async-architect",
    sourceUrl: "https://skillsmp.com/skills/fastapi-async-architect",
    tags: ["fastapi", "python", "pydantic", "async", "openapi"],
    matchKeywords: ["fastapi", "python", "uvicorn", "pydantic", "backend"],
    systemPromptInjection: `[SKILLMP - FASTAPI ARCHITECT] Tout endpoint I/O-bound dans FastAPI doit être déclaré 'async def'. Les modèles d'entrée et de sortie doivent être rigoureusement typés avec des BaseModel Pydantic v2 pour assurer une auto-documentation OpenAPI impeccable.`,
  },
  {
    id: "skillsmp/rust-axum-systems",
    name: "Rust Axum & Tokio High-Throughput Service",
    author: "tokio-rs-community",
    category: "Architecture",
    description: "Conception de microservices Rust ultra-performants avec Axum, Tokio runtime, Tower middleware et gestion d'erreurs avec `anyhow` / `thiserror`.",
    stars: 1780,
    githubUrl: "https://github.com/skillsmp/rust-axum-systems",
    sourceUrl: "https://skillsmp.com/skills/rust-axum-systems",
    tags: ["rust", "axum", "tokio", "systems", "high-performance"],
    matchKeywords: ["rust", "cargo", "axum", "actix", "tokio"],
    systemPromptInjection: `[SKILLMP - RUST AXUM] Exploitez le modèle d'extracteurs d'Axum pour la désérialisation sécurisée. Tout état partagé doit utiliser Arc<AppState> et le middleware Tower pour le tracing et le rate limiting.`,
  },
];

// In-memory active skills installed by project
const globalInstalledSkills = global as unknown as {
  __vibeflowInstalledSkills?: Map<string, SkillsMpSkill>;
};

if (!globalInstalledSkills.__vibeflowInstalledSkills) {
  globalInstalledSkills.__vibeflowInstalledSkills = new Map<string, SkillsMpSkill>();
  // Pre-seed with default essential skills
  for (const s of CURATED_SKILLSMP_CATALOG.slice(0, 3)) {
    globalInstalledSkills.__vibeflowInstalledSkills.set(s.id, { ...s, installed: true });
  }
}

/**
 * Searches skills from SkillsMP.
 * Attempts live fetch from skillsmp.com/api/v1/skills/search,
 * smoothly falling back to the rich curated directory if unavailable.
 */
export async function searchSkillsMp(options: {
  query?: string;
  category?: string;
  limit?: number;
}): Promise<{ skills: SkillsMpSkill[]; total: number; source: "live_api" | "curated_store" }> {
  const query = (options.query || "").toLowerCase().trim();
  const category = options.category;
  const limit = options.limit || 20;

  const apiKey = process.env.SKILLSMP_API_KEY;

  // 1. Attempt live API if key or network available
  if (apiKey && query.length >= 2) {
    try {
      const url = new URL("https://skillsmp.com/api/v1/skills/search");
      url.searchParams.set("q", query);
      if (category) url.searchParams.set("category", category);
      url.searchParams.set("limit", String(limit));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.skills) && data.skills.length > 0) {
          const liveSkills: SkillsMpSkill[] = data.skills.map((item: any) => ({
            id: item.id || `skillsmp/${item.name?.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            name: item.name || "Custom Skill",
            author: item.author || item.creator || "skillsmp-community",
            category: (item.category as any) || "Architecture",
            description: item.description || item.summary || "Agent skill indexed from SkillsMP.",
            stars: item.stars || 100,
            githubUrl: item.githubUrl || item.repoUrl,
            sourceUrl: item.url || `https://skillsmp.com/skills/${item.id}`,
            tags: item.tags || [],
            matchKeywords: item.keywords || [query],
            systemPromptInjection: item.prompt || `[SKILLMP - ${item.name.toUpperCase()}] ${item.description}`,
            installed: globalInstalledSkills.__vibeflowInstalledSkills?.has(item.id),
          }));

          return {
            skills: liveSkills.slice(0, limit),
            total: data.total || liveSkills.length,
            source: "live_api",
          };
        }
      }
    } catch {
      // Fallback seamlessly to curated local catalog
    }
  }

  // 2. Curated local catalog search
  let filtered = CURATED_SKILLSMP_CATALOG.map((s) => ({
    ...s,
    installed: globalInstalledSkills.__vibeflowInstalledSkills?.has(s.id),
  }));

  if (category && category !== "ALL") {
    filtered = filtered.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }

  if (query) {
    filtered = filtered.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(query);
      const descMatch = s.description.toLowerCase().includes(query);
      const tagMatch = s.tags.some((t) => t.toLowerCase().includes(query));
      const keywordMatch = s.matchKeywords.some((k) => k.toLowerCase().includes(query));
      return nameMatch || descMatch || tagMatch || keywordMatch;
    });
  }

  return {
    skills: filtered.slice(0, limit),
    total: filtered.length,
    source: "curated_store",
  };
}

/**
 * Intelligent Project Framing Skills Recommendation Engine.
 * Analyzes the project vision, technical matrix, and entities,
 * and recommends 3 to 6 targeted SkillsMP packages with justified reasoning.
 */
export function recommendSkillsForProject(context: {
  name?: string;
  pitch?: string;
  problemAndTarget?: string;
  coreFeature?: string;
  frontend?: string;
  database?: string;
  auth?: string;
  payment?: string;
  styling?: string;
  hosting?: string;
  entities?: string;
}): SkillRecommendation[] {
  const fullText = [
    context.name || "",
    context.pitch || "",
    context.problemAndTarget || "",
    context.coreFeature || "",
    context.frontend || "",
    context.database || "",
    context.auth || "",
    context.payment || "",
    context.styling || "",
    context.hosting || "",
    context.entities || "",
  ]
    .join(" ")
    .toLowerCase();

  const recommendations: SkillRecommendation[] = [];

  for (const skill of CURATED_SKILLSMP_CATALOG) {
    let score = 0;
    let reasons: string[] = [];

    // Check specific stack matches
    if (context.payment && skill.category === "Payment") {
      if (context.payment.toLowerCase().includes("stripe") && skill.id.includes("stripe")) {
        score += 55;
        reasons.push("Votre stack intègre Stripe Checkout & Webhooks");
      } else if (context.payment.toLowerCase().includes("lemon") && skill.id.includes("lemon")) {
        score += 55;
        reasons.push("Votre stack utilise Lemon Squeezy (Merchant-of-Record)");
      }
    }

    if (context.database && skill.category === "Database") {
      if (context.database.toLowerCase().includes("prisma") && skill.id.includes("prisma")) {
        score += 50;
        reasons.push("Modélisation Prisma ORM : optimise les index et élimine les requêtes N+1");
      } else if (context.database.toLowerCase().includes("supabase") && skill.id.includes("supabase")) {
        score += 50;
        reasons.push("Architecture Supabase : garantit des politiques RLS étanches");
      }
    }

    if (context.frontend && skill.id.includes("nextjs15") && context.frontend.toLowerCase().includes("next")) {
      score += 45;
      reasons.push("Architecture Next.js 15 : maximise l'usage des Server Components");
    }

    if (context.styling && skill.id.includes("tailwind") && context.styling.toLowerCase().includes("tailwind")) {
      score += 45;
      reasons.push("Design System Tailwind : garantit des micro-interactions 60fps");
    }

    if (context.hosting && skill.id.includes("coolify") && context.hosting.toLowerCase().includes("coolify")) {
      score += 40;
      reasons.push("Hébergement Coolify : génère un Dockerfile multi-stage allégé");
    }

    if (context.auth && skill.id.includes("nextauth") && context.auth.toLowerCase().includes("auth")) {
      score += 40;
      reasons.push("Authentification requise : sécurise la gestion des sessions JWT et middleware");
    }

    // Keyword matches
    for (const kw of skill.matchKeywords) {
      if (fullText.includes(kw.toLowerCase())) {
        score += 15;
      }
    }

    // Universally essential skills have base scores
    if (skill.id === "skillsmp/owasp-nextjs-shield") {
      score += 35;
      if (reasons.length === 0) reasons.push("Indispensable pour sécuriser les mutations et Server Actions");
    }
    if (skill.id === "skillsmp/clean-architecture-ddd") {
      score += 30;
      if (reasons.length === 0) reasons.push("Garantit un typage strict et une séparation propre des couches");
    }

    if (score >= 40) {
      recommendations.push({
        skill: {
          ...skill,
          installed: globalInstalledSkills.__vibeflowInstalledSkills?.has(skill.id),
        },
        score: Math.min(score, 99),
        reason: reasons[0] || `Forte correspondance avec le périmètre de ${skill.name}`,
        selectedByDefault: score >= 50,
      });
    }
  }

  // Sort by highest score first and pick top 6
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, 6);
}

/**
 * Installs a SkillsMP skill for a given project or globally.
 * Persists the skill into memory and synchronizes its specification to Obsidian (09_SkillsMP_Installed/).
 */
export async function installSkillMpToProject(
  skillId: string,
  projectId?: string
): Promise<{ success: boolean; skill: SkillsMpSkill; obsidianPath: string }> {
  const skill = CURATED_SKILLSMP_CATALOG.find((s) => s.id === skillId);
  if (!skill) {
    throw new Error(`SkillsMP skill not found: ${skillId}`);
  }

  // Mark as installed
  if (!globalInstalledSkills.__vibeflowInstalledSkills) {
    globalInstalledSkills.__vibeflowInstalledSkills = new Map();
  }
  const installedSkill = { ...skill, installed: true };
  globalInstalledSkills.__vibeflowInstalledSkills.set(skill.id, installedSkill);

  // Generate Obsidian Specification note
  const cleanId = skill.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const vaultRelative = `VibeFlow/09_SkillsMP_Installed/SKILL_${cleanId}.md`;

  const markdown = `---
tags: [vibeflow, skillsmp, agent-skill, marketplace]
skill_id: ${skill.id}
name: ${skill.name}
author: ${skill.author}
category: ${skill.category}
stars: ${skill.stars}
source_url: ${skill.sourceUrl}
installed_at: ${new Date().toISOString().split("T")[0]}
project_id: ${projectId || "global"}
---

# ⚡ Compétence Agent SkillsMP : ${skill.name}

> [!NOTE] Module Intégré depuis SkillsMP (skillsmp.com)
> Cette compétence spécialisée enrichit dynamiquement l'intelligence des agents Claude Code Pro et Antigravity CLI.
> Elle est injectée dans les débats d'architecture et les phases de synthèse.

### Métadonnées
- **Auteur** : \`${skill.author}\`
- **Catégorie** : \`${skill.category}\`
- **Popularité** : ⭐ ${skill.stars}
- **Fiche Officielle** : [${skill.sourceUrl}](${skill.sourceUrl})
- **Dépôt GitHub** : [${skill.githubUrl || skill.sourceUrl}](${skill.githubUrl || skill.sourceUrl})

---

## 📋 Description & Rôle
${skill.description}

---

## 💉 Règle d'Injection Système (Prompt Injecté dans les Agents)
\`\`\`markdown
${skill.systemPromptInjection}
\`\`\`

---

## 🏷️ Mots-Clés Déclencheurs
${skill.tags.map((t) => `\`#${t}\``).join(" ")}
`;

  const vaultDir = getVibeFlowVaultDir();
  const targetDir = path.join(vaultDir, "09_SkillsMP_Installed");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(path.join(targetDir, `SKILL_${cleanId}.md`), markdown, "utf-8");
  await pushToLiveObsidianApi(vaultRelative, markdown);

  return {
    success: true,
    skill: installedSkill,
    obsidianPath: vaultRelative,
  };
}

/**
 * Returns all active installed SkillsMP prompts to inject into agent debates.
 */
export function getInstalledSkillsMpPrompts(): string {
  if (!globalInstalledSkills.__vibeflowInstalledSkills) return "";
  const skills = Array.from(globalInstalledSkills.__vibeflowInstalledSkills.values());
  if (skills.length === 0) return "";

  const lines = [`\n=== COMPÉTENCES MARKETPLACE SKILLSMP ACTIVES (skillsmp.com) ===`];
  for (const s of skills) {
    lines.push(`• [${s.name.toUpperCase()}] : ${s.systemPromptInjection}`);
  }
  return lines.join("\n");
}
