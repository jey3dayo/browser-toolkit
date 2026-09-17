/**
 * AIプロバイダーアダプターインターフェース
 *
 * OpenAIメッセージ形式を内部標準とし、各プロバイダー用のアダプターが
 * HTTPリクエスト/レスポンスを変換する。
 */

/**
 * チャットリクエストボディ（内部標準形式）
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

/**
 * チャット補完アダプター
 */
export type ChatCompletionAdapter = {
  /**
   * fetch用のURL・headers・bodyを構築
   */
  buildRequest: (
    token: string,
    body: ChatRequestBody
  ) => {
    url: string;
    init: RequestInit;
  };

  /**
   * レスポンスJSONからテキストを抽出
   */
  extractText: (json: unknown) => string | null;

  /**
   * エラーレスポンスからメッセージを抽出
   */
  extractError: (json: unknown, status: number) => string;
};
