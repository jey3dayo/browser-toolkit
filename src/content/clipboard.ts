// クリップボード操作
import { Result } from "@praha/byethrow";
import { t } from "@/i18n";
import type { Notifier } from "@/ui/toast";
import { type ClipboardError, copyToClipboard } from "@/utils/clipboard";

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
  successMessage?: string
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
      return t("clipboard.errors.emptyContent");
    case "unavailable":
      return t("clipboard.errors.unavailable");
    case "copy-failed":
      return t("clipboard.errors.copyFailed");
    default:
      // すべてのケースを網羅しているため、ここには到達しない
      return t("clipboard.errors.unknown");
  }
}
