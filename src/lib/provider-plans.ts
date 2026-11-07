// ============================================================
// VibeFlow Studio — AI Providers & Subscription Plans Manager
// Supports any subscription tier for Claude, Gemini & ChatGPT Codex:
// Free, Pro / Plus / Advanced, Team / Max, or API Pay-as-you-go.
// Enables flexible VibeCoding in SOLO (1), DUEL (2), or TRIO (3) mode.
// ============================================================

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/utils";

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "/tmp";

export type AIProviderId = "claude" | "gemini" | "openai";

export type VibeCodingMode = "SOLO" | "DUEL" | "TRIO";

export interface PlanDefinition {
  id: string;
  label: string;
  badge: string;
  priceNote: string;
  description: string;
  quotaDescription: string;
  authMethod: "cli" | "api_key" | "oauth";
  defaultModel: string;
}

export interface ProviderConfig {
  id: AIProviderId;
  name: string;
  shortName: string;
  brandColor: string;
  tagline: string;
  selectedPlan: string;
  availablePlans: PlanDefinition[];
  connectionStatus: "CONNECTED_CLI" | "CONNECTED_API" | "NOT_CONNECTED";
  accountLabel: string;
  apiKeyMasked?: string;
  defaultModel: string;
  availableModels: string[];
  cliInstalled: boolean;
  cliVersion: string;
}

export interface VibeCodingEngineConfig {
  activeProviders: AIProviderId[];
  mode: VibeCodingMode;
  consensusStrategy: "TRIANGULAR_SYNTHESIS" | "DUAL_COMPROMISE" | "SOLO_DIRECT";
  autoFallbackEnabled: boolean;
  updatedAt: string;
}

// ─── Default Plans Metadata ──────────────────────────────────

