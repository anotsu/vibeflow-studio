// ============================================================
// VibeFlow Studio — API Route: /api/settings/providers
// Manages AI Provider Plans (Claude, Gemini, ChatGPT Codex)
// and VibeCoding Engine Mode (SOLO 1, DUEL 2, TRIO 3)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getAllProviderConfigs,
  saveVibeCodingEngineConfig,
  saveProviderCustomSetting,
  AIProviderId,
} from "@/lib/provider-plans";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAllProviderConfigs();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("[GET /api/settings/providers] Error:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer la configuration des fournisseurs", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body || {};

    // 1. Update active providers & engine mode (SOLO, DUEL, TRIO)
    if (action === "update_engine") {
      const { activeProviders, autoFallbackEnabled } = body;
      const updated = await saveVibeCodingEngineConfig(
        activeProviders || ["claude", "gemini"],
        autoFallbackEnabled ?? true
      );
      return NextResponse.json({
        success: true,
        engine: updated,
        message: `Moteur VibeCoding configuré en mode ${updated.mode} (${updated.activeProviders.length} fournisseur(s) actif(s))`,
      });
    }

    // 2. Save provider plan, API key, and preferred model
    if (action === "save_provider") {
      const { provider, plan, apiKey, model } = body as {
        provider: AIProviderId;
        plan?: string;
        apiKey?: string;
        model?: string;
      };

      if (!provider || !["claude", "gemini", "openai"].includes(provider)) {
        return NextResponse.json({ error: "Fournisseur non valide" }, { status: 400 });
      }

      await saveProviderCustomSetting(provider, { plan, apiKey, model });
      const configs = await getAllProviderConfigs();

      return NextResponse.json({
        success: true,
        provider: configs.providers[provider],
        message: `Paramètres pour ${provider.toUpperCase()} enregistrés avec succès`,
      });
    }

    // 3. Live test connection for a specific provider
    if (action === "test_provider") {
      const { provider, prompt } = body as {
        provider: AIProviderId;
        prompt?: string;
      };

      const startTime = Date.now();
      const testPrompt =
        prompt ||
        `Réponds uniquement avec le nom de ton modèle et une phrase confirmant que tu es opérationnel pour le VibeCoding.`;

      let modelType: "claude" | "antigravity" | "openai" = "claude";
      if (provider === "gemini") modelType = "antigravity";
      if (provider === "openai") modelType = "openai";

      const res = await callAI({
        systemPrompt: "Tu es un assistant de test de connectivité VibeFlow Studio.",
        userPrompt: testPrompt,
        modelType,
        preferCli: true,
      });

      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        provider,
        providerUsed: res.provider,
        modelUsed: res.modelUsed,
        snippet: res.content.slice(0, 300),
        latencyMs,
      });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/settings/providers] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'action fournisseur", details: error?.message },
      { status: 500 }
    );
  }
}
