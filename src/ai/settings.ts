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
 * ストレージに新キーがなく、旧キーがある場合に実行
 */
export async function migrateToAiSettings(
  storage: chrome.storage.LocalStorageArea
): Promise<void> {
  const data = await storage.get([
    "aiProvider",
    "aiModel",
    "aiCustomPrompt",
    "openaiApiToken",
    "openaiModel",
    "openaiCustomPrompt",
  ]);

  // すでに新キーがある場合はマイグレーション不要
  if (data.aiProvider || data.aiModel || data.aiCustomPrompt) {
    return;
  }

  // 旧キーから新キーへコピー
  const updates: Partial<LocalStorageData> = {};

  if (typeof data.openaiApiToken === "string") {
    updates.aiProvider = "openai";
    // openaiApiTokenはそのまま維持（プロバイダー別キー）
  }

  if (typeof data.openaiModel === "string") {
    updates.aiModel = data.openaiModel;
  }

  if (typeof data.openaiCustomPrompt === "string") {
    updates.aiCustomPrompt = data.openaiCustomPrompt;
  }

  if (Object.keys(updates).length > 0) {
    await storage.set(updates);
  }
}
