// Module-level regex patterns (lint/performance/useTopLevelRegex)
const HYPHEN_REGEX = /^[-−]$/;
const EMPTY_NA_REGEX = /^(n\/a|null|undefined|—)$/i;

/**
 * セル値がフィルタリング対象（非表示対象）かどうかを判定
 *
 * フィルタリング条件:
 * - ゼロ値: parseNumericValue() が 0 を返す
 * - ハイフン: "-" または "−" (Unicode U+2212)
 * - 空白/N/A: 空文字、"N/A", "null", "undefined"
 *
 * @param cellText - セルのテキスト内容
 * @param parseNumericValue - 数値パース関数（依存性注入）
 * @returns true の場合、この行を非表示にする
 *
 * @example
 * shouldHideRow("0円", parseNumericValue) // true
 * shouldHideRow("-", parseNumericValue)   // true
 * shouldHideRow("N/A", parseNumericValue) // true
 * shouldHideRow("123", parseNumericValue) // false
 */
export function shouldHideRow(
  cellText: string,
  parseNumericValue: (text: string) => number
): boolean {
  const trimmed = cellText.trim();

  // 空文字列チェック
  if (!trimmed) {
    return true;
  }

  // ハイフンチェック（"-" または "−"）
  if (HYPHEN_REGEX.test(trimmed)) {
    return true;
  }

  // N/A、null、undefined等のチェック
  if (EMPTY_NA_REGEX.test(trimmed)) {
    return true;
  }

  // ゼロ値チェック（数値として0）
  const numericValue = parseNumericValue(trimmed);
  if (numericValue === 0) {
    return true;
  }

  return false;
}
