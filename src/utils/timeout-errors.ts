/**
 * Timeout Errors - タイムアウトエラークラス集約
 *
 * Service Workerタイムアウト対策のための専用エラークラス
 */

/**
 * API呼び出しタイムアウトエラー（サーバー側）
 *
 * fetchWithTimeout で使用される。
 * Service Workerの30秒タイムアウトより前に中断された場合にスローされる。
 */
export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `API呼び出しがタイムアウトしました（${timeoutMs / 1000}秒）。テキストを短くして再試行してください。`
    );
    this.name = "FetchTimeoutError";
  }
}

/**
 * クライアント側タイムアウトエラー
 *
 * sendBackgroundResult で使用される。
 * ポップアップからbackgroundへのメッセージ送信がタイムアウトした場合にスローされる。
 */
export class ClientTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `リクエストがタイムアウトしました（${timeoutMs / 1000}秒）。テキストを短くして再試行してください。`
    );
    this.name = "ClientTimeoutError";
  }
}
