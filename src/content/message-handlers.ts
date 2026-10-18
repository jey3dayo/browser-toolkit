import { Result } from "@praha/byethrow";
import {
  copyToClipboardWithNotification,
  getClipboardErrorMessage,
} from "@/content/clipboard";
import type { ToastMount } from "@/content/notification";
import { getSummaryTargetText } from "@/content/summary-target";
import {
  copyToClipboardFallback,
  pasteToContentEditable,
  pasteToInputElement,
} from "@/content/template-paste";
import type {
  ActionOverlayRequest,
  ContentRequest,
  SearchBlocklistDiagnosticsResponse,
  SummaryOverlayRequest,
  SummaryTarget,
} from "@/content-script-messages";
import { t } from "@/i18n";
import { copyToClipboard } from "@/utils/clipboard";

export type MessageHandlerDeps = {
  enableTableSort: () => void;
  showNotification: (message: string) => void;
  getOrCreateToastMount: () => Promise<ToastMount | null>;
  showActionOverlay: (request: ActionOverlayRequest) => void;
  showSummaryOverlay: (request: SummaryOverlayRequest) => void;
  showQrCodeOverlay: (url: string) => void;
  getSearchBlocklistDiagnostics: () => SearchBlocklistDiagnosticsResponse;
};

function handleEnableTableSort(
  deps: MessageHandlerDeps,
  sendResponse: (response: { success: boolean }) => void
): void {
  deps.enableTableSort();
  sendResponse({ success: true });
}

function handleShowNotification(
  deps: MessageHandlerDeps,
  message: string,
  sendResponse: (response: { ok: boolean }) => void
): void {
  deps.showNotification(message);
  sendResponse({ ok: true });
}

function handleCopyToClipboard(
  deps: MessageHandlerDeps,
  text: string,
  successMessage: string | undefined,
  sendResponse: (response: { ok: boolean; error?: string }) => void
): boolean {
  (async () => {
    const mount = await deps.getOrCreateToastMount();
    if (mount) {
      const result = await copyToClipboardWithNotification(
        text,
        mount.notify,
        successMessage
      );
      if (Result.isSuccess(result)) {
        sendResponse({ ok: true });
      } else {
        sendResponse({
          error: getClipboardErrorMessage(result.error),
          ok: false,
        });
      }
      return;
    }

    const result = await copyToClipboard(text);
    if (Result.isSuccess(result)) {
      sendResponse({ ok: true });
      return;
    }
    sendResponse({
      error: getClipboardErrorMessage(result.error),
      ok: false,
    });
  })().catch(() => {
    sendResponse({ error: t("content.messageHandlers.copyFailed"), ok: false });
  });
  return true;
}

function handlePasteTemplate(
  deps: MessageHandlerDeps,
  content: string,
  sendResponse: (response: { ok: boolean; error?: string }) => void
): boolean {
  const copyFallback = async (): Promise<void> => {
    const mount = await deps.getOrCreateToastMount();
    if (mount) {
      await copyToClipboardFallback(content, mount, sendResponse);
      return;
    }

    const result = await copyToClipboard(content);
    if (Result.isSuccess(result)) {
      sendResponse({ ok: true });
      return;
    }
    sendResponse({
      error: getClipboardErrorMessage(result.error),
      ok: false,
    });
  };

  (async () => {
    const { activeElement } = document;

    if (
      activeElement &&
      (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement)
    ) {
      pasteToInputElement(activeElement, content);
      sendResponse({ ok: true });
      return;
    }

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
        await copyFallback();
        return;
      }
    }

    await copyFallback();
  })().catch(() => {
    sendResponse({
      error: t("content.messageHandlers.pasteTemplateFailed"),
      ok: false,
    });
  });
  return true;
}

function handleGetSummaryTargetText(
  ignoreSelection: boolean | undefined,
  sendResponse: (response: SummaryTarget) => void
): boolean {
  (async () => {
    try {
      const target = await getSummaryTargetText({ ignoreSelection });
      sendResponse(target);
    } catch {
      sendResponse({
        source: "page",
        text: "",
        title: document.title ?? "",
        url: window.location.href,
      } satisfies SummaryTarget);
    }
  })().catch(() => {
    // no-op
  });
  return true;
}

function handleShowSummaryOverlay(
  deps: MessageHandlerDeps,
  request: SummaryOverlayRequest,
  sendResponse: (response: { ok: boolean }) => void
): void {
  deps.showSummaryOverlay(request);
  sendResponse({ ok: true });
}

function handleShowActionOverlay(
  deps: MessageHandlerDeps,
  request: ActionOverlayRequest,
  sendResponse: (response: { ok: boolean }) => void
): void {
  deps.showActionOverlay(request);
  sendResponse({ ok: true });
}

function handleGetSearchBlocklistDiagnostics(
  deps: MessageHandlerDeps,
  sendResponse: (response: SearchBlocklistDiagnosticsResponse) => void
): void {
  sendResponse(deps.getSearchBlocklistDiagnostics());
}

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
      case "showQrCodeOverlay": {
        deps.showQrCodeOverlay(request.url);
        sendResponse({ ok: true });
        return;
      }
      case "getSearchBlocklistDiagnostics": {
        handleGetSearchBlocklistDiagnostics(deps, sendResponse);
        return;
      }
      default: {
        sendResponse({ ok: false });
        return;
      }
    }
  };
}
