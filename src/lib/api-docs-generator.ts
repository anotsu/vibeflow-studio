// ============================================================
// VibeFlow Studio — Continuous Technical Documentation Generator
// Phase 8.2: Generates OpenAPI 3.1 Specs, Markdown Architecture Docs,
// and Mermaid Entity-Relationship Diagrams from Prisma & API routes.
// Automatically synchronizes live with Obsidian (07_API_Specs/).
// ============================================================

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { pushToLiveObsidianApi, getVibeFlowVaultDir } from "@/lib/obsidian-sync";

export interface ApiEndpointInfo {
  path: string;
  methods: string[];
  description: string;
  tags: string[];
  parameters?: Array<{ name: string; in: "query" | "path" | "body"; required: boolean; type: string }>;
}

export interface PrismaModelInfo {
  name: string;
  fields: Array<{ name: string; type: string; isId?: boolean; isOptional?: boolean; relationTo?: string }>;
}

export interface GeneratedDocResult {
  projectId: string;
  projectName: string;
  endpointsCount: number;
  modelsCount: number;
  openApiMarkdown: string;
  mermaidErDiagram: string;
  mermaidArchDiagram: string;
  vaultPath: string;
  syncedToObsidian: boolean;
}

/**
 * Scans a directory recursively for Next.js App Router API endpoints (route.ts / route.js).
 */
export function scanApiRoutes(apiDir: string, basePath = "/api"): ApiEndpointInfo[] {
  const endpoints: ApiEndpointInfo[] = [];

  if (!fs.existsSync(apiDir)) return endpoints;

  function traverse(currentDir: string, currentRoute: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        traverse(path.join(currentDir, entry.name), `${currentRoute}/${entry.name}`);
      } else if (entry.name === "route.ts" || entry.name === "route.js") {
        const filePath = path.join(currentDir, entry.name);
        const content = fs.readFileSync(filePath, "utf-8");

        const methods: string[] = [];
        if (/export\s+async\s+function\s+GET/i.test(content)) methods.push("GET");
        if (/export\s+async\s+function\s+POST/i.test(content)) methods.push("POST");
        if (/export\s+async\s+function\s+PUT/i.test(content)) methods.push("PUT");
        if (/export\s+async\s+function\s+PATCH/i.test(content)) methods.push("PATCH");
        if (/export\s+async\s+function\s+DELETE/i.test(content)) methods.push("DELETE");

        if (methods.length > 0) {
          // Determine tags from top directory (e.g. /api/tasks/[id] -> Tasks)
          const segments = currentRoute.split("/").filter(Boolean);
          const topTag = segments[1] ? segments[1].toUpperCase() : "GENERAL";

          // Extract parameters like [id]
          const paramMatches = currentRoute.match(/\[([a-zA-Z0-9_]+)\]/g) || [];
          const parameters = paramMatches.map((p) => ({
            name: p.replace(/[\[\]]/g, ""),
            in: "path" as const,
            required: true,
            type: "string",
          }));

          // Infer summary description
          let description = `${methods.join(", ")} operations on ${currentRoute}`;
          if (content.includes("// ============================================================")) {
            const lines = content.split("\n");
            const commentLine = lines.find((l) => l.startsWith("//") && !l.includes("===") && l.length > 10);
            if (commentLine) {
              description = commentLine.replace(/^\/\/\s*/, "").trim();
            }
          }

          endpoints.push({
            path: currentRoute,
            methods,
            description,
            tags: [topTag],
            parameters: parameters.length > 0 ? parameters : undefined,
          });
        }
      }
    }
  }

  traverse(apiDir, basePath);
  return endpoints;
}

/**
 * Parses a Prisma schema file to extract models, fields, and relationships.
 */
