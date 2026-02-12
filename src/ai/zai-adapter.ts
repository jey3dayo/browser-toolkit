/**
 * z.aiアダプター（OpenAI互換）
 */

import { PROVIDER_CONFIGS } from "@/schemas/provider";
import type { ChatCompletionAdapter, ChatRequestBody } from "./adapter";

export const zaiAdapter: ChatCompletionAdapter = {
  buildRequest(token: string, body: ChatRequestBody) {
    const url = `${PROVIDER_CONFIGS.zai.baseUrl}/chat/completions`;
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
  },

  extractError(json: unknown, status: number): string {
    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: unknown }).error === "object" &&
      (json as { error: { message?: unknown } }).error !== null &&
      typeof (json as { error: { message?: unknown } }).error.message ===
        "string"
    ) {
      return (json as { error: { message: string } }).error.message;
    }
    return `z.ai APIエラー: ${status}`;
  },
};
