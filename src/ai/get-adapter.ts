/**
 * アダプターファクトリ
 */
import type { AiProvider } from "@/schemas/provider";
import type { ChatCompletionAdapter } from "./adapter";
import { anthropicAdapter } from "./anthropic-adapter";
import { openaiAdapter } from "./openai-adapter";
import { zaiAdapter } from "./zai-adapter";

/**
 * プロバイダーに応じたアダプターを取得
 */
export function getAdapter(provider: AiProvider): ChatCompletionAdapter {
  switch (provider) {
    case "openai":
      return openaiAdapter;
    case "anthropic":
      return anthropicAdapter;
    case "zai":
      return zaiAdapter;
    default:
      return openaiAdapter;
  }
}