export const CLAUDE_PLANS: PlanDefinition[] = [
  {
    id: "CLAUDE_PRO",
    label: "Claude Pro (20$/mois)",
    badge: "Populaire · 0€ token",
    priceNote: "20 $ / mois",
    description: "Accès illimité sous fenêtre glissante 5h via `claude login`.",
    quotaDescription: "Fenêtre glissante 5 heures (jusqu'à 45 messages par 5h)",
    authMethod: "cli",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  {
    id: "CLAUDE_FREE",
    label: "Claude Gratuit (Free Tier)",
    badge: "0€",
    priceNote: "Gratuit",
    description: "Accès standard avec limitations de requêtes par tranche horaire.",
    quotaDescription: "Messages limités par période de 8h",
    authMethod: "cli",
    defaultModel: "claude-3-5-haiku-20241022",
  },
  {
    id: "CLAUDE_MAX_TEAM",
    label: "Claude Team / Max / Enterprise",
    badge: "Haute Capacité",
    priceNote: "30 $+ / utilisateur",
    description: "Plafonds 5x supérieurs pour flux de codage intensifs et équipes.",
    quotaDescription: "Capacité x5 par rapport au forfait Pro",
    authMethod: "cli",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  {
    id: "CLAUDE_API",
    label: "Clé API Anthropic (Pay-as-you-go)",
    badge: "Crédit API",
    priceNote: "À la consommation",
    description: "Paiement direct au million de tokens via `sk-ant-...`.",
    quotaDescription: "Plafonné par votre solde de crédits Anthropic",
    authMethod: "api_key",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
];

export const GEMINI_PLANS: PlanDefinition[] = [
  {
    id: "GEMINI_ADVANCED",
    label: "Gemini Advanced (Google One AI Premium)",
    badge: "Complet · 0€ token",
    priceNote: "21,99 € / mois",
    description: "Modèles 2.0 Flash & 1.5 Pro sans surcoût via `agy login`.",
    quotaDescription: "Accès prioritaire étendu avec contexte 1M tokens",
    authMethod: "cli",
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "GEMINI_FREE_STUDIO",
    label: "Google AI Studio (Gratuit)",
    badge: "1 500 req/jour",
    priceNote: "Gratuit (0€)",
    description: "1 500 requêtes gratuites par jour et 15 RPM sans carte bancaire.",
    quotaDescription: "1 500 requêtes/jour · 15 RPM max",
    authMethod: "cli",
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "GEMINI_ENTERPRISE",
    label: "Gemini Pro / Vertex AI Enterprise",
    badge: "GCP Cloud",
    priceNote: "Souscription Cloud",
    description: "Intégration entreprise Google Cloud Platform avec SLA garantis.",
    quotaDescription: "Quotas GCP selon votre organisation",
    authMethod: "oauth",
    defaultModel: "gemini-1.5-pro",
  },
  {
    id: "GEMINI_API",
    label: "Clé API Google Gemini (AIza...)",
    badge: "Crédit API",
    priceNote: "À la consommation",
    description: "Appels directs via clé d'API AI Studio ou Google Cloud.",
    quotaDescription: "Limité par les quotas de votre projet GCP",
    authMethod: "api_key",
    defaultModel: "gemini-2.0-flash",
  },
];

export const OPENAI_PLANS: PlanDefinition[] = [
  {
    id: "CHATGPT_PLUS",
    label: "ChatGPT Plus (20$/mois)",
    badge: "Populaire · GPT-4o / o3-mini",
    priceNote: "20 $ / mois",
    description: "Accès prioritaire à GPT-4o, Canvas, et o3-mini avec limites étendues.",
    quotaDescription: "80 messages / 3h sur GPT-4o, accès étendu aux modèles de raisonnement",
    authMethod: "cli",
    defaultModel: "gpt-4o",
  },
  {
    id: "CHATGPT_FREE",
    label: "ChatGPT Gratuit (Free Tier)",
    badge: "0€",
    priceNote: "Gratuit",
    description: "Accès à GPT-4o mini et utilisation limitée de GPT-4o.",
    quotaDescription: "Mini illimité, quota réduit sur GPT-4o",
    authMethod: "cli",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "CHATGPT_PRO",
    label: "ChatGPT Pro (200$/mois)",
    badge: "Illimité · o1 / Codex",
    priceNote: "200 $ / mois",
    description: "Accès illimité à o1 pro mode, o3-mini et compute maximal pour le code complexe.",
    quotaDescription: "Accès illimité sans throttling horaire",
    authMethod: "cli",
    defaultModel: "o1",
  },
  {
    id: "OPENAI_API",
    label: "Clé API OpenAI (sk-...)",
    badge: "Crédit API Codex",
    priceNote: "À la consommation",
    description: "Connexion directe par clé API supportant GPT-4o, o3-mini, et Codex.",
    quotaDescription: "Plafonné par votre balance de crédits OpenAI",
    authMethod: "api_key",
    defaultModel: "gpt-4o",
  },
];

// In-memory fallback
let cachedEngineConfig: VibeCodingEngineConfig = {
  activeProviders: ["claude", "gemini"],
  mode: "DUEL",
  consensusStrategy: "DUAL_COMPROMISE",
  autoFallbackEnabled: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Computes the VibeCoding Mode based on number of active providers.
 */
export function computeMode(providers: AIProviderId[]): VibeCodingMode {
  if (providers.length >= 3) return "TRIO";
  if (providers.length === 2) return "DUEL";
  return "SOLO";
}

/**
 * Retrieves the current VibeCoding Engine configuration.
 */
export async function getVibeCodingEngineConfig(): Promise<VibeCodingEngineConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "vibecoding_engine_config" },
    });

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      cachedEngineConfig = {
        ...parsed,
        mode: computeMode(parsed.activeProviders || ["claude", "gemini"]),
      };
      return cachedEngineConfig;
    }
  } catch (err) {
    console.warn("[ProviderPlans] DB read error for engine config, using cache:", err);
  }

  return cachedEngineConfig;
}

/**
 * Saves the VibeCoding Engine configuration.
 */
export async function saveVibeCodingEngineConfig(
  activeProviders: AIProviderId[],
  autoFallbackEnabled: boolean = true
): Promise<VibeCodingEngineConfig> {
  // Ensure at least 1 provider is selected
  const validatedProviders: AIProviderId[] =
    activeProviders.length > 0 ? activeProviders : ["claude"];

  const mode = computeMode(validatedProviders);
  const consensusStrategy =
    mode === "TRIO"
      ? "TRIANGULAR_SYNTHESIS"
      : mode === "DUEL"
      ? "DUAL_COMPROMISE"
      : "SOLO_DIRECT";

  const config: VibeCodingEngineConfig = {
    activeProviders: validatedProviders,
    mode,
    consensusStrategy,
    autoFallbackEnabled,
    updatedAt: new Date().toISOString(),
  };

  cachedEngineConfig = config;

  try {
    await prisma.systemSetting.upsert({
      where: { key: "vibecoding_engine_config" },
      update: { value: JSON.stringify(config) },
      create: { key: "vibecoding_engine_config", value: JSON.stringify(config) },
    });
  } catch (err) {
    console.warn("[ProviderPlans] DB write error for engine config:", err);
  }

  return config;
}

