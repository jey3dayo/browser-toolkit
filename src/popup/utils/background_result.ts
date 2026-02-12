import { Result } from "@praha/byethrow";
import type { PopupRuntime } from "@/popup/runtime";

type ErrorHandler = (message: string) => void;

/**
 * クライアント側タイムアウトエラー
 */
class ClientTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `リクエストがタイムアウトしました（${timeoutMs / 1000}秒）。テキストを短くして再試行してください。`
    );
    this.name = "ClientTimeoutError";
  }
}

export async function sendBackgroundResult<TRequest, TResponse>(params: {
  runtime: Pick<PopupRuntime, "sendMessageToBackground">;
  message: TRequest;
  onError: ErrorHandler;
  timeoutMs?: number;
}): Promise<TResponse | null> {
  const timeout = params.timeoutMs ?? 30_000; // デフォルト30秒

  const responseUnknown = await Promise.race([
    params.runtime.sendMessageToBackground<TRequest, unknown>(params.message),
    new Promise<Result.Result<never, string>>((_, reject) =>
      setTimeout(() => reject(new ClientTimeoutError(timeout)), timeout)
    ),
  ]).catch((error: unknown) => {
    if (error instanceof ClientTimeoutError) {
      return Result.fail(error.message);
    }
    return Result.fail(error instanceof Error ? error.message : "不明なエラー");
  });

  if (Result.isFailure(responseUnknown)) {
    params.onError(responseUnknown.error);
    return null;
  }

  const response = responseUnknown.value as Result.Result<TResponse, string>;
  if (Result.isFailure(response)) {
    params.onError(response.error);
    return null;
  }

  return response.value;
}
