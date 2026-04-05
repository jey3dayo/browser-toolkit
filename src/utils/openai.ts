import { Result } from "@praha/byethrow";
import type { ChatCompletionAdapter, ChatRequestBody } from "@/ai/adapter";
import { extractApiErrorMessage } from "@/ai/adapter-helpers";
import { extractOpenAiCompatibleChoiceText } from "@/ai/openai-compatible-adapter";
import { isAllowedApiOrigin } from "@/constants/api-endpoints";
import { API_FETCH_TIMEOUT_MS } from "@/constants/timeouts";
import { FetchTimeoutError } from "@/utils/custom-errors";
import { toErrorMessage } from "@/utils/errors";
import { fetchWithTimeout } from "@/utils/fetch-with-timeout";

/**
 * Fetch エラーを統一的に処理する
 * タイムアウトエラーの場合はそのメッセージを、それ以外はデフォルトメッセージを返す
 */
function handleFetchError(error: unknown, defaultMessage: string): string {
  if (error instanceof FetchTimeoutError) {
    return error.message;
  }
  return toErrorMessage(error, defaultMessage);
}

export function extractChatCompletionText(json: unknown): string | null {
  return extractOpenAiCompatibleChoiceText(json);
}

export function extractOpenAiApiErrorMessage(
  json: unknown,
  status: number
): string {
  return extractApiErrorMessage(json) ?? `OpenAI APIエラー: ${status}`;
}

type ChatCompletionResponsePayload = {
  response: Response;
  json: unknown;
};

type ChatCompletionErrorExtractor = (json: unknown, status: number) => string;

/**
 * Internal helper to fetch OpenAI Chat Completion API and return raw response + parsed JSON.
 * This function handles the common logic of making the API request and parsing the response.
 */
function fetchOpenAiChatCompletionRaw(
  fetchFn: typeof fetch,
  token: string,
  body: unknown
): Result.ResultAsync<ChatCompletionResponsePayload, string> {
  return Result.pipe(
    Result.try({
      try: () =>
        fetchWithTimeout(
          fetchFn,
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
          API_FETCH_TIMEOUT_MS
        ),
      catch: (error) =>
        handleFetchError(error, "OpenAI APIへのリクエストに失敗しました"),
    }),
    Result.andThen(async (response) => {
      const json = await Result.unwrap(
        Result.try({
          try: () => response.json(),
          catch: () => null,
        }),
        null
      );

      return Result.succeed({ response, json });
    })
  );
}

function buildChatCompletionTextResult(params: {
  payload: ChatCompletionResponsePayload;
  emptyContentMessage: string;
  extractError: ChatCompletionErrorExtractor;
  extractText: (json: unknown) => string | null;
}): Result.Result<string, string> {
  const { response, json } = params.payload;
  if (!response.ok) {
    return Result.fail(params.extractError(json, response.status));
  }

  const text = params.extractText(json);
  if (!text) {
    return Result.fail(params.emptyContentMessage);
  }

  return Result.succeed(text);
}

function buildChatCompletionOkResult(
  payload: ChatCompletionResponsePayload,
  extractError: ChatCompletionErrorExtractor
): Result.Result<void, string> {
  const { response, json } = payload;
  if (response.ok) {
    return Result.succeed();
  }

  return Result.fail(extractError(json, response.status));
}

export function fetchOpenAiChatCompletionText(
  fetchFn: typeof fetch,
  token: string,
  body: unknown,
  emptyContentMessage: string
): Result.ResultAsync<string, string> {
  return Result.pipe(
    fetchOpenAiChatCompletionRaw(fetchFn, token, body),
    Result.andThen((payload) =>
      buildChatCompletionTextResult({
        payload,
        emptyContentMessage,
        extractError: extractOpenAiApiErrorMessage,
        extractText: extractChatCompletionText,
      })
    )
  );
}

export function fetchOpenAiChatCompletionOk(
  fetchFn: typeof fetch,
  token: string,
  body: unknown
): Result.ResultAsync<void, string> {
  return Result.pipe(
    fetchOpenAiChatCompletionRaw(fetchFn, token, body),
    Result.andThen((payload) =>
      buildChatCompletionOkResult(payload, extractOpenAiApiErrorMessage)
    )
  );
}

/**
 * アダプター経由でチャット補完テキストを取得（新版）
 */
export function fetchChatCompletionText(
  fetchFn: typeof fetch,
  adapter: ChatCompletionAdapter,
  token: string,
  body: ChatRequestBody,
  emptyContentMessage: string
): Result.ResultAsync<string, string> {
  return Result.pipe(
    fetchChatCompletionJson(fetchFn, adapter, token, body),
    Result.andThen((payload) =>
      buildChatCompletionTextResult({
        payload,
        emptyContentMessage,
        extractError: adapter.extractError,
        extractText: adapter.extractText,
      })
    )
  );
}

function fetchChatCompletionJson(
  fetchFn: typeof fetch,
  adapter: ChatCompletionAdapter,
  token: string,
  body: ChatRequestBody
): Result.ResultAsync<ChatCompletionResponsePayload, string> {
  const { url, init } = adapter.buildRequest(token, body);

  // SECURITY: ホワイトリストチェック
  if (!isAllowedApiOrigin(url)) {
    return Promise.resolve(
      Result.fail(
        `セキュリティエラー: 許可されていないAPIエンドポイント (${new URL(url).origin})`
      )
    );
  }

  return Result.pipe(
    Result.try({
      try: () => fetchWithTimeout(fetchFn, url, init, API_FETCH_TIMEOUT_MS),
      catch: (error) =>
        handleFetchError(error, "APIへのリクエストに失敗しました"),
    }),
    Result.andThen(async (response) => {
      const json = await Result.unwrap(
        Result.try({
          try: () => response.json(),
          catch: () => null,
        }),
        null
      );

      return Result.succeed({ response, json });
    })
  );
}

/**
 * アダプター経由でチャット補完の成否を確認（新版）
 */
export function fetchChatCompletionOk(
  fetchFn: typeof fetch,
  adapter: ChatCompletionAdapter,
  token: string,
  body: ChatRequestBody
): Result.ResultAsync<void, string> {
  return Result.pipe(
    fetchChatCompletionJson(fetchFn, adapter, token, body),
    Result.andThen((payload) =>
      buildChatCompletionOkResult(payload, adapter.extractError)
    )
  );
}
