// Message Handlers for Content Script

import { Result } from "@praha/byethrow";
import {
  copyToClipboardWithNotification,
  getClipboardErrorMessage,
} from "@/content/clipboard";
import type { ToastMount } from "@/content/notification";
import type {
  ActionOverlayRequest,
  SummaryOverlayRequest,
} from "@/content/overlay-helpers";
import {
  getSummaryTargetText,
  type SummaryTarget,
} from "@/content/summary-target";
import {
  copyToClipboardFallback,
  pasteToContentEditable,
  pasteToInputElement,
} from "@/content/template-paste";
import type { ExtractedEvent, SummarySource } from "@/shared_types";

export type ContentRequest =
  | { action: "enableTableSort" }
  | { action: "showNotification"; message: string }
  | { action: "copyToClipboard"; text: string; successMessage?: string }
  | { action: "pasteTemplate"; content: string }
  | { action: "getSummaryTargetText"; ignoreSelection?: boolean }
  | {
      action: "showSummaryOverlay";
      status: "loading" | "ready" | "error";
      source: SummarySource;
      summary?: string;
      error?: string;
    }
  | {
      action: "showActionOverlay";
      status: "loading" | "ready" | "error";
      mode: "text" | "event";
      source: SummarySource;
      title: string;
      primary?: string;
      secondary?: string;
      calendarUrl?: string;
      ics?: string;
      event?: ExtractedEvent;
    };

export type MessageHandlerDeps = {
  enableTableSortWithNotification: () => void;
  startTableObserverWithNotification: () => void;
  showNotification: (message: string) => void;
  getOrCreateToastMount: () => ToastMount;
  showActionOverlay: (request: ActionOverlayRequest) => void;
  showSummaryOverlay: (request: SummaryOverlayRequest) => void;
};

/**
 * enableTableSortアクションのハンドラー
 */
export function handleEnableTableSort(
  deps: MessageHandlerDeps,
  sendResponse: (response: { success: boolean }) => void
): void {
  deps.enableTableSortWithNotification();
  deps.startTableObserverWithNotification();
  sendResponse({ success: true });
}

/**
 * showNotificationアクションのハンドラー
 */
export function handleShowNotification(
  deps: MessageHandlerDeps,
  message: string,
  sendResponse: (response: { ok: boolean }) => void
): void {
  deps.showNotification(message);
  sendResponse({ ok: true });
}

/**
 * copyToClipboardアクションのハンドラー
 */
export function handleCopyToClipboard(
  deps: MessageHandlerDeps,
  text: string,
  successMessage: string | undefined,
  sendResponse: (response: { ok: boolean; error?: string }) => void
): boolean {
  (async () => {
    const mount = deps.getOrCreateToastMount();
    const result = await copyToClipboardWithNotification(
      text,
      mount.notify,
      successMessage
    );
    if (Result.isSuccess(result)) {
      sendResponse({ ok: true });
    } else {
      sendResponse({
        ok: false,
        error: getClipboardErrorMessage(result.error),
      });
    }
  })().catch(() => {
    sendResponse({ ok: false, error: "コピーに失敗しました" });
  });
  return true;
}

/**
 * pasteTemplateアクションのハンドラー
 */
export function handlePasteTemplate(
  deps: MessageHandlerDeps,
  content: string,
  sendResponse: (response: { ok: boolean; error?: string }) => void
): boolean {
  (async () => {
    const activeElement = document.activeElement;

    // input/textarea要素への挿入
    if (
      activeElement &&
      (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement)
    ) {
      pasteToInputElement(activeElement, content);
      sendResponse({ ok: true });
      return;
    }

    // contenteditable要素への挿入
    if (
      activeElement &&
      activeElement instanceof HTMLElement &&
      activeElement.isContentEditable
    ) {
      try {
        pasteToContentEditable(activeElement, content);
        sendResponse({ ok: true });
        return;
      } catch {
        // Selection API失敗時はクリップボードにフォールバック
        const mount = deps.getOrCreateToastMount();
        await copyToClipboardFallback(content, mount, sendResponse);
        return;
      }
    }

    // フォーカスがない場合はクリップボードにコピー
    const mount = deps.getOrCreateToastMount();
    await copyToClipboardFallback(content, mount, sendResponse);
  })().catch(() => {
    sendResponse({
      ok: false,
      error: "テンプレートの貼り付けに失敗しました",
    });
  });
  return true;
}

/**
 * getSummaryTargetTextアクションのハンドラー
 */
export function handleGetSummaryTargetText(
  ignoreSelection: boolean | undefined,
  sendResponse: (response: SummaryTarget) => void
): boolean {
  (async () => {
    try {
      const target = await getSummaryTargetText({ ignoreSelection });
      sendResponse(target);
    } catch {
      sendResponse({
        text: "",
        source: "page",
        title: document.title ?? "",
        url: window.location.href,
      } satisfies SummaryTarget);
    }
  })().catch(() => {
    // no-op
  });
  return true;
}

/**
 * showSummaryOverlayアクションのハンドラー
 */
export function handleShowSummaryOverlay(
  deps: MessageHandlerDeps,
  request: SummaryOverlayRequest,
  sendResponse: (response: { ok: boolean }) => void
): void {
  deps.showSummaryOverlay(request);
  sendResponse({ ok: true });
}

/**
 * showActionOverlayアクションのハンドラー
 */
export function handleShowActionOverlay(
  deps: MessageHandlerDeps,
  request: ActionOverlayRequest,
  sendResponse: (response: { ok: boolean }) => void
): void {
  deps.showActionOverlay(request);
  sendResponse({ ok: true });
}

/**
 * メッセージリスナーのメインディスパッチャー
 */
export function createMessageListener(deps: MessageHandlerDeps) {
  return (
    request: ContentRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean | undefined => {
    switch (request.action) {
      case "enableTableSort": {
        handleEnableTableSort(deps, sendResponse);
        return;
      }
      case "showNotification": {
        handleShowNotification(deps, request.message, sendResponse);
        return;
      }
      case "copyToClipboard": {
        return handleCopyToClipboard(
          deps,
          request.text,
          request.successMessage,
          sendResponse
        );
      }
      case "pasteTemplate": {
        return handlePasteTemplate(deps, request.content, sendResponse);
      }
      case "getSummaryTargetText": {
        return handleGetSummaryTargetText(
          request.ignoreSelection,
          sendResponse
        );
      }
      case "showSummaryOverlay": {
        handleShowSummaryOverlay(deps, request, sendResponse);
        return;
      }
      case "showActionOverlay": {
        handleShowActionOverlay(deps, request, sendResponse);
        return;
      }
      default: {
        sendResponse({ ok: false });
        return;
      }
    }
  };
}
