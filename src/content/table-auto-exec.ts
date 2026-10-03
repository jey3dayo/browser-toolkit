// テーブル自動実行ロジック（SPA URL変化も含む）

import { refreshTableConfig } from "@/content/config";
import { observeTables } from "@/content/table-observer";
import { enableTableSort } from "@/content/table-sort";
import {
  type DomainPatternConfig,
  getCurrentPatternRowFilterSetting as getCurrentPatternRowFilterSettingFromConfig,
} from "@/domain-pattern-configs";
import { matchesAnyPattern } from "@/utils/url-pattern";

export type TableAutoExecDeps = {
  showNotification: (message: string) => void;
  onContextActionsChange: () => Promise<void>;
};

export type TableAutoExecResult = {
  enable: () => void;
};

export function setupTableAutoExec(
  deps: TableAutoExecDeps
): TableAutoExecResult {
  let tableConfig: DomainPatternConfig[] = [];
  let stopObserving: (() => void) | undefined;

  function getCurrentPatternRowFilterSetting() {
    return getCurrentPatternRowFilterSettingFromConfig(
      tableConfig,
      window.location.href
    );
  }

  // 手動実行はURL設定に関係なく有効化する。
  function enable(): void {
    enableTableSort(deps.showNotification, getCurrentPatternRowFilterSetting);
    stopObserving ??= observeTables(
      deps.showNotification,
      getCurrentPatternRowFilterSetting
    );
  }

  function stop(): void {
    stopObserving?.();
    stopObserving = undefined;
  }

  function maybeEnableTableSortFromConfig(): void {
    if (tableConfig.length > 0) {
      const patterns = tableConfig.map((c) => c.pattern);
      if (matchesAnyPattern(patterns, window.location.href)) {
        enable();
      }
    }
  }

  async function refreshTableConfigAndMaybeEnable(): Promise<void> {
    tableConfig = await refreshTableConfig();
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

  refreshTableConfigAndMaybeEnable().catch(() => {
    // no-op
  });

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync") {
        handleSyncStorageChange(changes);
      }
    });
  }

  // タブが非アクティブ時にMutationObserverを停止し、メモリとCPUを節約
  // アクティブ時は再開（既存テーブルの処理も含む）
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      // 最新の設定を再取得してから判定（タイミング問題を回避）
      refreshTableConfig()
        .then((configs) => {
          tableConfig = configs;
          // 非同期処理中にタブが再び非表示になった場合は処理をスキップ（競合状態を回避）
          if (document.hidden) {
            return;
          }
          maybeEnableTableSortFromConfig();
        })
        .catch(() => {
          // 設定読み込み失敗時は何もしない（エラーログは不要）
        });
    }
  });

  window.addEventListener("pagehide", stop);

  let lastHref = window.location.href;
  window.setInterval(() => {
    const { href } = window.location;
    if (href === lastHref) {
      return;
    }
    lastHref = href;
    maybeEnableTableSortFromConfig();
  }, 1000);

  return { enable };
}
