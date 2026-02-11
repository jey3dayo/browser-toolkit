/**
 * AIプロバイダー設定スキーマ
 */
import { check, pipe, safeParse, string } from "valibot";

export const AI_PROVIDERS = ["openai", "anthropic", "zai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const PROVIDER_CONFIGS: Record<
  AiProvider,
  {
    label: string;
    defaultModel: string;
    models: readonly string[];
    baseUrl: string;
  }
> = {
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-5.2",
    models: ["gpt-5.2", "gpt-5-mini", "gpt-4o-mini"],
    baseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-sonnet-4-5-20250929",
    models: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    baseUrl: "https://api.anthropic.com/v1",
  },
  zai: {
    label: "z.ai",
    defaultModel: "glm-4.7",
    models: ["glm-4.7"],
    baseUrl: "https://api.z.ai/api/paas/v4",
  },
};

/**
 * AIプロバイダースキーマ
 */
export const aiProviderSchema = pipe(
  string(),
  check((value): value is AiProvider => {
    return AI_PROVIDERS.includes(value as AiProvider);
  }, "Invalid AI provider")
);

/**
 * AIプロバイダーの安全なパース
 */
export function safeParseAiProvider(value: unknown): AiProvider | null {
  const result = safeParse(aiProviderSchema, value);
  return result.success ? (result.output as AiProvider) : null;
}

/**
 * プロバイダーに応じたモデルの正規化
 */
export function normalizeAiModel(
  provider: AiProvider,
  value: string | undefined
): string {
  if (!value) {
    return PROVIDER_CONFIGS[provider].defaultModel;
  }

  const config = PROVIDER_CONFIGS[provider];
  const valueAsModel = value as (typeof config.models)[number];
  if (config.models.includes(valueAsModel)) {
    return value;
  }

  return config.defaultModel;
}
