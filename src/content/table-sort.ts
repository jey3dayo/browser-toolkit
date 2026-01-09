// テーブルソート機能
import { Result } from "@praha/byethrow";
import { parseNumericValue } from "@/utils/number_parser";
import { shouldHideRow } from "@/utils/row_filter";

const ROW_HIDDEN_BY_EXTENSION_DATASET_KEY = "mbuHiddenByExtension";

/**
 * 単一テーブルにソート機能を有効化
 * @param table - 対象テーブル
 * @param getRowFilterSetting - 行フィルタリング設定取得関数
 */
export function enableSingleTable(
  table: HTMLTableElement,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): void {
  if (table.dataset.sortable) {
    return;
  }

  table.dataset.sortable = "true";
  const headers = table.querySelectorAll<HTMLTableCellElement>("th");

  let headerIndex = 0;
  for (const header of headers) {
    const columnIndex = headerIndex;
    header.style.cursor = "pointer";
    header.style.userSelect = "none";
    header.title = "クリックでソート";

    header.addEventListener("click", () => {
      sortTable(table, columnIndex, getRowFilterSetting);
    });
    headerIndex += 1;
  }
}

/**
 * ページ内の全テーブルにソート機能を有効化
 * @param onNotify - 通知コールバック
 * @param getRowFilterSetting - 行フィルタリング設定取得関数
 * @returns 有効化したテーブル数
 */
export function enableTableSort(
  onNotify: (message: string) => void,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): number {
  const tables = document.querySelectorAll<HTMLTableElement>("table");

  for (const table of tables) {
    enableSingleTable(table, getRowFilterSetting);
  }

  if (tables.length > 0) {
    onNotify(`${tables.length}個のテーブルでソートを有効化しました`);
  }

  return tables.length;
}

/**
 * テーブルをソート
 * @param table - 対象テーブル
 * @param columnIndex - ソート対象の列インデックス
 * @param getRowFilterSetting - 行フィルタリング設定取得関数
 */
export function sortTable(
  table: HTMLTableElement,
  columnIndex: number,
  getRowFilterSetting?: () => Result.Result<boolean, string>
): void {
  const tbody = table.querySelector(
    "tbody"
  ) as HTMLTableSectionElement | null;
  const targetBody = tbody ?? table;
  const rows = Array.from(
    targetBody.querySelectorAll<HTMLTableRowElement>("tr")
  ).filter((row) => row.parentNode === targetBody);

  const isAscending = table.dataset.sortOrder !== "asc";
  table.dataset.sortOrder = isAscending ? "asc" : "desc";

  // Step 1: 拡張機能で非表示にした行のみ表示状態に復元（フィルタリングのリセット）
  for (const row of rows) {
    if (row.dataset[ROW_HIDDEN_BY_EXTENSION_DATASET_KEY] !== "true") {
      continue;
    }
    row.style.display = "";
    delete row.dataset[ROW_HIDDEN_BY_EXTENSION_DATASET_KEY];
  }

  // Step 2: ソート実行
  rows.sort((a, b) => {
    const aCell = a.cells[columnIndex]?.textContent?.trim() ?? "";
    const bCell = b.cells[columnIndex]?.textContent?.trim() ?? "";

    const aNum = parseNumericValue(aCell);
    const bNum = parseNumericValue(bCell);

    if (!(Number.isNaN(aNum) || Number.isNaN(bNum))) {
      return isAscending ? aNum - bNum : bNum - aNum;
    }

    return isAscending
      ? aCell.localeCompare(bCell, "ja")
      : bCell.localeCompare(aCell, "ja");
  });

  for (const row of rows) {
    targetBody.appendChild(row);
  }

  // Step 3: 現在のURLのパターンの行フィルタリング設定を取得
  if (getRowFilterSetting) {
    const filterSettingResult = getRowFilterSetting();
    if (Result.isSuccess(filterSettingResult)) {
      const enableRowFilter = filterSettingResult.value;
      // フィルタリング適用（設定が有効な場合）
      applyRowFiltering(rows, columnIndex, enableRowFilter);
    }
  }
}

/**
 * 行フィルタリングを適用する
 * @param rows - フィルタリング対象の行配列
 * @param columnIndex - フィルタリング対象の列インデックス
 * @param enableRowFilter - 行フィルタリングを有効にするかどうか
 */
export function applyRowFiltering(
  rows: HTMLTableRowElement[],
  columnIndex: number,
  enableRowFilter: boolean
): void {
  // enableRowFilterがtrueの場合のみ適用
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