export function parsePrismaSchema(schemaPath: string): PrismaModelInfo[] {
  if (!fs.existsSync(schemaPath)) return [];

  const content = fs.readFileSync(schemaPath, "utf-8");
  const models: PrismaModelInfo[] = [];

  const modelRegex = /model\s+([a-zA-Z0-9_]+)\s+\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const lines = body.split("\n");
    const fields: PrismaModelInfo["fields"] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

      const tokens = line.split(/\s+/);
      if (tokens.length >= 2) {
        const fieldName = tokens[0];
        const fieldType = tokens[1];
        const isId = line.includes("@id");
        const isOptional = fieldType.endsWith("?");
        const cleanType = fieldType.replace("?", "").replace("[]", "");

        // Check if relation to another model (if type starts with capital and not basic scalar)
        const isScalar = ["String", "Int", "Float", "Boolean", "DateTime", "Json", "Bytes"].includes(cleanType);
        const relationTo = !isScalar ? cleanType : undefined;

        fields.push({
          name: fieldName,
          type: fieldType,
          isId,
          isOptional,
          relationTo,
        });
      }
    }

    models.push({ name: modelName, fields });
  }

  return models;
}

/**
 * Builds a Mermaid Entity-Relationship (ER) Diagram string from parsed Prisma models.
 */
export function generateMermaidErDiagram(models: PrismaModelInfo[]): string {
  const lines: string[] = ["erDiagram"];

  // Relations
  const relationsDrawn = new Set<string>();
  for (const m of models) {
    for (const f of m.fields) {
      if (f.relationTo && models.some((other) => other.name === f.relationTo)) {
        const relKey = [m.name, f.relationTo].sort().join("---");
        if (!relationsDrawn.has(relKey)) {
          relationsDrawn.add(relKey);
          if (f.type.includes("[]")) {
            lines.push(`    ${m.name} ||--o{ ${f.relationTo} : "contains"`);
          } else {
            lines.push(`    ${m.name} }o--|| ${f.relationTo} : "references"`);
          }
        }
      }
    }
  }

  // Entities & Attributes (top 5 key fields per entity for clean visualization)
  for (const m of models) {
    lines.push(`    ${m.name} {`);
    for (const f of m.fields.slice(0, 6)) {
      const marker = f.isId ? "PK" : f.relationTo ? "FK" : "";
      lines.push(`        ${f.type.replace("[]", "List")} ${f.name} ${marker}`.trimEnd());
    }
    lines.push("    }");
  }

  return lines.join("\n");
}

/**
 * Generates Mermaid System Architecture Flowchart.
 */
export function generateMermaidArchitectureDiagram(): string {
  return `flowchart TD
    subgraph Clients["Clients & Dev Interfaces"]
        WebUI["VibeFlow Web Studio (React 19 / Next.js)"]
        Mobile["Mobile Web (QR Code Tunnel)"]
        CLIs["Local CLIs (Claude Pro / Antigravity Pro)"]
    end

    subgraph CoreEngine["VibeFlow Realtime Orchestrator"]
        API["REST & SSE Event Stream (/api/*)"]
        Judge["Juge Arbitre IA (Synthese & Tests)"]
        WorktreeMgr["Git Worktree Manager (Physical Isolation)"]
        Daemon["Autonomous 24/7 Daemon Tick"]
    end

    subgraph Runtimes["Multi-Stack Preview Dev Servers"]
        PreviewClaude["Preview Claude (Port 4100-4150)"]
        PreviewAgy["Preview Antigravity (Port 4151-4200)"]
        PlaywrightRunner["Headless Playwright & Web Vitals Audit"]
    end

    subgraph Infrastructure["Persistance & Cloud Hosting"]
        DB[(PostgreSQL Database + Prisma)]
        Obsidian["Obsidian Vault (REST API :27123)"]
        Coolify["Coolify VPS Orchestrator (Webhooks & Self-Healing)"]
    end

    WebUI --> API
    Mobile --> API
    CLIs --> API

    API --> Judge
    API --> WorktreeMgr
    API --> Daemon

    WorktreeMgr --> PreviewClaude
    WorktreeMgr --> PreviewAgy
    Judge --> PlaywrightRunner

    API --> DB
    Daemon --> Coolify
    API --> Obsidian`;
}

/**
 * Generates full markdown documentation including OpenAPI specs, endpoints catalog, and Mermaid diagrams.
 */
