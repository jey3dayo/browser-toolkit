import { Result } from "@praha/byethrow";
import { CLIENT_MESSAGE_TIMEOUT_MS } from "@/constants/timeouts";
import { t } from "@/i18n";
import type { PopupRuntime } from "@/popup/runtime";
import { ClientTimeoutError } from "@/utils/custom-errors";

type ErrorHandler = (message: string) => void;

/**
 * Timeout configuration for background message sending.
 * - `null`: タイムアウト無効（無期限に待機）
 * - `undefined`: デフォルトタイムアウトを使用（CLIENT_MESSAGE_TIMEOUT_MS）
 * - `number`: カスタムタイムアウト（ミリ秒）
 */
type TimeoutConfig = number | null | undefined;

function resolveTimeout(timeoutMs: TimeoutConfig): number | null {
  if (timeoutMs === null) {
    return null;
  }
  return timeoutMs ?? CLIENT_MESSAGE_TIMEOUT_MS;
}

export async function sendBackgroundResult<TRequest, TResponse>(params: {
  runtime: Pick<PopupRuntime, "sendMessageToBackground">;
  message: TRequest;
  onError: ErrorHandler;
  timeoutMs?: TimeoutConfig;
}): Promise<TResponse | null> {
  const timeout = resolveTimeout(params.timeoutMs);

  const responseUnknown =
    timeout === null
      ? await params.runtime
          .sendMessageToBackground<TRequest, unknown>(params.message)
          .catch((error: unknown) =>
            Result.fail(
              error instanceof Error ? error.message : t("common.unknownError")
            )
          )
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
            error instanceof Error ? error.message : t("common.unknownError")
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
