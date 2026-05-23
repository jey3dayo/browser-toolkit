import type { AiProvider } from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";

type AiProviderTokenKey =
  | "openaiApiToken"
  | "anthropicApiToken"
  | "zaiApiToken";

export function getAiProviderTokenKey(
  provider: AiProvider
): AiProviderTokenKey {
  switch (provider) {
    case "anthropic":
      return "anthropicApiToken";
    case "zai":
      return "zaiApiToken";
    case "openai":
      return "openaiApiToken";
    default:
      return "openaiApiToken";
  }
}

export function getAiProviderToken(
  storage: Partial<LocalStorageData>,
  provider: AiProvider
): string {
  return storage[getAiProviderTokenKey(provider)] ?? "";
}
