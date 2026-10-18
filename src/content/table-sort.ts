import { Result } from "@praha/byethrow";
import { t } from "@/i18n";
import { parseNumericValue } from "@/utils/number_parser";
import { shouldHideRow } from "@/utils/row_filter";

const ROW_HIDDEN_BY_EXTENSION_DATASET_KEY = "mbuHiddenByExtension";

function updateHeaderSortState(
  headers: readonly HTMLTableCellElement[],
  activeHeader: HTMLTableCellElement,
  isAscending: boolean
): void {
  const activeSortDirection = isAscending ? "ascending" : "descending";
  for (const header of headers) {
    header.setAttribute(
      "aria-sort",
      header === activeHeader ? activeSortDirection : "none"
    );
  }
}

export function enableSingleTable(
  table: HTMLTableElement,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): void {
  if (table.dataset.sortable) {
    return;
  }

  table.dataset.sortable = "true";
  // th closest table === table で、ネストした table の th を外側テーブルの
  // ヘッダー列挙から除外する（外側由来の誤ソート/listener 二重付与の防止）
  const headers = Array.from(
    table.querySelectorAll<HTMLTableCellElement>("th")
  ).filter((header) => header.closest("table") === table);

  for (const header of headers) {
    const columnIndex = header.cellIndex;
    Object.assign(header.style, {
      cursor: "pointer",
      userSelect: "none",
    });
    header.tabIndex = 0;
    header.setAttribute("aria-sort", "none");
    header.title = t("tableSort.headerTitle");

    const sortByHeader = (): void => {
      const isAscending = sortTable(table, columnIndex, getRowFilterSetting);
      updateHeaderSortState(headers, header, isAscending);
    };

    header.addEventListener("click", sortByHeader);
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      sortByHeader();
    });
  }
}

export function enableTableSort(
  onNotify: (message: string) => void,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): number {
  const tables = document.querySelectorAll<HTMLTableElement>("table");

  for (const table of tables) {
    enableSingleTable(table, getRowFilterSetting);
  }

  if (tables.length > 0) {
    onNotify(t("tableSort.enabledCount", { count: tables.length }));
  }

  return tables.length;
}

function resetHiddenRows(rows: HTMLTableRowElement[]): void {
  for (const row of rows) {
    if (row.dataset[ROW_HIDDEN_BY_EXTENSION_DATASET_KEY] !== "true") {
      continue;
    }
    row.style.display = "";
    delete row.dataset[ROW_HIDDEN_BY_EXTENSION_DATASET_KEY];
  }
}

function sortRows(
  rows: HTMLTableRowElement[],
  columnIndex: number,
  isAscending: boolean
): void {
  const keyed = rows.map((row) => {
    const text = row.cells[columnIndex]?.textContent?.trim() ?? "";
    return { num: parseNumericValue(text), row, text };
  });

  keyed.sort((a, b) => {
    if (!(Number.isNaN(a.num) || Number.isNaN(b.num))) {
      return isAscending ? a.num - b.num : b.num - a.num;
    }

    return isAscending
      ? a.text.localeCompare(b.text, "ja")
      : b.text.localeCompare(a.text, "ja");
  });

  rows.splice(0, rows.length, ...keyed.map((entry) => entry.row));
}

function applyRowFilterIfEnabled(params: {
  rows: HTMLTableRowElement[];
  columnIndex: number;
  getRowFilterSetting?: () => Result.Result<boolean, string>;
}): void {
  if (!params.getRowFilterSetting) {
    return;
  }

  const filterSettingResult = params.getRowFilterSetting();
  if (Result.isSuccess(filterSettingResult)) {
    applyRowFiltering(
      params.rows,
      params.columnIndex,
      filterSettingResult.value
    );
  }
}

function sortTable(
  table: HTMLTableElement,
  columnIndex: number,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): boolean {
  const tbody = table.querySelector("tbody") as HTMLTableSectionElement | null;
  const targetBody = tbody ?? table;
  const rows = Array.from(
    targetBody.querySelectorAll<HTMLTableRowElement>("tr")
  ).filter((row) => row.parentNode === targetBody);

  const isAscending = table.dataset.sortOrder !== "asc";
  table.dataset.sortOrder = isAscending ? "asc" : "desc";

  resetHiddenRows(rows);

  sortRows(rows, columnIndex, isAscending);

  for (const row of rows) {
    targetBody.appendChild(row);
  }

  applyRowFilterIfEnabled({ columnIndex, getRowFilterSetting, rows });

  return isAscending;
}

function applyRowFiltering(
  rows: HTMLTableRowElement[],
  columnIndex: number,
  enableRowFilter: boolean
): void {
  if (!enableRowFilter) {
    return;
  }

  for (const row of rows) {
    const cell = row.cells[columnIndex];
    if (!cell) {
      continue;
    }

    const cellText = cell.textContent?.trim() ?? "";
    if (shouldHideRow(cellText, parseNumericValue)) {
      if (
        row.dataset[ROW_HIDDEN_BY_EXTENSION_DATASET_KEY] !== "true" &&
        row.style.display !== "none"
      ) {
        row.dataset[ROW_HIDDEN_BY_EXTENSION_DATASET_KEY] = "true";
      }
      row.style.display = "none";
    }
  }
}
