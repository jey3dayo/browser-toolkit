import { Result } from "@praha/byethrow";
import { CLIENT_MESSAGE_TIMEOUT_MS } from "@/constants/timeouts";
import type { PopupRuntime } from "@/popup/runtime";
import { ClientTimeoutError } from "@/utils/custom-errors";

type ErrorHandler = (message: string) => void;

export async function sendBackgroundResult<TRequest, TResponse>(params: {
  runtime: Pick<PopupRuntime, "sendMessageToBackground">;
  message: TRequest;
  onError: ErrorHandler;
  timeoutMs?: number | null;
}): Promise<TResponse | null> {
  // timeoutMs === null でタイムアウト無効化
  // timeoutMs === undefined でデフォルト30秒
  // timeoutMs === 数値 でカスタムタイムアウト
  const timeout =
    params.timeoutMs === null
      ? null
      : (params.timeoutMs ?? CLIENT_MESSAGE_TIMEOUT_MS);

  const responseUnknown =
    timeout === null
      ? await params.runtime
          .sendMessageToBackground<TRequest, unknown>(params.message)
          .catch((error: unknown) => {
            return Result.fail(
              error instanceof Error ? error.message : "不明なエラー"
            );
          })
      : await Promise.race([
          params.runtime.sendMessageToBackground<TRequest, unknown>(
            params.message
          ),
          new Promise<Result.Result<never, string>>((_, reject) =>
            setTimeout(() => reject(new ClientTimeoutError(timeout)), timeout)
          ),
        ]).catch((error: unknown) => {
          if (error instanceof ClientTimeoutError) {
            return Result.fail(error.message);
          }
          return Result.fail(
            error instanceof Error ? error.message : "不明なエラー"
          );
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
