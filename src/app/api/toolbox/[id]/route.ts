// ============================================================
// API Route: /api/toolbox/[id]
// Update or delete an individual toolbox item
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai-provider";
import { pushToLiveObsidianApi, getVibeFlowVaultDir } from "@/lib/obsidian-sync";
import fs from "fs";
import path from "path";
import type { ToolboxStatus } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, version, description, configJson } = body;

    const existing = await prisma.toolboxItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Toolbox item not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status as ToolboxStatus;
    if (version !== undefined) updateData.version = version;
    if (description !== undefined) updateData.description = description;
    if (configJson !== undefined) updateData.configJson = configJson;

    if (status === "ACQUIRED") {
      updateData.installedAt = new Date();
    }

    const updated = await prisma.toolboxItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PATCH /api/toolbox/[id]] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.toolboxItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/toolbox/[id]] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/toolbox/[id]
 * Actions on a single toolbox item (e.g. generate boilerplate code snippet via AI)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action || "generate_snippet";

    const item = await prisma.toolboxItem.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Toolbox item not found" }, { status: 404 });
    }

    if (action === "generate_snippet") {
      // If code was already generated, return cached version
      if (item.snippetCode && item.snippetCode.length > 50) {
        return NextResponse.json({
          success: true,
          snippetCode: item.snippetCode,
          cached: true,
        });
      }

      // Generate snippet using callAI (Claude Pro / Antigravity Pro CLIs)
      const systemPrompt = `Tu es l'ingénieur de référence VibeFlow Studio.
Génère le code TypeScript d'intégration de référence pour "${item.name}" (${item.category}) dans une application Next.js 15 (App Router).
Fournis une architecture propre, moderne et prête pour la production.`;

      const userPrompt = `Composant : "${item.name}"
Description : ${item.description || "Outil requis pour le projet"}
Projet : ${item.project.name} (${item.project.githubRepo})

Fournis :
1. Le chemin de fichier cible (ex: src/lib/${item.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.ts)
2. Le code source TypeScript complet avec gestion d'erreurs et typage
3. Les variables requises dans .env.example
4. Un court exemple d'appel dans une Server Action ou route API.`;

      const aiRes = await callAI({
        systemPrompt,
        userPrompt,
        modelType: "synthesis",
        preferCli: true,
      });

      const snippetCode = aiRes.content;

      // Cache snippet in database
      await prisma.toolboxItem.update({
        where: { id },
        data: { snippetCode },
      });

      return NextResponse.json({
        success: true,
        snippetCode,
        provider: aiRes.provider,
      });
    }

    if (action === "export_module") {
      // Export validated module to global Obsidian toolbox templates (Phase 8.1)
      const cleanName = item.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const vaultRelative = `VibeFlow/08_Toolbox_Templates/MODULE_${cleanName}.md`;

      const code = item.snippetCode || "```typescript\n// Code snippet non généré\n```";

      const templateContent = `---
tags: [vibeflow, toolbox, reusable-module, template]
module: ${item.name}
category: ${item.category}
version: ${item.version || "latest"}
exported_from_project: ${item.project.name}
exported_at: ${new Date().toISOString().split("T")[0]}
---

# 📦 Module Réutilisable VibeFlow : ${item.name}

> [!TIP] Module Consensuel Clé en Main (Phase 8.1)
> Ce composant architectural a été validé et exporté depuis le projet **${item.project.name}**.
> Il peut être injecté dans n'importe quel nouveau projet via VibeFlow Studio.

### Catégorie : \`${item.category}\`
### Description
${item.description || "Composant prêt à l'emploi"}

---

## 🛠️ Code Source & Architecture d'Intégration

${code}

---

## 🚀 Commande d'Injection Rapide
\`\`\`bash
# Dépendances recommandées
npm install ${item.name.toLowerCase().replace(/[^a-z0-9@-]/g, "")}
\`\`\`
`;

      const vaultDir = getVibeFlowVaultDir();
      const targetDir = path.join(vaultDir, "08_Toolbox_Templates");
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(path.join(targetDir, `MODULE_${cleanName}.md`), templateContent, "utf-8");
      const synced = await pushToLiveObsidianApi(vaultRelative, templateContent);

      return NextResponse.json({
        success: true,
        message: `Module "${item.name}" exporté vers la boîte à outils globale (Obsidian).`,
        vaultPath: vaultRelative,
        syncedToObsidian: synced,
      });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/toolbox/[id]] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur génération snippet" },
      { status: 500 }
    );
  }
}
