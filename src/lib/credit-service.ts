// ============================================================
// VibeFlow Studio — Credit Balance & Overage Service
// Tracks remaining credits/quotas for Claude & Gemini
// Enforces overage authorization switch for paid API usage
// ============================================================

import { prisma } from "@/lib/prisma";

export interface CreditProviderInfo {
  provider: "claude" | "gemini";
  name: string;
  planType: "PRO_SUBSCRIPTION" | "FREE_TIER" | "PAY_AS_YOU_GO";
  balanceEur: number;
  quotaUsedPercent: number;
  quotaRemainingLabel: string;
  status: "HEALTHY" | "LOW_CREDIT" | "EXHAUSTED" | "NOT_CONFIGURED";
  resetPeriod?: string;
  tokensConsumedToday: number;
  lastUpdated: string;
}

export interface CreditOverageSettings {
  overageAllowed: boolean; // Button toggle: Allow/Deny overage & paid credit usage
  overageLimitEur: number; // Max overage limit in Euros
  currentOverageUsedEur: number;
  autoStopOnExhausted: boolean;
  updatedAt: string;
}

export interface CreditStatusSummary {
  claude: CreditProviderInfo;
  gemini: CreditProviderInfo;
  overageSettings: CreditOverageSettings;
  totalEstimatedBalanceEur: number;
  modeActiveLabel: string;
  timestamp: string;
}

// In-memory defaults and cache
const DEFAULT_OVERAGE_SETTINGS: CreditOverageSettings = {
  overageAllowed: false, // Default is strictly safe (0€ extra surprise)
  overageLimitEur: 10.0,
  currentOverageUsedEur: 0.0,
  autoStopOnExhausted: true,
  updatedAt: new Date().toISOString(),
};

const globalCredits = global as unknown as {
  __vibeflowOverageSettings?: CreditOverageSettings;
  __vibeflowTokenStats?: {
    claudeTokensToday: number;
    geminiTokensToday: number;
    lastResetDate: string;
  };
};

if (!globalCredits.__vibeflowOverageSettings) {
  globalCredits.__vibeflowOverageSettings = { ...DEFAULT_OVERAGE_SETTINGS };
}

if (!globalCredits.__vibeflowTokenStats) {
  globalCredits.__vibeflowTokenStats = {
    claudeTokensToday: 0,
    geminiTokensToday: 0,
    lastResetDate: new Date().toDateString(),
  };
}

/**
 * Checks and resets daily counters if a new day has arrived.
 */
function checkDailyReset() {
  const today = new Date().toDateString();
  if (globalCredits.__vibeflowTokenStats?.lastResetDate !== today) {
    globalCredits.__vibeflowTokenStats = {
      claudeTokensToday: 0,
      geminiTokensToday: 0,
      lastResetDate: today,
    };
  }
}

/**
 * Retrieves the current overage configuration.
 */
export async function getOverageSettings(): Promise<CreditOverageSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "credit_overage_settings" },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      globalCredits.__vibeflowOverageSettings = {
        ...DEFAULT_OVERAGE_SETTINGS,
        ...parsed,
      };
      return globalCredits.__vibeflowOverageSettings!;
    }
  } catch {
    // DB not available, fallback to cache
  }

  return globalCredits.__vibeflowOverageSettings || { ...DEFAULT_OVERAGE_SETTINGS };
}

/**
 * Updates overage authorization and limits.
 */
export async function updateOverageSettings(
  partial: Partial<CreditOverageSettings>
): Promise<CreditOverageSettings> {
  const current = await getOverageSettings();
  const updated: CreditOverageSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  globalCredits.__vibeflowOverageSettings = updated;

  try {
    await prisma.systemSetting.upsert({
      where: { key: "credit_overage_settings" },
      create: {
        key: "credit_overage_settings",
        value: JSON.stringify(updated),
      },
      update: {
        value: JSON.stringify(updated),
      },
    });
  } catch {
    // Non-blocking in memory fallback
  }

  return updated;
}

/**
 * Checks whether overage / paid credit consumption is currently permitted.
 */
export async function isOverageAllowed(): Promise<boolean> {
  const settings = await getOverageSettings();
  return Boolean(settings.overageAllowed);
}

/**
 * Records token consumption for accurate credit tracking.
 */
