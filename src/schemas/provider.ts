/**
 * AIプロバイダー設定スキーマ
 */
import { check, pipe, safeParse, string } from "valibot";
import {
  ANTHROPIC_MODEL_LIST,
  ANTHROPIC_MODELS,
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
  openai: {
    label: "OpenAI",
    defaultModel: OPENAI_MODELS.GPT_5_2,
    models: OPENAI_MODEL_LIST,
    baseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
    models: ANTHROPIC_MODEL_LIST,
    baseUrl: "https://api.anthropic.com/v1",
  },
  zai: {
    label: "z.ai",
    defaultModel: ZAI_MODELS.GLM_4_7,
    models: ZAI_MODEL_LIST,
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

const LEGACY_OPENAI_MODEL_MAP: Record<string, string> = {
  [OPENAI_MODELS.GPT_4O]: OPENAI_MODELS.GPT_4O_MINI,
  "gpt-5.1": OPENAI_MODELS.GPT_5_2,
};

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
