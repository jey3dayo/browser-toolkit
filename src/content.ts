// Content Script - Webページに注入される

import { Result } from "@praha/byethrow";
import {
  copyToClipboardWithNotification,
  getClipboardErrorMessage,
} from "@/content/clipboard";
import {
  getCurrentPatternRowFilterSetting as getPatternRowFilterSetting,
  refreshTableConfig,
} from "@/content/config";
import {
  ensureToastMount,
  showNotification as showNotificationCore,
  type ToastMount,
} from "@/content/notification";
import {
  type ActionOverlayRequest,
  closeOverlay,
  ensureOverlayMount,
  type OverlayMount,
  resetSummarizeOverlayTitleState,
  type SummaryOverlayRequest,
  showActionOverlay as showActionOverlayCore,
  showSummaryOverlay as showSummaryOverlayCore,
} from "@/content/overlay-helpers";
import {
  getSummaryTargetText,
  type SummaryTarget,
} from "@/content/summary-target";
import {
  startTableObserver,
  stopTableObserver,
} from "@/content/table-observer";
import {
  enableTableSort,
  sortTable as sortTableCore,
} from "@/content/table-sort";
import { matchesAnyPattern, patternToRegex } from "@/content/url-pattern";
import type { DomainPatternConfig } from "@/popup/runtime";
import type { ExtractedEvent, SummarySource } from "@/shared_types";
import { storageLocalGet, storageLocalSet } from "@/storage/helpers";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import { parseNumericValue } from "@/utils/number_parser";

