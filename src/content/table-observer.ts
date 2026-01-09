// MutationObserver - 動的テーブル検出
import { enableSingleTable } from "./table-sort";

let tableObserver: MutationObserver | null = null;

/**
 * 動的に追加されるテーブルを監視開始
 * @param onNotify - 通知コールバック
 */
export function startTableObserver(onNotify: (message: string) => void): void {
  if (tableObserver) {
    return;
  }

  let debounceTimer: number | undefined;

  const handleMutations = (): void => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      checkForNewTables(onNotify);
    }, 300);
  };

  tableObserver = new MutationObserver(handleMutations);

  tableObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 新しいテーブルをチェックして有効化
 * @param onNotify - 通知コールバック
 */
export function checkForNewTables(onNotify: (message: string) => void): void {
  const tables = document.querySelectorAll<HTMLTableElement>(
    "table:not([data-sortable])"
  );

  if (tables.length > 0) {
    for (const table of tables) {
      enableSingleTable(table);
    }

    onNotify(`${tables.length}個の新しいテーブルでソートを有効化しました`);
  }
}

/**
 * MutationObserverを停止
 */
export function stopTableObserver(): void {
  if (tableObserver) {
    tableObserver.disconnect();
    tableObserver = null;
  }
}
