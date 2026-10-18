export const OPENAI_MODELS = {
  GPT_6_LUNA: "gpt-6-luna",
  GPT_6_1_SOL: "gpt-6.1-sol",
} as const;

/** OpenAI の既定モデル。未設定・未対応の設定の fallback はこの値を参照する。 */
export const DEFAULT_OPENAI_MODEL = OPENAI_MODELS.GPT_6_LUNA;

/**
 * ID は日付サフィックスなしのエイリアスを使う（Anthropic の推奨形式）。
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_OPUS_5: "claude-opus-5",
  CLAUDE_SONNET_5: "claude-sonnet-5",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5",
} as const;

export const ZAI_MODELS = {
  GLM_5: "glm-5",
  GLM_4_7: "glm-4.7",
  GLM_4_6: "glm-4.6",
  GLM_4_5: "glm-4.5",
} as const;

export const OPENAI_MODEL_LIST = Object.values(OPENAI_MODELS);

export const ANTHROPIC_MODEL_LIST = Object.values(ANTHROPIC_MODELS);

export const ZAI_MODEL_LIST = Object.values(ZAI_MODELS);
