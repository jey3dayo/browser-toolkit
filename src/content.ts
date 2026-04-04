// Content Script - Webページに注入される

import { createLazyLoader } from "@/content/lazy-loader";
import {
  createMessageListener,
  type MessageHandlerDeps,
} from "@/content/message-handlers";
import type { ToastMount } from "@/content/notification";
import type { OverlayMount } from "@/content/overlay-helpers";
import { setupTableAutoExec } from "@/content/table-auto-exec";
import { stopTableObserver } from "@/content/table-observer";
import { createThemeManager } from "@/content/theme-manager";
import type { GlobalContentState } from "@/content/types";
import { matchesAnyPattern, patternToRegex } from "@/content/url-pattern";
import type {
  ActionOverlayRequest,
  SummaryOverlayRequest,
} from "@/content-script-messages";
import { storageLocalSet } from "@/storage/helpers";
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
  type QrCodeOverlayModule = typeof import("./content/qrcode-overlay");

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

  const loadNotificationModule = createLazyLoader<NotificationModule>(
    () => import("./content/notification")
  );
  const loadOverlayModule = createLazyLoader<OverlayModule>(
    () => import("./content/overlay-helpers")
  );
  const loadQrCodeOverlayModule = createLazyLoader<QrCodeOverlayModule>(
    () => import("./content/qrcode-overlay")
  );

  const themeManager = createThemeManager(globalState);

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
  themeManager.refreshThemeFromStorage().catch(() => {
    // no-op
  });
  themeManager.setupStorageListener();

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
    const mount = module.ensureToastMount(themeManager.getCurrentTheme());
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
    const mount = module.ensureOverlayMount(themeManager.getCurrentTheme());
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

  function showQrCodeOverlay(url: string): void {
    (async () => {
      if (!supportsHtmlDocument) {
        return;
      }
      const module = await loadQrCodeOverlayModule();
      if (!module) {
        return;
      }
      module.showQrCodeOverlay(url, themeManager.getCurrentTheme());
    })().catch(() => {
      // no-op
    });
  }

  // ========================================
  // 7. 自動実行ロジック（SPA URL変化も含む）
  // ========================================

  const {
    enableTableSortWithNotification,
    startTableObserverWithNotification,
  } = setupTableAutoExec({
    showNotification,
    onContextActionsChange: async () => {
      const module = await loadOverlayModule();
      if (module) {
        module.resetSummarizeOverlayTitleState();
      }
    },
  });

  window.addEventListener("pagehide", stopTableObserver);

  // ========================================
  // 8. メッセージリスナー
  // ========================================

  const messageHandlerDeps: MessageHandlerDeps = {
    enableTableSortWithNotification,
    startTableObserverWithNotification,
    showNotification,
    getOrCreateToastMount,
    showActionOverlay,
    showSummaryOverlay,
    showQrCodeOverlay,
  };

  chrome.runtime.onMessage.addListener(
    createMessageListener(messageHandlerDeps)
  );
})();
