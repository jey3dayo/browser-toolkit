import type { Result } from "@praha/byethrow";
import { t } from "@/i18n";
import { enableSingleTable } from "./table-sort";

export function observeTables(
  onNotify: (message: string) => void,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): () => void {
  let debounceTimer: number | undefined;

  const handleMutations = (): void => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      enableNewTables(onNotify, getRowFilterSetting);
    }, 300);
  };

  const tableObserver = new MutationObserver(handleMutations);

  tableObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    tableObserver.disconnect();
    window.clearTimeout(debounceTimer);
  };
}

function enableNewTables(
  onNotify: (message: string) => void,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): void {
  const tables = document.querySelectorAll<HTMLTableElement>(
    "table:not([data-sortable])"
  );

  if (tables.length > 0) {
    for (const table of tables) {
      enableSingleTable(table, getRowFilterSetting);
    }

    onNotify(t("tableSort.newTablesEnabledCount", { count: tables.length }));
  }
}
