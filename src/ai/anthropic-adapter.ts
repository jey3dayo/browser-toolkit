/**
 * Anthropicアダプター
 *
 * Anthropic APIの特徴:
 * - systemメッセージは別パラメータとして送信
 * - max_completion_tokens → max_tokens
 * - response_format は非対応（プロンプトで指示）
 * - レスポンスは content[0].text
 */

import { PROVIDER_CONFIGS } from "@/schemas/provider";
import type { ChatCompletionAdapter, ChatRequestBody } from "./adapter";

export const anthropicAdapter: ChatCompletionAdapter = {
  buildRequest(token: string, body: ChatRequestBody) {
    const url = `${PROVIDER_CONFIGS.anthropic.baseUrl}/messages`;

    // systemメッセージを分離
    const systemMessages = body.messages.filter((m) => m.role === "system");
    const otherMessages = body.messages.filter((m) => m.role !== "system");

    // Anthropic APIのボディ形式に変換
    const anthropicBody: Record<string, unknown> = {
      model: body.model,
      messages: otherMessages,
      max_tokens: body.max_completion_tokens ?? 4096,
    };

    // systemメッセージがあれば追加
    if (systemMessages.length > 0) {
      anthropicBody.system = systemMessages.map((m) => m.content).join("\n\n");
    }

    // temperatureがあれば追加
    if (body.temperature !== undefined) {
      anthropicBody.temperature = body.temperature;
    }

    const init: RequestInit = {
      method: "POST",
      headers: {
        "x-api-key": token,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicBody),
    };

    return { url, init };
  },

  extractText(json: unknown): string | null {
    if (typeof json !== "object" || json === null) {
      return null;
    }
    const content = (json as { content?: unknown }).content;
    if (!Array.isArray(content) || content.length === 0) {
      return null;
    }
    const first = content[0] as { text?: unknown };
    if (typeof first.text !== "string") {
      return null;
    }
    return first.text.trim();
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
    return `Anthropic APIエラー: ${status}`;
  },
};
