import { Result } from "@praha/byethrow";
import type { ChatCompletionAdapter, ChatRequestBody } from "@/ai/adapter";
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

export function extractOpenAiApiErrorMessage(
  json: unknown,
  status: number
): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: unknown }).error === "object" &&
    (json as { error: { message?: unknown } }).error !== null &&
    typeof (json as { error: { message?: unknown } }).error.message === "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }
  return `OpenAI APIエラー: ${status}`;
}

/**
 * Internal helper to fetch OpenAI Chat Completion API and return raw response + parsed JSON.
 * This function handles the common logic of making the API request and parsing the response.
 */
function fetchOpenAiChatCompletionRaw(
  fetchFn: typeof fetch,
  token: string,
  body: unknown
): Result.ResultAsync<{ response: Response; json: unknown }, string> {
  return Result.pipe(
    Result.try({
      immediate: true,
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
          immediate: true,
          try: () => response.json(),
          catch: () => null,
        }),
        null
      );

      return Result.succeed({ response, json });
    })
  );
}

export function fetchOpenAiChatCompletionText(
  fetchFn: typeof fetch,
  token: string,
  body: unknown,
  emptyContentMessage: string
): Result.ResultAsync<string, string> {
  return Result.pipe(
    fetchOpenAiChatCompletionRaw(fetchFn, token, body),
    Result.andThen(({ response, json }) => {
      if (!response.ok) {
        return Result.fail(extractOpenAiApiErrorMessage(json, response.status));
      }

      const text = extractChatCompletionText(json);
      if (!text) {
        return Result.fail(emptyContentMessage);
      }
      return Result.succeed(text);
    })
  );
}

export function fetchOpenAiChatCompletionOk(
  fetchFn: typeof fetch,
  token: string,
  body: unknown
): Result.ResultAsync<void, string> {
  return Result.pipe(
    fetchOpenAiChatCompletionRaw(fetchFn, token, body),
    Result.andThen(({ response, json }) => {
      if (response.ok) {
        return Result.succeed();
      }

      return Result.fail(extractOpenAiApiErrorMessage(json, response.status));
    })
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
      immediate: true,
      try: () => fetchWithTimeout(fetchFn, url, init, API_FETCH_TIMEOUT_MS),
      catch: (error) =>
        handleFetchError(error, "APIへのリクエストに失敗しました"),
    }),
    Result.andThen(async (response) => {
      const json = await Result.unwrap(
        Result.try({
          immediate: true,
          try: () => response.json(),
          catch: () => null,
        }),
        null
      );

      if (!response.ok) {
        return Result.fail(adapter.extractError(json, response.status));
      }

      const text = adapter.extractText(json);
      if (!text) {
        return Result.fail(emptyContentMessage);
      }
      return Result.succeed(text);
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
      immediate: true,
      try: () => fetchWithTimeout(fetchFn, url, init, API_FETCH_TIMEOUT_MS),
      catch: (error) =>
        handleFetchError(error, "APIへのリクエストに失敗しました"),
    }),
    Result.andThen(async (response) => {
      const json = await Result.unwrap(
        Result.try({
          immediate: true,
          try: () => response.json(),
          catch: () => null,
        }),
        null
      );

      if (response.ok) {
        return Result.succeed();
      }

      return Result.fail(adapter.extractError(json, response.status));
    })
  );
}
