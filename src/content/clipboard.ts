// クリップボード操作
import { Result } from "@praha/byethrow";
import type { Notifier } from "@/ui/toast";

export type ClipboardError =
  | { type: "empty-text" }
  | { type: "unavailable" }
  | { type: "copy-failed" };

/**
 * クリップボードにテキストをコピー
 * @param text - コピーするテキスト
 * @returns Result<void, ClipboardError>
 */
export async function copyToClipboard(
  text: string,
): Promise<Result.Result<void, ClipboardError>> {
  const trimmed = text.trim();
  if (!trimmed) {
    return Result.fail({ type: "empty-text" });
  }

  if (!navigator.clipboard?.writeText) {
    return Result.fail({ type: "unavailable" });
  }

  try {
    await navigator.clipboard.writeText(trimmed);
    return Result.succeed(undefined);
  } catch {
    return Result.fail({ type: "copy-failed" });
  }
}

/**
 * クリップボードにコピーし、成功時に通知を表示
 * @param text - コピーするテキスト
 * @param notify - Notifierインスタンス
 * @param successMessage - 成功時のメッセージ
 * @returns Result<void, ClipboardError>
 */
export async function copyToClipboardWithNotification(
  text: string,
  notify: Notifier,
  successMessage?: string,
): Promise<Result.Result<void, ClipboardError>> {
  const result = await copyToClipboard(text);
  if (Result.isSuccess(result) && successMessage?.trim()) {
    notify.success(successMessage.trim());
  }
  return result;
}

/**
 * ClipboardErrorから人間が読めるメッセージに変換
 * @param error - ClipboardError
 * @returns エラーメッセージ
 */
export function getClipboardErrorMessage(error: ClipboardError): string {
  switch (error.type) {
    case "empty-text":
      return "コピーする内容がありません";
    case "unavailable":
      return "この環境ではクリップボードにコピーできません";
    case "copy-failed":
      return "コピーに失敗しました";
  }
}
