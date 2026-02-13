/**
 * タイムアウト定数
 *
 * Service Workerのタイムアウト（30秒）を基準に設定
 */

/**
 * Service Workerの最大アイドル時間（Chromeの仕様）
 * Manifest V3では30秒でService Workerがスリープする
 */
export const SERVICE_WORKER_TIMEOUT_MS = 30_000;

/**
 * API呼び出しのデフォルトタイムアウト
 * Service Workerタイムアウトより短く設定し、
 * 適切なエラーハンドリングを可能にする
 */
export const API_FETCH_TIMEOUT_MS = 25_000;

/**
 * クライアント→バックグラウンド間のメッセージングタイムアウト
 * API呼び出し + オーバーヘッドを考慮
 */
export const CLIENT_MESSAGE_TIMEOUT_MS = SERVICE_WORKER_TIMEOUT_MS;

/**
 * 選択テキストのキャッシュ有効期限
 * ユーザーが選択してから短時間のみ有効とする
 */
export const SELECTED_TEXT_CACHE_TIMEOUT_MS = SERVICE_WORKER_TIMEOUT_MS;
