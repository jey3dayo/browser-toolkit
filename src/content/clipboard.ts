// クリップボード操作
import type { Notifier } from "@/ui/toast";

export type CopyResult = { ok: true } | { ok: false; error: string };

/**
 * クリップボードにテキストをコピー
 * @param text - コピーするテキスト
 * @returns CopyResult
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "コピーする内容がありません" };
  }

  if (!navigator.clipboard?.writeText) {
    return {
      ok: false,
      error: "この環境ではクリップボードにコピーできません",
    };
  }

  try {
    await navigator.clipboard.writeText(trimmed);
    return { ok: true };
  } catch {
    return { ok: false, error: "コピーに失敗しました" };
  }
}

/**
 * クリップボードにコピーし、成功時に通知を表示
 * @param text - コピーするテキスト
 * @param notify - Notifierインスタンス
 * @param successMessage - 成功時のメッセージ
 * @returns CopyResult
 */
export async function copyToClipboardWithNotification(
  text: string,
  notify: Notifier,
  successMessage?: string
): Promise<CopyResult> {
  const result = await copyToClipboard(text);
  if (result.ok && successMessage?.trim()) {
    notify.success(successMessage.trim());
  }
  return result;
}
