/**
 * AIモデル定数
 *
 * 各プロバイダーのモデルIDを統一管理
 */

/**
 * OpenAI モデル定数
 */
export const OPENAI_MODELS = {
  GPT_5_6_LUNA: "gpt-5.6-luna",
  GPT_5_6_TERRA: "gpt-5.6-terra",
} as const;

/**
 * Anthropic (Claude) モデル定数
 *
 * ID は日付サフィックスなしのエイリアスを使う（Anthropic の推奨形式）。
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_OPUS_5: "claude-opus-5",
  CLAUDE_SONNET_5: "claude-sonnet-5",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5",
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

/**
 * 廃止された OpenAI モデル ID から現行モデルへの読み替え表
 *
 * 既存ユーザーの保存済み設定を壊さないために必要。OpenAI モデルを更新する際は
 * ここだけを編集すれば `src/schemas/openai.ts` と `src/schemas/provider.ts` の
 * 両方に反映される。
 */
export const LEGACY_OPENAI_MODEL_MAP: Record<
  string,
  (typeof OPENAI_MODEL_LIST)[number]
> = {
  default: OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-nano": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-pro": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.1": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2-chat-latest": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4-2026-03-05": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.5": OPENAI_MODELS.GPT_5_6_TERRA,
};
