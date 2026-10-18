import { createLazyLoader } from "@/content/lazy-loader";
import {
  createMessageListener,
  type MessageHandlerDeps,
} from "@/content/message-handlers";
import type { ToastMount } from "@/content/notification";
import type { OverlayMount } from "@/content/overlay-helpers";
import { buildDiagnosticsResponse } from "@/content/search-blocklist-ui/diagnostics";
import { setupSelectionCache } from "@/content/selection-cache";
import { setupTableAutoExec } from "@/content/table-auto-exec";
import { createThemeManager } from "@/content/theme-manager";
import type { GlobalContentState } from "@/content/types";
import type {
  ActionOverlayRequest,
  SearchBlocklistDiagnosticsResponse,
  SummaryOverlayRequest,
} from "@/content-script-messages";
import { ignoreRejection } from "@/utils/ignore_rejection";
import { parseNumericValue } from "@/utils/number_parser";
import { matchesAnyPattern, patternToRegex } from "@/utils/url-pattern";

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
  type SearchBlocklistUiModule = typeof import("./content/search-blocklist-ui");

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
  const loadSearchBlocklistUiModule = createLazyLoader<SearchBlocklistUiModule>(
    () => import("./content/search-blocklist-ui")
  );

  const themeManager = createThemeManager(globalState);

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

  if (globalState.initialized) {
    return;
  }
  globalState.initialized = true;

  // ここから下は content script の再注入時に実行されない。
  // 再注入ごとにリスナやタイマーを増やさないため、副作用の登録はすべてこの
  // ガードより後ろに置く（plan 009 の preload gating を含む）。

  // overlay/toastのpreloadは最初のユーザー操作をトリガーに行う（HTMLドキュメントのみ）
  function preloadInteractiveModules(): void {
    if (!supportsHtmlDocument) {
      return;
    }
    ignoreRejection(
      loadNotificationModule(),
      "content: preload notification module"
    );
    ignoreRejection(loadOverlayModule(), "content: preload overlay module");
  }

  if (supportsHtmlDocument) {
    document.addEventListener("pointerdown", preloadInteractiveModules, {
      once: true,
      passive: true,
    });
  }

  ignoreRejection(
    themeManager.refreshThemeFromStorage(),
    "content: refresh theme from storage"
  );
  themeManager.setupStorageListener();

  function bootstrapSearchBlocklistUi(): void {
    if (!supportsHtmlDocument) {
      return;
    }
    const blocklistState = globalThis.__MBU_BLOCKLIST_STATE__;
    if (!blocklistState) {
      return;
    }
    ignoreRejection(
      loadSearchBlocklistUiModule().then((module) =>
        module?.startSearchBlocklistUi(blocklistState)
      ),
      "content: bootstrap search blocklist UI"
    );
  }

  bootstrapSearchBlocklistUi();

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
    ignoreRejection(
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
      })(),
      "content: show notification"
    );
  }

  setupSelectionCache();

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
    ignoreRejection(
      (async () => {
        const module = await loadOverlayModule();
        if (!module) {
          return;
        }
        module.closeOverlay(globalState.overlayMount);
        globalState.overlayMount = null;
      })(),
      "content: close overlay"
    );
  }

  let overlayRequestSeq = 0;

  function showActionOverlay(request: ActionOverlayRequest): void {
    overlayRequestSeq += 1;
    const requestId = overlayRequestSeq;
    const requestStartedAt = performance.now();
    ignoreRejection(
      (async () => {
        const module = await loadOverlayModule();
        if (!module) {
          return;
        }
        const mount = await getOrCreateOverlayMount();
        if (!mount) {
          return;
        }
        module.showActionOverlay(
          mount,
          request,
          requestId,
          requestStartedAt,
          handleCloseOverlay
        );
      })(),
      "content: show action overlay"
    );
  }

  function showSummaryOverlay(request: SummaryOverlayRequest): void {
    overlayRequestSeq += 1;
    const requestId = overlayRequestSeq;
    const requestStartedAt = performance.now();
    ignoreRejection(
      (async () => {
        const module = await loadOverlayModule();
        if (!module) {
          return;
        }
        const mount = await getOrCreateOverlayMount();
        if (!mount) {
          return;
        }
        module.showSummaryOverlay(
          mount,
          request,
          requestId,
          requestStartedAt,
          handleCloseOverlay
        );
      })(),
      "content: show summary overlay"
    );
  }

  function getSearchBlocklistDiagnostics(): SearchBlocklistDiagnosticsResponse {
    const blocklistState = globalThis.__MBU_BLOCKLIST_STATE__;
    return buildDiagnosticsResponse(blocklistState?.getSnapshot() ?? null);
  }

  function showQrCodeOverlay(url: string): void {
    ignoreRejection(
      (async () => {
        if (!supportsHtmlDocument) {
          return;
        }
        const module = await loadQrCodeOverlayModule();
        if (!module) {
          return;
        }
        module.showQrCodeOverlay(url, themeManager.getCurrentTheme());
      })(),
      "content: show QR code overlay"
    );
  }

  const tableSort = setupTableAutoExec({
    onContextActionsChange: async () => {
      const module = await loadOverlayModule();
      if (module) {
        module.resetSummarizeOverlayTitleState();
      }
    },
    showNotification,
  });

  const messageHandlerDeps: MessageHandlerDeps = {
    enableTableSort: tableSort.enable,
    getOrCreateToastMount,
    getSearchBlocklistDiagnostics,
    showActionOverlay,
    showNotification,
    showQrCodeOverlay,
    showSummaryOverlay,
  };

  chrome.runtime.onMessage.addListener(
    createMessageListener(messageHandlerDeps)
  );
})();
