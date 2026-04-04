import type { AiProvider } from "@/schemas/provider";
import { PROVIDER_CONFIGS } from "@/schemas/provider";
import type { ChatCompletionAdapter, ChatRequestBody } from "./adapter";
import { extractApiErrorMessage } from "./adapter-helpers";

type OpenAiCompatibleProvider = Extract<AiProvider, "openai" | "zai">;

export function extractOpenAiCompatibleChoiceText(
  json: unknown
): string | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }

  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  if (typeof content !== "string") {
    return null;
  }

  return content.trim();
}

export function createOpenAiCompatibleAdapter(
  provider: OpenAiCompatibleProvider
): ChatCompletionAdapter {
  return {
    buildRequest(token: string, body: ChatRequestBody) {
      const url = `${PROVIDER_CONFIGS[provider].baseUrl}/chat/completions`;
      const init: RequestInit = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      };

      return { url, init };
    },

    extractText(json: unknown): string | null {
      return extractOpenAiCompatibleChoiceText(json);
    },

    extractError(json: unknown, status: number): string {
      return (
        extractApiErrorMessage(json) ??
        `${PROVIDER_CONFIGS[provider].label} APIエラー: ${status}`
      );
    },
  };
}
