/**
 * AI設定読み込みモジュール
 */
import { Result } from "@praha/byethrow";
import {
  type AiProvider,
  normalizeAiModel,
  PROVIDER_CONFIGS,
  safeParseAiProvider,
} from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";

/**
 * AI設定
 */
export type AiSettings = {
  provider: AiProvider;
  token: string;
  customPrompt: string;
  model: string;
  baseUrl: string;
};

/**
 * AI設定の読み込み
 *
 * プロバイダー別トークンキーを使用
 */
export function loadAiSettings(
  storage: LocalStorageData
): Result.Result<AiSettings, string> {
  // プロバイダー（新キー優先）
  const providerValue = storage.aiProvider ?? "openai";
  const provider = safeParseAiProvider(providerValue) ?? "openai";

  // プロバイダー別トークン（レガシーフォールバックなし）
  let token = "";
  switch (provider) {
    case "openai":
      token = storage.openaiApiToken ?? "";
      break;
    case "anthropic":
      token = storage.anthropicApiToken ?? "";
      break;
    case "zai":
      token = storage.zaiApiToken ?? "";
      break;
    default:
      token = "";
  }

  token = token.trim();
  if (!token) {
    return Result.fail("APIトークンが設定されていません");
  }

  // カスタムプロンプト（新キー優先、旧キーフォールバック）
  const customPrompt =
    storage.aiCustomPrompt ?? storage.openaiCustomPrompt ?? "";

  // モデル（新キー優先、旧キーフォールバック、プロバイダー別に正規化）
  const modelValue = storage.aiModel ?? storage.openaiModel;
  const model = normalizeAiModel(provider, modelValue);

  // ベースURL
  const baseUrl = PROVIDER_CONFIGS[provider].baseUrl;

  return Result.succeed({
    provider,
    token,
    customPrompt,
    model,
    baseUrl,
  });
}

/**
 * 旧キーから新キーへのマイグレーション
 *
 * @deprecated This function is now integrated into the Migration System (src/storage/migrations.ts).
 * See migration v1 for the implementation.
 */
export function migrateToAiSettings(
  _storage: chrome.storage.LocalStorageArea
): Promise<void> {
  console.warn(
    "[migrateToAiSettings] This function is deprecated. Migration is now handled by the Migration System."
  );
  // No-op: マイグレーションはsrc/storage/migrations.tsで処理される
  return Promise.resolve();
}
