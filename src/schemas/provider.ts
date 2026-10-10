/**
 * AIプロバイダー設定スキーマ
 */
import { check, pipe, safeParse, string } from "valibot";
import {
  ANTHROPIC_MODEL_LIST,
  ANTHROPIC_MODELS,
  DEFAULT_OPENAI_MODEL,
  OPENAI_MODEL_LIST,
  ZAI_MODEL_LIST,
  ZAI_MODELS,
} from "@/constants/models";

export const AI_PROVIDERS = ["openai", "chatgpt", "anthropic", "zai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** API キーで認証する provider。chatgpt は OAuth（Sign in with ChatGPT）で認証する */
export type ApiKeyProvider = Exclude<AiProvider, "chatgpt">;

export function isApiKeyProvider(
  provider: AiProvider
): provider is ApiKeyProvider {
  return provider !== "chatgpt";
}

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
  chatgpt: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: DEFAULT_OPENAI_MODEL,
    label: "ChatGPT プラン",
    models: OPENAI_MODEL_LIST,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: DEFAULT_OPENAI_MODEL,
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

  const config = PROVIDER_CONFIGS[provider];
  if (config.models.includes(value)) {
    return value;
  }

  return config.defaultModel;
}