/**
 * Diagnostic & detailed plans for all 3 providers (Claude, Gemini, ChatGPT Codex).
 */
export async function getAllProviderConfigs(): Promise<{
  engine: VibeCodingEngineConfig;
  providers: Record<AIProviderId, ProviderConfig>;
}> {
  const engine = await getVibeCodingEngineConfig();

  // Load custom provider overrides from DB
  let customSettings: Record<string, any> = {};
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ai_providers_custom_settings" },
    });
    if (setting?.value) {
      customSettings = JSON.parse(setting.value);
    }
  } catch {}

  // 1. Claude diagnostic
  let claudeStatus: "CONNECTED_CLI" | "CONNECTED_API" | "NOT_CONNECTED" = "NOT_CONNECTED";
  let claudeAccountLabel = "Non connecté";
  const claudeJsonPath = path.join(HOME_DIR, ".claude.json");
  if (fs.existsSync(claudeJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8"));
      if (parsed.oauthAccount || parsed.sessionKey || parsed.primaryApiKey) {
        claudeStatus = "CONNECTED_CLI";
        claudeAccountLabel = parsed.oauthAccount?.emailAddress
          ? `Claude Pro (${parsed.oauthAccount.emailAddress})`
          : "Session Claude Pro active";
      }
    } catch {}
  }
  const anthropicKey =
    customSettings.claude_api_key ? decrypt(customSettings.claude_api_key) : process.env.ANTHROPIC_API_KEY;
  if (claudeStatus === "NOT_CONNECTED" && anthropicKey?.startsWith("sk-ant")) {
    claudeStatus = "CONNECTED_API";
    claudeAccountLabel = "Clé API Anthropic active";
  }

  const claudeConfig: ProviderConfig = {
    id: "claude",
    name: "Claude Code",
    shortName: "Claude",
    brandColor: "#8b5cf6", // Purple / Violet
    tagline: "Rigueur chirurgicale, typage TypeScript strict & audit de sécurité",
    selectedPlan: customSettings.claude_plan || (claudeStatus === "CONNECTED_CLI" ? "CLAUDE_PRO" : "CLAUDE_API"),
    availablePlans: CLAUDE_PLANS,
    connectionStatus: claudeStatus,
    accountLabel: claudeAccountLabel,
    apiKeyMasked: anthropicKey ? `sk-ant••••${anthropicKey.slice(-4)}` : undefined,
    defaultModel: customSettings.claude_model || "claude-3-5-sonnet-20241022",
    availableModels: ["claude-3-5-sonnet-20241022", "claude-3-7-sonnet", "claude-3-5-haiku-20241022"],
    cliInstalled: fs.existsSync(path.join(HOME_DIR, ".claude.json")),
    cliVersion: "1.0.x (Claude Code CLI)",
  };

  // 2. Gemini diagnostic
  let geminiStatus: "CONNECTED_CLI" | "CONNECTED_API" | "NOT_CONNECTED" = "NOT_CONNECTED";
  let geminiAccountLabel = "Non connecté";
  const agySettingsPath = path.join(HOME_DIR, ".gemini", "antigravity-cli", "settings.json");
  if (fs.existsSync(agySettingsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(agySettingsPath, "utf-8"));
      if (parsed.oauthToken || parsed.apiKey || parsed.userEmail) {
        geminiStatus = "CONNECTED_CLI";
        geminiAccountLabel = parsed.userEmail
          ? `Google (${parsed.userEmail})`
          : "Antigravity CLI lié (Gemini Pro)";
      }
    } catch {}
  }
  const geminiKey =
    customSettings.gemini_api_key ? decrypt(customSettings.gemini_api_key) : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (geminiStatus === "NOT_CONNECTED" && geminiKey) {
    geminiStatus = "CONNECTED_API";
    geminiAccountLabel = "Clé API Google Gemini active";
  }

  const geminiConfig: ProviderConfig = {
    id: "gemini",
    name: "Gemini Pro (Antigravity)",
    shortName: "Gemini",
    brandColor: "#06b6d4", // Cyan / Google Blue
    tagline: "Vitesse fulgurante, créativité UX, animations & grand contexte 1M",
    selectedPlan: customSettings.gemini_plan || (geminiStatus === "CONNECTED_CLI" ? "GEMINI_ADVANCED" : "GEMINI_FREE_STUDIO"),
    availablePlans: GEMINI_PLANS,
    connectionStatus: geminiStatus,
    accountLabel: geminiAccountLabel,
    apiKeyMasked: geminiKey ? `AIza••••${geminiKey.slice(-4)}` : undefined,
    defaultModel: customSettings.gemini_model || "gemini-2.0-flash",
    availableModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-flash-thinking-exp"],
    cliInstalled: fs.existsSync(agySettingsPath),
    cliVersion: "0.9.x (Antigravity CLI)",
  };

  // 3. ChatGPT Codex diagnostic
  let openaiStatus: "CONNECTED_CLI" | "CONNECTED_API" | "NOT_CONNECTED" = "NOT_CONNECTED";
  let openaiAccountLabel = "Non connecté";
  const openaiKey =
    customSettings.openai_api_key ? decrypt(customSettings.openai_api_key) : process.env.OPENAI_API_KEY;

  // Check if OpenAI CLI or token file exists in ~/.codex or ~/.openai
  const codexPath = path.join(HOME_DIR, ".codex", "auth.json");
  const openaiConfigPath = path.join(HOME_DIR, ".openai", "config.json");
  if (fs.existsSync(codexPath) || fs.existsSync(openaiConfigPath)) {
    openaiStatus = "CONNECTED_CLI";
    openaiAccountLabel = "Session ChatGPT / Codex CLI active";
  } else if (openaiKey && openaiKey.startsWith("sk-")) {
    openaiStatus = "CONNECTED_API";
    openaiAccountLabel = "Clé API OpenAI / Codex active";
  }

  const openaiConfig: ProviderConfig = {
    id: "openai",
    name: "ChatGPT Codex",
    shortName: "ChatGPT Codex",
    brandColor: "#10b981", // Emerald green (OpenAI)
    tagline: "Puissance algorithmique, architectures modulaires & raisonnement o1/o3",
    selectedPlan: customSettings.openai_plan || (openaiStatus === "CONNECTED_CLI" ? "CHATGPT_PLUS" : "OPENAI_API"),
    availablePlans: OPENAI_PLANS,
    connectionStatus: openaiStatus,
    accountLabel: openaiAccountLabel,
    apiKeyMasked: openaiKey ? `sk-••••${openaiKey.slice(-4)}` : undefined,
    defaultModel: customSettings.openai_model || "gpt-4o",
    availableModels: ["gpt-4o", "o3-mini", "o1", "gpt-4o-mini"],
    cliInstalled: fs.existsSync(codexPath) || fs.existsSync(openaiConfigPath),
    cliVersion: "1.0.x (OpenAI Codex)",
  };

  return {
    engine,
    providers: {
      claude: claudeConfig,
      gemini: geminiConfig,
      openai: openaiConfig,
    },
  };
}

/**
 * Saves provider-specific custom settings (selected plan, API key, model).
 */
export async function saveProviderCustomSetting(
  provider: AIProviderId,
  data: {
    plan?: string;
    apiKey?: string;
    model?: string;
  }
): Promise<void> {
  let customSettings: Record<string, any> = {};
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ai_providers_custom_settings" },
    });
    if (setting?.value) {
      customSettings = JSON.parse(setting.value);
    }
  } catch {}

  if (data.plan) {
    customSettings[`${provider}_plan`] = data.plan;
  }
  if (data.model) {
    customSettings[`${provider}_model`] = data.model;
  }
  if (data.apiKey !== undefined) {
    if (data.apiKey.trim()) {
      customSettings[`${provider}_api_key`] = encrypt(data.apiKey.trim());
    } else {
      delete customSettings[`${provider}_api_key`];
    }
  }

  await prisma.systemSetting.upsert({
    where: { key: "ai_providers_custom_settings" },
    update: { value: JSON.stringify(customSettings) },
    create: { key: "ai_providers_custom_settings", value: JSON.stringify(customSettings) },
  });
}
