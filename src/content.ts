// Content Script - Webページに注入される

import { Result } from "@praha/byethrow";
import type { DomainPatternConfig } from "@/popup/runtime";
import type { ExtractedEvent, SummarySource } from "@/shared_types";
import { storageLocalGet, storageLocalSet } from "@/storage/helpers";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import {
  matchesAnyPattern,
  patternToRegex,
} from "@/content/url-pattern";
import { parseNumericValue } from "@/utils/number_parser";
import {
  enableTableSort,
  sortTable as sortTableCore,
} from "@/content/table-sort";
import {
  startTableObserver,
  stopTableObserver,
} from "@/content/table-observer";
import {
  ensureToastMount,
  showNotification as showNotificationCore,
  type ToastMount,
} from "@/content/notification";
import {
  copyToClipboardWithNotification,
  getClipboardErrorMessage,
} from "@/content/clipboard";
import {
  getSummaryTargetText,
  type SummaryTarget,
} from "@/content/summary-target";
import {
  getCurrentPatternRowFilterSetting as getPatternRowFilterSetting,
  refreshTableConfig,
} from "@/content/config";
import {
  ensureOverlayMount,
  closeOverlay,
  showActionOverlay as showActionOverlayCore,
  showSummaryOverlay as showSummaryOverlayCore,
  resetSummarizeOverlayTitleState,
  type OverlayMount,
  type ActionOverlayRequest,
  type SummaryOverlayRequest,
} from "@/content/overlay-helpers";

(() => {

  type ContentRequest =
    | { action: "enableTableSort" }
    | { action: "showNotification"; message: string }
    | { action: "copyToClipboard"; text: string; successMessage?: string }
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

  function sortTable(table: HTMLTableElement, columnIndex: number): void {
    sortTableCore(table, columnIndex, getCurrentPatternRowFilterSetting);
  }

  function enableTableSortWithNotification(): void {
    enableTableSort((message: string) => showNotification(message));
  }

  function startTableObserverWithNotification(): void {
    startTableObserver((message: string) => showNotification(message));
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
