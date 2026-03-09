// テーブル自動実行ロジック（SPA URL変化も含む）
import {
  getCurrentPatternRowFilterSetting as getCurrentPatternRowFilterSettingFromConfig,
  refreshTableConfig,
} from "@/content/config";
import {
  startTableObserver,
  stopTableObserver,
} from "@/content/table-observer";
import { enableTableSort } from "@/content/table-sort";
import { matchesAnyPattern } from "@/content/url-pattern";
import type { DomainPatternConfig } from "@/popup/runtime";

export type TableAutoExecDeps = {
  showNotification: (message: string) => void;
  onContextActionsChange: () => Promise<void>;
  handleThemeChange: (newValue: unknown) => void;
};

export type TableAutoExecResult = {
  enableTableSortWithNotification: () => void;
  startTableObserverWithNotification: () => void;
};

export function setupTableAutoExec(
  deps: TableAutoExecDeps
): TableAutoExecResult {
  let tableConfig: { domainPatternConfigs: DomainPatternConfig[] } = {
    domainPatternConfigs: [],
  };

  function getCurrentPatternRowFilterSetting() {
    return getCurrentPatternRowFilterSettingFromConfig(
      tableConfig.domainPatternConfigs,
      window.location.href
    );
  }

  function enableTableSortWithNotification(): void {
    enableTableSort(
      (message: string) => deps.showNotification(message),
      getCurrentPatternRowFilterSetting
    );
  }

  function startTableObserverWithNotification(): void {
    startTableObserver(
      (message: string) => deps.showNotification(message),
      getCurrentPatternRowFilterSetting
    );
  }

  function maybeEnableTableSortFromConfig(): void {
    if (tableConfig.domainPatternConfigs.length > 0) {
      const patterns = tableConfig.domainPatternConfigs.map((c) => c.pattern);
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
      deps.onContextActionsChange().catch(() => {
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
    deps.handleThemeChange(change?.newValue);
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

  let lastHref = window.location.href;
  window.setInterval(() => {
    const href = window.location.href;
    if (href === lastHref) {
      return;
    }
    lastHref = href;
    maybeEnableTableSortFromConfig();
  }, 1000);

  return {
    enableTableSortWithNotification,
    startTableObserverWithNotification,
  };
}
