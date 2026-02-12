/**
 * AIモデル定数
 *
 * 各プロバイダーのモデルIDを統一管理
 */

/**
 * OpenAI モデル定数
 */
export const OPENAI_MODELS = {
  GPT_5_2: "gpt-5.2",
  GPT_5_MINI: "gpt-5-mini",
  GPT_5_NANO: "gpt-5-nano",
  GPT_5_PRO: "gpt-5-pro",
  GPT_5_2_CHAT: "gpt-5.2-chat-latest",
  // 後方互換性のため残す
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",
} as const;

/**
 * Anthropic (Claude) モデル定数
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5-20251001",
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
} as const;

/**
 * z.ai (GLM) モデル定数
 */
export const ZAI_MODELS = {
  GLM_5: "glm-5",
  GLM_4_7: "glm-4.7",
  GLM_4_6: "glm-4.6",
  GLM_4_5: "glm-4.5",
} as const;

/**
 * OpenAIモデル一覧（配列）
 */
export const OPENAI_MODEL_LIST = Object.values(OPENAI_MODELS);

/**
 * Anthropicモデル一覧（配列）
 */
export const ANTHROPIC_MODEL_LIST = Object.values(ANTHROPIC_MODELS);

/**
 * z.aiモデル一覧（配列）
 */
export const ZAI_MODEL_LIST = Object.values(ZAI_MODELS);
