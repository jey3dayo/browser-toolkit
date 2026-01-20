// Template Paste Helpers

import { Result } from "@praha/byethrow";
import {
  copyToClipboardWithNotification,
  getClipboardErrorMessage,
} from "@/content/clipboard";
import type { ToastMount } from "@/content/notification";

/**
 * input/textarea要素にテキストを挿入
 */
export function pasteToInputElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  content: string
): void {
  const start = element.selectionStart ?? 0;
  const end = element.selectionEnd ?? 0;
  const currentValue = element.value;
  const newValue =
    currentValue.substring(0, start) + content + currentValue.substring(end);
  element.value = newValue;

  // カーソル位置を挿入後に移動
  const newCursorPos = start + content.length;
  element.setSelectionRange(newCursorPos, newCursorPos);

  // input/changeイベントを発火（React等のフレームワーク対応）
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * contenteditable要素にテキストを挿入
 * @throws Error Selection APIが利用できない場合
 */
export function pasteToContentEditable(
  element: HTMLElement,
  content: string
): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    throw new Error("No selection available");
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // テキストノードを作成して挿入
  const textNode = document.createTextNode(content);
  range.insertNode(textNode);

  // カーソルを挿入後に移動
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);

  // inputイベントを発火
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * クリップボードにテキストをコピー（フォールバック）
 */
export async function copyToClipboardFallback(
  content: string,
  toastMount: ToastMount,
  sendResponse: (response: { ok: boolean; error?: string }) => void
): Promise<void> {
  const result = await copyToClipboardWithNotification(
    content,
    toastMount.notify,
    "テンプレートをコピーしました"
  );
  if (Result.isSuccess(result)) {
    sendResponse({ ok: true });
  } else {
    sendResponse({
      ok: false,
      error: getClipboardErrorMessage(result.error),
    });
  }
}
