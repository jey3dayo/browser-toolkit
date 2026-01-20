import { Result } from "@praha/byethrow";
import type { PopupRuntime } from "@/popup/runtime";

type ErrorHandler = (message: string) => void;

export async function sendBackgroundResult<TRequest, TResponse>(params: {
  runtime: Pick<PopupRuntime, "sendMessageToBackground">;
  message: TRequest;
  onError: ErrorHandler;
}): Promise<TResponse | null> {
  const responseUnknown = await params.runtime.sendMessageToBackground<
    TRequest,
    unknown
  >(params.message);
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
