/**
 * AIプロバイダーアダプターインターフェース
 *
 * OpenAIメッセージ形式を内部標準とし、各プロバイダー用のアダプターが
 * HTTPリクエスト/レスポンスを変換する。
 */

export type ChatRequestBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_completion_tokens?: number;
  /** OpenAI / z.ai 向け（`{ type: "json_object" }`） */
  response_format?: unknown;
  /** Anthropic 向け（`{ format: { type: "json_schema", schema } }`） */
  output_config?: { format: { type: "json_schema"; schema: unknown } };
};

export type ChatCompletionAdapter = {
  buildRequest: (
    token: string,
    body: ChatRequestBody
  ) => {
    url: string;
    init: RequestInit;
  };

  extractText: (json: unknown) => string | null;

  extractError: (json: unknown, status: number) => string;
};
