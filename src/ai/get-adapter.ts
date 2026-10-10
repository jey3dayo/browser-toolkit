/**
 * アダプターファクトリ
 */
import type { ApiKeyProvider } from "@/schemas/provider";
import type { ChatCompletionAdapter } from "./adapter";
import { anthropicAdapter } from "./anthropic-adapter";
import { openaiAdapter } from "./openai-adapter";
import { zaiAdapter } from "./zai-adapter";

/**
 * プロバイダーに応じたアダプターを取得
 */
export function getAdapter(provider: ApiKeyProvider): ChatCompletionAdapter {
  switch (provider) {
    case "openai":
      return openaiAdapter;
    case "anthropic":
      return anthropicAdapter;
    case "zai":
      return zaiAdapter;
    default: {
      const unreachable: never = provider;
      return unreachable;
    }
  }
}