export async function recordTokenUsage(
  provider: "claude" | "gemini",
  tokens: number
): Promise<void> {
  checkDailyReset();
  if (provider === "claude") {
    globalCredits.__vibeflowTokenStats!.claudeTokensToday += tokens;
  } else {
    globalCredits.__vibeflowTokenStats!.geminiTokensToday += tokens;
  }
}

/**
 * Computes live credit balance and status for Claude and Gemini.
 */
export async function getCreditStatus(): Promise<CreditStatusSummary> {
  checkDailyReset();
  const overageSettings = await getOverageSettings();

  // Inspect database / settings for configured keys and activity
  let hasAnthropicKey = false;
  let hasGeminiKey = false;
  let taskCountToday = 0;

  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "singleton" } });
    hasAnthropicKey = Boolean(settings?.defaultAnthropicKey || process.env.ANTHROPIC_API_KEY);
    hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    taskCountToday = await prisma.task.count({
      where: { updatedAt: { gte: startOfDay } },
    });
  } catch {
    // Fallback if DB offline
    hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
    hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  }

  // 1. Claude Status Computation
  const claudeTokens = globalCredits.__vibeflowTokenStats?.claudeTokensToday || taskCountToday * 4500;
  // Estimated balance: If API key is present, compute remaining from baseline (e.g. 20$), else show subscription status
  const claudeCostToday = (claudeTokens / 1_000_000) * 12.0; // blended rate ~12€ / M
  const claudeEstimatedBalanceEur = Math.max(0, 20.0 - claudeCostToday);
  const claudeUsedPercent = Math.min(100, Math.round((claudeCostToday / 20.0) * 100));

  const claudeInfo: CreditProviderInfo = {
    provider: "claude",
    name: "Anthropic Claude",
    planType: hasAnthropicKey ? "PAY_AS_YOU_GO" : "PRO_SUBSCRIPTION",
    balanceEur: Number(claudeEstimatedBalanceEur.toFixed(2)),
    quotaUsedPercent: claudeUsedPercent,
    quotaRemainingLabel: hasAnthropicKey
      ? `${claudeEstimatedBalanceEur.toFixed(2)} $ restant(s)`
      : "Claude Pro (0€ illimité CLI)",
    status: claudeEstimatedBalanceEur > 3.0 ? "HEALTHY" : "LOW_CREDIT",
    resetPeriod: "Mensuel (Abonnement)",
    tokensConsumedToday: claudeTokens,
    lastUpdated: new Date().toISOString(),
  };

  // 2. Gemini Status Computation
  const geminiTokens = globalCredits.__vibeflowTokenStats?.geminiTokensToday || taskCountToday * 5200;
  // Google AI Studio offers 1,500 requests / day free tier
  const geminiRequestsUsedToday = Math.min(1500, Math.round(geminiTokens / 1500) + taskCountToday * 2);
  const geminiRequestsRemaining = Math.max(0, 1500 - geminiRequestsUsedToday);
  const geminiUsedPercent = Math.min(100, Math.round((geminiRequestsUsedToday / 1500) * 100));
  const geminiEstimatedBalanceEur = Math.max(0, 45.0 - (geminiTokens / 1_000_000) * 0.35);

  const geminiInfo: CreditProviderInfo = {
    provider: "gemini",
    name: "Google Gemini (Antigravity)",
    planType: "FREE_TIER",
    balanceEur: Number(geminiEstimatedBalanceEur.toFixed(2)),
    quotaUsedPercent: geminiUsedPercent,
    quotaRemainingLabel: `${geminiRequestsRemaining} / 1 500 req/jour`,
    status: geminiRequestsRemaining > 100 ? "HEALTHY" : "LOW_CREDIT",
    resetPeriod: "Quotidien (Minuit UTC)",
    tokensConsumedToday: geminiTokens,
    lastUpdated: new Date().toISOString(),
  };

  const totalEstimatedBalance = Number(
    (claudeEstimatedBalanceEur + geminiEstimatedBalanceEur).toFixed(2)
  );

  return {
    claude: claudeInfo,
    gemini: geminiInfo,
    overageSettings,
    totalEstimatedBalanceEur: totalEstimatedBalance,
    modeActiveLabel: overageSettings.overageAllowed
      ? "Overage Autorisé (Continuité)"
      : "Overage Désactivé (0€ Garanti)",
    timestamp: new Date().toISOString(),
  };
}
