/**
 * Fetch with timeout utility
 *
 * Service Worker タイムアウト（30秒）対策として、
 * API呼び出しに明示的なタイムアウトを設定します。
 */

import { API_FETCH_TIMEOUT_MS } from "@/constants/timeouts";
import { FetchTimeoutError } from "@/utils/custom-errors";

export function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit = {},
  timeoutMs = API_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetchFn(url, {
    ...init,
    signal: init.signal
      ? AbortSignal.any([controller.signal, init.signal])
      : controller.signal,
  })
    .then((response) => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch((error: unknown) => {
      clearTimeout(timeoutId);
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new FetchTimeoutError(timeoutMs);
      }
      throw error;
    });
}
