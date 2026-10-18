import { Result } from "@praha/byethrow";
import { getAiProviderToken } from "@/ai/provider-token";
import { safeParseChatGptCredentials } from "@/schemas/chatgpt";
import {
  type ApiKeyProvider,
  isApiKeyProvider,
  normalizeAiModel,
  PROVIDER_CONFIGS,
  safeParseAiProvider,
} from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";

type AiSettingsCommon = {
  customPrompt: string;
  model: string;
  baseUrl: string;
};

export type AiSettings =
  | (AiSettingsCommon & { provider: ApiKeyProvider; token: string })
  | (AiSettingsCommon & { provider: "chatgpt" });

export const CHATGPT_NOT_SIGNED_IN_MESSAGE =
  "ChatGPT にサインインしていません。設定画面からサインインしてください";

export function loadAiSettings(
  storage: LocalStorageData
): Result.Result<AiSettings, string> {
  const providerValue = storage.aiProvider ?? "openai";
  const provider = safeParseAiProvider(providerValue) ?? "openai";

  const token = isApiKeyProvider(provider)
    ? getAiProviderToken(storage, provider).trim()
    : null;
  if (token === "") {
    return Result.fail("APIトークンが設定されていません");
  }
  if (
    token === null &&
    !safeParseChatGptCredentials(storage.chatgptCredentials)
  ) {
    return Result.fail(CHATGPT_NOT_SIGNED_IN_MESSAGE);
  }

  const customPrompt =
    storage.aiCustomPrompt ?? storage.openaiCustomPrompt ?? "";

  const modelValue = storage.aiModel ?? storage.openaiModel;
  const model = normalizeAiModel(provider, modelValue);

  const { baseUrl } = PROVIDER_CONFIGS[provider];

  const common = { baseUrl, customPrompt, model };
  return Result.succeed(
    isApiKeyProvider(provider) && token !== null
      ? { ...common, provider, token }
      : { ...common, provider: "chatgpt" }
  );
}

/**
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
