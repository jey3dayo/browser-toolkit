import type { AiProvider } from "@/schemas/provider";
import { PROVIDER_CONFIGS } from "@/schemas/provider";
import type { ChatCompletionAdapter, ChatRequestBody } from "./adapter";
import { extractApiErrorMessage } from "./adapter-helpers";

type OpenAiCompatibleProvider = Extract<AiProvider, "openai" | "zai">;

function buildOpenAiRequestBody(body: ChatRequestBody): ChatRequestBody {
  if (!body.model.startsWith("gpt-5")) {
    return body;
  }

  const { temperature: _temperature, ...rest } = body;
  return rest;
}

export function extractOpenAiCompatibleChoiceText(
  json: unknown
): string | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }

  const { choices } = json as { choices?: unknown };
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const [first] = choices as unknown[];
  if (typeof first !== "object" || first === null) {
    return null;
  }

  const { message } = first as { message?: { content?: unknown } };
  const content = message?.content;
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
      const requestBody =
        provider === "openai" ? buildOpenAiRequestBody(body) : body;
      const init: RequestInit = {
        body: JSON.stringify(requestBody),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      };

      return { init, url };
    },

    extractError(json: unknown, status: number): string {
      return (
        extractApiErrorMessage(json) ??
        `${PROVIDER_CONFIGS[provider].label} APIエラー: ${status}`
      );
    },

    extractText(json: unknown): string | null {
      return extractOpenAiCompatibleChoiceText(json);
    },
  };
}
