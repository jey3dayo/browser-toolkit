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
    const hasTableConfigChange =
      "domainPatternConfigs" in changes || "domainPatterns" in changes;
    if (!hasTableConfigChange) {
      return;
    }

    refreshTableConfigAndMaybeEnable().catch(() => {});
  }

  refreshTableConfigAndMaybeEnable().catch(() => {});

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync") {
        handleSyncStorageChange(changes);
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      refreshTableConfig()
        .then((configs) => {
          tableConfig = configs;
          if (document.hidden) {
            return;
          }
          maybeEnableTableSortFromConfig();
        })
        .catch(() => {});
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
