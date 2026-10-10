import type { ApiKeyProvider } from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";

type AiProviderTokenKey =
  | "openaiApiToken"
  | "anthropicApiToken"
  | "zaiApiToken";

export function getAiProviderTokenKey(
  provider: ApiKeyProvider
): AiProviderTokenKey {
  switch (provider) {
    case "anthropic":
      return "anthropicApiToken";
    case "zai":
      return "zaiApiToken";
    case "openai":
      return "openaiApiToken";
    default: {
      const unreachable: never = provider;
      return unreachable;
    }
  }
}

export function getAiProviderToken(
  storage: Partial<LocalStorageData>,
  provider: ApiKeyProvider
): string {
  return storage[getAiProviderTokenKey(provider)] ?? "";
}
