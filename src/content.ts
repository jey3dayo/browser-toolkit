// Content Script - Webページに注入される

import { Result } from "@praha/byethrow";
import {
  getCurrentPatternRowFilterSetting as getPatternRowFilterSetting,
  refreshTableConfig,
} from "@/content/config";
import {
  createMessageListener,
  type MessageHandlerDeps,
} from "@/content/message-handlers";
import type { ToastMount } from "@/content/notification";
import type {
  ActionOverlayRequest,
  OverlayMount,
  SummaryOverlayRequest,
} from "@/content/overlay-helpers";
import {
  startTableObserver,
  stopTableObserver,
} from "@/content/table-observer";
import { enableTableSort } from "@/content/table-sort";
import { matchesAnyPattern, patternToRegex } from "@/content/url-pattern";
import type { DomainPatternConfig } from "@/popup/runtime";
import { storageLocalGet, storageLocalSet } from "@/storage/helpers";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import { parseNumericValue } from "@/utils/number_parser";

(() => {
  const supportsHtmlDocument = (() => {
    if (typeof document === "undefined") {
      return false;
    }
    const doc = document;
    const rootTag = doc.documentElement?.tagName?.toLowerCase();
    if (rootTag && rootTag !== "html") {
      return false;
    }
    const contentType = doc.contentType?.toLowerCase() ?? "";
    if (
      contentType &&
      contentType !== "text/html" &&
      contentType !== "application/xhtml+xml"
    ) {
      return false;
    }
    try {
      return Boolean(doc.createElement("div").style);
    } catch {
      return false;
    }
  })();

  type NotificationModule = typeof import("./content/notification");
  type OverlayModule = typeof import("./content/overlay-helpers");

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
  let notificationModule: NotificationModule | null = null;
  let notificationModulePromise: Promise<NotificationModule> | null = null;
  let overlayModule: OverlayModule | null = null;
  let overlayModulePromise: Promise<OverlayModule> | null = null;

  function unwrapModule<T>(module: T | { default: T }): T {
    if (module && typeof module === "object" && "default" in module) {
      return (module as { default: T }).default;
    }
    return module as T;
  }

  async function loadNotificationModule(): Promise<NotificationModule | null> {
    if (notificationModule) {
      return notificationModule;
    }
    if (!notificationModulePromise) {
      notificationModulePromise = import("./content/notification");
    }
    try {
      notificationModule = unwrapModule(await notificationModulePromise);
      return notificationModule;
    } catch (_error) {
      notificationModulePromise = null;
      return null;
    }
  }

  async function loadOverlayModule(): Promise<OverlayModule | null> {
    if (overlayModule) {
      return overlayModule;
    }
    if (!overlayModulePromise) {
      overlayModulePromise = import("./content/overlay-helpers");
    }
    try {
      overlayModule = unwrapModule(await overlayModulePromise);
      return overlayModule;
    } catch (_error) {
      overlayModulePromise = null;
      return null;
    }
  }

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
  // overlay/toastのpreloadはHTMLドキュメントでのみ実行
  if (supportsHtmlDocument) {
    loadNotificationModule().catch(() => {
      // no-op
    });
    loadOverlayModule().catch(() => {
      // no-op
    });
  }

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

  // タブが非アクティブ時にMutationObserverを停止し、メモリとCPUを節約
  // アクティブ時は再開（既存テーブルの処理も含む）
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopTableObserver();
    } else {
      // 最新の設定を再取得してタイミング問題を回避（非同期初期化対応）
      refreshTableConfig()
        .then(() => {
          // 非同期処理中にタブが再び非表示になった場合は処理をスキップ（競合状態を回避）
          if (document.hidden) {
            return;
          }
          if (tableConfig.domainPatternConfigs.length > 0) {
            const shouldObserve = matchesAnyPattern(
              tableConfig.domainPatternConfigs.map((c) => c.pattern)
            );
            if (shouldObserve) {
              // タブ非アクティブ中に挿入された既存テーブルを処理
              enableTableSortWithNotification();
              // 新しいテーブルの監視を開始
              startTableObserverWithNotification();
            }
          }
        })
        .catch(() => {
          // 設定読み込み失敗時は何もしない（エラーログは不要）
        });
    }
  });

  // ========================================
  // 4. 通知・クリップボード（モジュール化済み）
  // ========================================

  async function getOrCreateToastMount(): Promise<ToastMount | null> {
    if (!supportsHtmlDocument) {
      return null;
    }
    const module = await loadNotificationModule();
    if (!module) {
      return null;
    }
    if (globalState.toastMount?.host.isConnected) {
      return globalState.toastMount;
    }
    const mount = module.ensureToastMount(currentTheme);
    globalState.toastMount = mount;
    return mount;
  }

  function showNotification(message: string): void {
    (async () => {
      const module = await loadNotificationModule();
      if (!module) {
        return;
      }
      const mount = await getOrCreateToastMount();
      if (!mount) {
        return;
      }
      module.showNotification(mount.notify, message);
    })().catch(() => {
      // no-op
    });
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

  async function getOrCreateOverlayMount(): Promise<OverlayMount | null> {
    if (!supportsHtmlDocument) {
      return null;
    }
    const module = await loadOverlayModule();
    if (!module) {
      return null;
    }
    if (globalState.overlayMount?.host.isConnected) {
      return globalState.overlayMount;
    }
    const mount = module.ensureOverlayMount(currentTheme);
    globalState.overlayMount = mount;
    return mount;
  }

  function handleCloseOverlay(): void {
    (async () => {
      const module = await loadOverlayModule();
      if (!module) {
        return;
      }
      module.closeOverlay(globalState.overlayMount);
      globalState.overlayMount = null;
    })().catch(() => {
      // no-op
    });
  }

  function showActionOverlay(request: ActionOverlayRequest): void {
    (async () => {
      const module = await loadOverlayModule();
      if (!module) {
        return;
      }
      const mount = await getOrCreateOverlayMount();
      if (!mount) {
        return;
      }
      module.showActionOverlay(mount, request, handleCloseOverlay);
    })().catch(() => {
      // no-op
    });
  }

  function showSummaryOverlay(request: SummaryOverlayRequest): void {
    (async () => {
      const module = await loadOverlayModule();
      if (!module) {
        return;
      }
      const mount = await getOrCreateOverlayMount();
      if (!mount) {
        return;
      }
      module.showSummaryOverlay(mount, request, handleCloseOverlay);
    })().catch(() => {
      // no-op
    });
  }

  // ========================================
  // 6.5. Template Paste Helpers (移動済み)
  // ========================================
  // → @/content/template-paste に移動

  // ========================================
  // 7. メッセージリスナー
  // ========================================

  const messageHandlerDeps: MessageHandlerDeps = {
    enableTableSortWithNotification,
    startTableObserverWithNotification,
    showNotification,
    getOrCreateToastMount,
    showActionOverlay,
    showSummaryOverlay,
  };

  chrome.runtime.onMessage.addListener(
    createMessageListener(messageHandlerDeps)
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
      (async () => {
        const module = await loadOverlayModule();
        if (!module) {
          return;
        }
        module.resetSummarizeOverlayTitleState();
      })().catch(() => {
        // no-op
      });
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
