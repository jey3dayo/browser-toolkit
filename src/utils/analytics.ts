/**
 * Google Analytics 4 (GA4) Measurement Protocol
 *
 * エラー監視・ログ収集のためのGA4統合。
 * 本番環境でのみイベントを送信し、プライバシーに配慮した実装を行います。
 *
 * プライバシー保護:
 * - OpenAI API Keyは送信しない
 * - URLのパスパラメータは送信しない（ドメインのみ）
 * - ユーザー入力テキストは送信しない
 *
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

import { Result } from "@praha/byethrow";
import { fetchWithTimeout } from "@/utils/fetch-with-timeout";

// ============================================
// Configuration
// ============================================

const MEASUREMENT_ID = "G-59TVSQ4E82";
const API_SECRET = "lBk9VjVeQc2tAhB5BRrv6A";
const GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/**
 * GA4クライアントID（拡張機能のインストールごとに一意）
 * chrome.storage.localに保存され、再インストールまで永続化されます。
 */
let cachedClientId: string | null = null;

/**
 * キャッシュをクリア（テスト用）
 * @internal
 */
export function clearClientIdCache(): void {
  cachedClientId = null;
}

// ============================================
// Types
// ============================================

/**
 * GA4イベントパラメータ
 */
export interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * エラーコンテキスト（発生場所）
 */
export type ErrorContext = "background" | "content" | "popup";

// ============================================
// Client ID Management
// ============================================

/**
 * GA4クライアントIDを取得または生成
 *
 * @returns Promise<Result<string, string>> クライアントID
 */
async function getOrCreateClientId(): Promise<Result.Result<string, string>> {
  // キャッシュがあればそれを使用
  if (cachedClientId) {
    return Result.succeed(cachedClientId);
  }

  try {
    // chrome.storage.localから取得
    const stored = await chrome.storage.local.get("ga4_client_id");

    if (stored.ga4_client_id && typeof stored.ga4_client_id === "string") {
      cachedClientId = stored.ga4_client_id;
      return Result.succeed(cachedClientId);
    }

    // 存在しない場合は新規生成（UUID v4形式）
    const newClientId = crypto.randomUUID();
    await chrome.storage.local.set({ ga4_client_id: newClientId });
    cachedClientId = newClientId;

    return Result.succeed(newClientId);
  } catch (error) {
    return Result.fail(
      `Failed to get or create GA4 client ID: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================
// Event Tracking
// ============================================

/**
 * GA4にイベントを送信
 *
 * 本番環境（process.env.NODE_ENV === "production"）でのみ送信されます。
 * 開発環境ではコンソールログのみ出力します。
 *
 * @param eventName - イベント名
 * @param params - イベントパラメータ
 * @returns Promise<Result<void, string>> 送信結果
 */
export async function trackEvent(
  eventName: string,
  params?: EventParams
): Promise<Result.Result<void, string>> {
  // 開発環境ではコンソールログのみ
  if (process.env.NODE_ENV !== "production") {
    console.log("[Analytics] Event (dev mode only):", eventName, params);
    return Result.succeed(undefined);
  }

  // クライアントID取得
  const clientIdResult = await getOrCreateClientId();
  if (Result.isFailure(clientIdResult)) {
    return Result.fail(clientIdResult.error);
  }

  // GA4 Measurement Protocol ペイロード
  const payload = {
    client_id: clientIdResult.value,
    events: [
      {
        name: eventName,
        params: {
          ...params,
          // 拡張機能のバージョンを自動付与
          extension_version: chrome.runtime.getManifest().version,
        },
      },
    ],
  };

  try {
    const url = `${GA4_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
    const response = await fetchWithTimeout(fetch, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return Result.fail(
        `GA4 API returned ${response.status}: ${response.statusText}`
      );
    }

    return Result.succeed(undefined);
  } catch (error) {
    return Result.fail(
      `Failed to send GA4 event: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================
// Error Tracking
// ============================================

/**
 * エラーをGA4にトラッキング
 *
 * プライバシー保護のため、以下の情報は送信されません:
 * - OpenAI API Key
 * - URLのパスパラメータ
 * - ユーザー入力テキスト
 *
 * @param error - エラーオブジェクト
 * @param context - エラー発生場所（background/content/popup）
 * @returns Promise<Result<void, string>> 送信結果
 */
export function trackError(
  error: Error,
  context?: ErrorContext
): Promise<Result.Result<void, string>> {
  // エラーメッセージから機密情報を除去
  const sanitizedMessage = sanitizeErrorMessage(error.message);

  return trackEvent("exception", {
    description: sanitizedMessage,
    fatal: false,
    context: context || "unknown",
    error_name: error.name,
    // スタックトレースは送信しない（プライバシー保護）
  });
}

/**
 * エラーメッセージから機密情報を除去
 *
 * @param message - 元のエラーメッセージ
 * @returns サニタイズされたメッセージ
 */
function sanitizeErrorMessage(message: string): string {
  // OpenAI API Key のパターン（sk-から始まる文字列）を除去
  // 最小10文字以上で十分広範にマッチさせる
  let sanitized = message.replace(/sk-[A-Za-z0-9]{10,}/g, "[REDACTED_API_KEY]");

  // URL パスパラメータを除去（ドメインのみ残す）
  // 例: https://example.com/user/12345 → https://example.com/[PATH]
  sanitized = sanitized.replace(/(https?:\/\/[^/]+)(\/[^\s]*)/g, "$1/[PATH]");

  // 最大長制限（GA4の制限に合わせる）
  const maxLength = 500;
  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.substring(0, maxLength)}...`;
  }

  return sanitized;
}
