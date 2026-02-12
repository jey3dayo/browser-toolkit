/**
 * Fetch with timeout utility
 *
 * Service Worker タイムアウト（30秒）対策として、
 * API呼び出しに明示的なタイムアウトを設定します。
 */

import { FetchTimeoutError } from "@/utils/custom-errors";

/**
 * タイムアウト付きfetch
 *
 * Service Workerの30秒タイムアウトより短い時間（デフォルト25秒）で
 * API呼び出しを中断します。
 *
 * @param fetchFn - fetch関数（テストではモック可能）
 * @param url - リクエストURL
 * @param init - fetchオプション
 * @param timeoutMs - タイムアウト時間（ミリ秒）デフォルト25000ms（25秒）
 * @returns Response Promise
 * @throws FetchTimeoutError タイムアウト時
 */
export function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit = {},
  timeoutMs = 25_000
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
