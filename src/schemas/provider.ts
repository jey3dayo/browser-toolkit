/**
 * AIプロバイダー設定スキーマ
 */
import { check, pipe, safeParse, string } from "valibot";
import {
  ANTHROPIC_MODEL_LIST,
  ANTHROPIC_MODELS,
  LEGACY_OPENAI_MODEL_MAP,
  OPENAI_MODEL_LIST,
  OPENAI_MODELS,
  ZAI_MODEL_LIST,
  ZAI_MODELS,
} from "@/constants/models";

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
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: ANTHROPIC_MODELS.CLAUDE_SONNET_5,
    label: "Anthropic (Claude)",
    models: ANTHROPIC_MODEL_LIST,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: OPENAI_MODELS.GPT_5_6_TERRA,
    label: "OpenAI",
    models: OPENAI_MODEL_LIST,
  },
  zai: {
    baseUrl: "https://api.z.ai/api/paas/v4",
    defaultModel: ZAI_MODELS.GLM_4_7,
    label: "z.ai",
    models: ZAI_MODEL_LIST,
  },
};

/**
 * AIプロバイダースキーマ
 */
const aiProviderSchema = pipe(
  string(),
  check(
    (value): value is AiProvider => AI_PROVIDERS.includes(value as AiProvider),
    "Invalid AI provider"
  )
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

  const normalizedValue =
    provider === "openai" ? (LEGACY_OPENAI_MODEL_MAP[value] ?? value) : value;
  const config = PROVIDER_CONFIGS[provider];
  if (config.models.includes(normalizedValue)) {
    return normalizedValue;
  }

  return config.defaultModel;
}