(() => {
  type ContentRequest =
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

  type GlobalContentState = {
    initialized: boolean;
    overlayMount: OverlayMount | null;
    toastMount: ToastMount | null;
  };

  const globalContainer = globalThis as unknown as {
    __MBU_CONTENT_STATE__?: GlobalContentState;
  };
  if (!globalContainer.__MBU_CONTENT_STATE__) {
    globalContainer.__MBU_CONTENT_STATE__ = {
      initialized: false,
      overlayMount: null,
      toastMount: null,
    };
  }
  const globalState = globalContainer.__MBU_CONTENT_STATE__;

  let currentTheme: Theme = "auto";

  function normalizeTheme(value: unknown): Theme {
    return isTheme(value) ? value : "auto";
  }

  function applyThemeToMounts(theme: Theme): void {
    if (globalState.toastMount?.host.isConnected) {
      applyTheme(theme, globalState.toastMount.shadow);
    }
    if (globalState.overlayMount?.host.isConnected) {
      applyTheme(theme, globalState.overlayMount.shadow);
    }
  }

  async function refreshThemeFromStorage(): Promise<void> {
    const result = await storageLocalGet<{ theme?: unknown }>(["theme"]);
    if (Result.isSuccess(result)) {
      currentTheme = normalizeTheme(result.value.theme);
    } else {
      currentTheme = "auto";
    }
    applyThemeToMounts(currentTheme);
  }

  // ========================================
  // 1. ユーティリティ関数（URLパターン）
  // ========================================
  // → @/content/url-pattern に移動

  type ContentTestHooks = {
    patternToRegex?: (pattern: string) => RegExp;
    matchesAnyPattern?: (patterns: string[]) => boolean;
    parseNumericValue?: (text: string) => number;
  };

  const testHooks = (
    globalThis as unknown as { __MBU_TEST_HOOKS__?: ContentTestHooks }
  ).__MBU_TEST_HOOKS__;
  if (testHooks) {
    testHooks.patternToRegex = patternToRegex;
    testHooks.matchesAnyPattern = matchesAnyPattern;
    testHooks.parseNumericValue = parseNumericValue;
  }

  // 2回目以降の初期化では副作用を追加しない（idempotent）
  if (globalState.initialized) {
    return;
  }
  globalState.initialized = true;
  refreshThemeFromStorage().catch(() => {
    // no-op
  });

  // ========================================
  // 2. テーブルソート機能（モジュール化済み）
  // ========================================

  function getCurrentPatternRowFilterSetting(): Result.Result<boolean, string> {
    return getPatternRowFilterSetting(
      tableConfig.domainPatternConfigs,
      window.location.href
    );
  }

  function _sortTable(table: HTMLTableElement, columnIndex: number): void {
    sortTableCore(table, columnIndex, getCurrentPatternRowFilterSetting);
  }

  function enableTableSortWithNotification(): void {
    enableTableSort(
      (message: string) => showNotification(message),
      getCurrentPatternRowFilterSetting
    );
  }

  function startTableObserverWithNotification(): void {
    startTableObserver(
      (message: string) => showNotification(message),
      getCurrentPatternRowFilterSetting
    );
  }

  window.addEventListener("pagehide", stopTableObserver);

  // ========================================
  // 4. 通知・クリップボード（モジュール化済み）
  // ========================================

  function getOrCreateToastMount(): ToastMount {
    if (globalState.toastMount?.host.isConnected) {
      return globalState.toastMount;
    }
    const mount = ensureToastMount(currentTheme);
    globalState.toastMount = mount;
    return mount;
  }

  function showNotification(message: string): void {
    const mount = getOrCreateToastMount();
    showNotificationCore(mount.notify, message);
  }

  // ========================================
  // 5. 選択範囲キャッシュ（モジュール化済み）
  // ========================================

  document.addEventListener("mouseup", () => {
    const selectedText = window.getSelection()?.toString().trim() ?? "";
    if (selectedText) {
      storageLocalSet({
        selectedText,
        selectedTextUpdatedAt: Date.now(),
      })
        .then(() => {
          // no-op
        })
        .catch(() => {
          // no-op
        });
    }
  });

  // ========================================
  // 6. Overlay (React + Shadow DOM)（モジュール化済み）
  // ========================================

  function getOrCreateOverlayMount(): OverlayMount {
    if (globalState.overlayMount?.host.isConnected) {
      return globalState.overlayMount;
    }
    const mount = ensureOverlayMount(currentTheme);
    globalState.overlayMount = mount;
    return mount;
  }

  function handleCloseOverlay(): void {
    closeOverlay(globalState.overlayMount);
    globalState.overlayMount = null;
  }

  function showActionOverlay(request: ActionOverlayRequest): void {
    const mount = getOrCreateOverlayMount();
    showActionOverlayCore(mount, request, handleCloseOverlay);
  }

  function showSummaryOverlay(request: SummaryOverlayRequest): void {
    const mount = getOrCreateOverlayMount();
    showSummaryOverlayCore(mount, request, handleCloseOverlay);
  }

  // ========================================
  // 6.5. Template Paste Helpers
  // ========================================

  /**
   * input/textarea要素にテキストを挿入
   */
  function pasteToInputElement(
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
  function pasteToContentEditable(element: HTMLElement, content: string): void {
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
  async function copyToClipboardFallback(
    content: string,
    sendResponse: (response: { ok: boolean; error?: string }) => void
  ): Promise<void> {
    const mount = getOrCreateToastMount();
    const result = await copyToClipboardWithNotification(
      content,
      mount.notify,
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

  // ========================================
  // 7. メッセージリスナー
  // ========================================

  chrome.runtime.onMessage.addListener(
    (
      request: ContentRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse
    ) => {
      switch (request.action) {
        case "enableTableSort": {
          enableTableSortWithNotification();
          startTableObserverWithNotification();
          sendResponse({ success: true });
          return;
        }
        case "showNotification": {
          showNotification(request.message);
          sendResponse({ ok: true });
          return;
        }
        case "copyToClipboard": {
          (async () => {
            const mount = getOrCreateToastMount();
            const result = await copyToClipboardWithNotification(
              request.text,
              mount.notify,
              request.successMessage
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
        case "pasteTemplate": {
          (async () => {
            const activeElement = document.activeElement;

            // input/textarea要素への挿入
            if (
              activeElement &&
              (activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement)
            ) {
              pasteToInputElement(activeElement, request.content);
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
                pasteToContentEditable(activeElement, request.content);
                sendResponse({ ok: true });
                return;
              } catch {
                // Selection API失敗時はクリップボードにフォールバック
                await copyToClipboardFallback(request.content, sendResponse);
                return;
              }
            }

            // フォーカスがない場合はクリップボードにコピー
            await copyToClipboardFallback(request.content, sendResponse);
          })().catch(() => {
            sendResponse({
              ok: false,
              error: "テンプレートの貼り付けに失敗しました",
            });
          });
          return true;
        }
        case "getSummaryTargetText": {
          (async () => {
            try {
              const target = await getSummaryTargetText({
                ignoreSelection: request.ignoreSelection,
              });
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
        case "showSummaryOverlay": {
          showSummaryOverlay(request);
          sendResponse({ ok: true });
          return;
        }
        case "showActionOverlay": {
          showActionOverlay(request);
          sendResponse({ ok: true });
          return;
        }
        default: {
          sendResponse({ ok: false });
          return;
        }
      }
    }
  );

  // ========================================
  // 8. 自動実行ロジック（SPA URL変化も含む）
  // ========================================

  let tableConfig: {
    domainPatternConfigs: DomainPatternConfig[];
  } = {
    domainPatternConfigs: [],
  };

  function maybeEnableTableSortFromConfig(): void {
    if (tableConfig.domainPatternConfigs.length > 0) {
      const patterns = tableConfig.domainPatternConfigs.map(
        (config) => config.pattern
      );
      if (matchesAnyPattern(patterns, window.location.href)) {
        enableTableSortWithNotification();
        startTableObserverWithNotification();
      }
    }
  }

  async function refreshTableConfigAndUpdate(): Promise<void> {
    const configs = await refreshTableConfig();
    tableConfig = { domainPatternConfigs: configs };
  }

  async function refreshTableConfigAndMaybeEnable(): Promise<void> {
    await refreshTableConfigAndUpdate();
    maybeEnableTableSortFromConfig();
  }

  function handleSyncStorageChange(
    changes: Record<string, chrome.storage.StorageChange>
  ): void {
    if ("contextActions" in changes) {
      resetSummarizeOverlayTitleState();
    }

    const hasTableConfigChange =
      "domainPatternConfigs" in changes || "domainPatterns" in changes;
    if (!hasTableConfigChange) {
      return;
    }

    refreshTableConfigAndMaybeEnable().catch(() => {
      // no-op
    });
  }

  function handleLocalStorageChange(
    changes: Record<string, chrome.storage.StorageChange>
  ): void {
    if (!("theme" in changes)) {
      return;
    }
    const change = changes.theme as chrome.storage.StorageChange | undefined;
    currentTheme = normalizeTheme(change?.newValue);
    applyThemeToMounts(currentTheme);
  }

  refreshTableConfigAndMaybeEnable().catch(() => {
    // no-op
  });

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync") {
        handleSyncStorageChange(changes);
        return;
      }

      if (areaName === "local") {
        handleLocalStorageChange(changes);
      }
    });
  }

  let lastHref = window.location.href;
  window.setInterval(() => {
    const href = window.location.href;
    if (href === lastHref) {
      return;
    }
    lastHref = href;
    maybeEnableTableSortFromConfig();
  }, 1000);
})();
