import type { ChatCompletionAdapter, ChatRequestBody } from "./adapter";
import { extractApiErrorMessage } from "./adapter-helpers";

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

export function createOpenAiCompatibleAdapter(config: {
  baseUrl: string;
  label: string;
  prepareBody: (body: ChatRequestBody) => ChatRequestBody;
}): ChatCompletionAdapter {
  return {
    buildRequest(token: string, body: ChatRequestBody) {
      const url = `${config.baseUrl}/chat/completions`;
      const requestBody = config.prepareBody(body);
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
        extractApiErrorMessage(json) ?? `${config.label} APIエラー: ${status}`
      );
    },

    extractText(json: unknown): string | null {
      return extractOpenAiCompatibleChoiceText(json);
    },
  };
}
