/**
 * Anthropicアダプター
 *
 * Anthropic APIの特徴:
 * - systemメッセージは別パラメータとして送信
 * - max_completion_tokens → max_tokens
 * - response_format は非対応（プロンプトで指示）
 * - レスポンスは content[0].text
 * - temperature / top_p / top_k は非対応（Claude 4.6 以降で削除。送ると 400）
 */

import { PROVIDER_CONFIGS } from "@/schemas/provider";
import type { ChatCompletionAdapter, ChatRequestBody } from "./adapter";
import { extractApiErrorMessage } from "./adapter-helpers";

export const anthropicAdapter: ChatCompletionAdapter = {
  buildRequest(token: string, body: ChatRequestBody) {
    const url = `${PROVIDER_CONFIGS.anthropic.baseUrl}/messages`;

    // systemメッセージを分離
    const systemMessages = body.messages.filter((m) => m.role === "system");
    const otherMessages = body.messages.filter((m) => m.role !== "system");

    // Anthropic APIのボディ形式に変換
    const anthropicBody: Record<string, unknown> = {
      max_tokens: body.max_completion_tokens ?? 4096,
      messages: otherMessages,
      model: body.model,
    };

    // systemメッセージがあれば追加
    if (systemMessages.length > 0) {
      anthropicBody.system = systemMessages.map((m) => m.content).join("\n\n");
    }

    const init: RequestInit = {
      body: JSON.stringify(anthropicBody),
      headers: {
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "x-api-key": token,
      },
      method: "POST",
    };

    return { init, url };
  },

  extractError(json: unknown, status: number): string {
    return extractApiErrorMessage(json) ?? `Anthropic APIエラー: ${status}`;
  },

  extractText(json: unknown): string | null {
    if (typeof json !== "object" || json === null) {
      return null;
    }
    const { content } = json as { content?: unknown };
    if (!Array.isArray(content) || content.length === 0) {
      return null;
    }
    const first = content[0] as { text?: unknown };
    if (typeof first.text !== "string") {
      return null;
    }
    return first.text.trim();
  },
};
