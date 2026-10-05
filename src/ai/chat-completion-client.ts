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

type ChatCompletionResponsePayload = {
  response: Response;
  json: unknown;
};

type ChatCompletionErrorExtractor = (json: unknown, status: number) => string;

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

/**
 * アダプター経由でチャット補完テキストを取得
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
        emptyContentMessage,
        extractError: adapter.extractError,
        extractText: adapter.extractText,
        payload,
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
      catch: (error) =>
        handleFetchError(error, "APIへのリクエストに失敗しました"),
      try: () => fetchWithTimeout(fetchFn, url, init, API_FETCH_TIMEOUT_MS),
    }),
    Result.andThen(async (response) => {
      const json = await Result.unwrap(
        Result.try({
          catch: () => null,
          try: () => response.json(),
        }),
        null
      );

      return Result.succeed({ json, response });
    })
  );
}

/**
 * アダプター経由でチャット補完の成否を確認
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