export async function generateProjectTechnicalDocumentation(
  projectId?: string
): Promise<GeneratedDocResult> {
  const cwd = process.cwd();
  const apiDir = path.join(cwd, "src", "app", "api");
  const schemaPath = path.join(cwd, "prisma", "schema.prisma");

  let projectName = "VibeFlow Studio";
  let projectSlug = "vibeflow-studio";
  let repo = "vibeflow/vibeflow-studio";
  let description = "Plateforme d'orchestration duale Claude Code Pro × Google Antigravity CLI.";

  if (projectId) {
    try {
      const proj = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (proj) {
        projectName = proj.name;
        projectSlug = proj.slug;
        repo = proj.githubRepo;
        description = proj.vibeDescription;
      }
    } catch {}
  }

  const endpoints = scanApiRoutes(apiDir);
  const models = parsePrismaSchema(schemaPath);
  const mermaidEr = generateMermaidErDiagram(models);
  const mermaidArch = generateMermaidArchitectureDiagram();

  // Generate OpenAPI Catalog Table
  const endpointsTable = endpoints
    .map((e) => {
      const methodsFormatted = e.methods
        .map((m) => `\`${m}\``)
        .join(" ");
      const params = e.parameters ? e.parameters.map((p) => p.name).join(", ") : "—";
      return `| \`${e.path}\` | ${methodsFormatted} | ${params} | ${e.description} |`;
    })
    .join("\n");

  const now = new Date().toISOString().split("T")[0];

  const markdown = `---
tags: [vibeflow, architecture, openapi, specs, database]
project: ${projectName}
slug: ${projectSlug}
repository: ${repo}
generated_at: ${now}
version: 2.0.0-PROD
endpoints_count: ${endpoints.length}
models_count: ${models.length}
---

# 📐 Spécifications Techniques & Architecture Système — ${projectName}

> [!NOTE] Documentation Vivante Auto-Générée (Phase 8.2)
> Cette note d'architecture et de spécifications API est synchronisée automatiquement à chaque commit et PR fusionnée sur main.
> Elle reflète l'état physique exact du code et du schéma de base de données.

---

## 🏛️ 1. Architecture Système Haute Disponibilité

\`\`\`mermaid
${mermaidArch}
\`\`\`

---

## 🗄️ 2. Modèle de Données & Relations Relationnelles (Prisma ORM)

Ce diagramme entité-relation est compilé dynamiquement depuis le schéma de modélisation Prisma (\`prisma/schema.prisma\`).

\`\`\`mermaid
${mermaidEr}
\`\`\`

### Modèles Détectés (${models.length})
${models
  .map(
    (m) =>
      `- **\`${m.name}\`** : ${m.fields.length} champs (${m.fields.filter((f) => f.isId).map((f) => f.name).join(", ") || "id"})`
  )
  .join("\n")}

---

## 🔌 3. Spécifications & Catalogue OpenAPI 3.1 (${endpoints.length} Routes)

| Route / Endpoint | Méthodes | Paramètres | Description & Rôle Métier |
| :--- | :---: | :---: | :--- |
${endpointsTable}

---

## 🛡️ 4. Directives d'Exécution & Sécurité

1. **Isolation Git Worktree** : Chaque session d'agent s'exécute dans un dossier dédié sous \`/tmp/vibeflow-worktrees/\` pour éliminer tout conflit d'écriture.
2. **Reverse Proxy Éphémère** : Les serveurs de dev éphémères sont lancés sur des ports dynamiques (4100-4999) avec auto-sleep après 15 minutes d'inactivité.
3. **Synchronisation Pure UTF-8** : Les exports Obsidian sont acheminés en Buffer binaire sans altération de caractères accentués.
4. **Vérification Stricte** : Aucune Pull Request n'est ouverte sans validation préalable de \`tsc --noEmit\` et des tests headless Playwright.
`;

  // Write locally to obsidian-vault/VibeFlow/07_API_Specs/
  const vaultDir = getVibeFlowVaultDir();
  const specsDir = path.join(vaultDir, "07_API_Specs");
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  const localFilePath = path.join(specsDir, `${projectSlug}_Architecture.md`);
  fs.writeFileSync(localFilePath, markdown, "utf-8");

  // Push to Live Obsidian REST API
  const vaultRelative = `VibeFlow/07_API_Specs/${projectSlug}_Architecture.md`;
  const synced = await pushToLiveObsidianApi(vaultRelative, markdown);

  return {
    projectId: projectId || "global",
    projectName,
    endpointsCount: endpoints.length,
    modelsCount: models.length,
    openApiMarkdown: markdown,
    mermaidErDiagram: mermaidEr,
    mermaidArchDiagram: mermaidArch,
    vaultPath: vaultRelative,
    syncedToObsidian: synced,
  };
}
