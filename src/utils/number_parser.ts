// Module-level regex patterns (lint/performance/useTopLevelRegex)
const CURRENCY_SYMBOLS_REGEX = /[¥$€£円元]/;
const NUMBER_WITH_SEPARATORS_REGEX =
  /^[¥$€£円元]?\s*-?[\d,]+\.?\d*\s*[¥$€£円元]?$/;
const SEPARATOR_CHARS_REGEX = /[,]/g;

/**
 * 文字列から数値を抽出する
 *
 * サポート形式:
 * - 通貨記号付き: "935円", "$1,000", "¥254,079"
 * - カンマ区切り: "1,000,000"
 * - 小数点: "123.45"
 * - 負の数: "-100円"
 * - 指数表記: "1e3" (1000)
 *
 * @param text - パース対象の文字列
 * @returns 数値またはNaN
 *
 * @example
 * parseNumericValue("254,079円") // 254079
 * parseNumericValue("$1,234.56") // 1234.56
 * parseNumericValue("abc") // NaN
 */
export function parseNumericValue(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return Number.NaN;
  }

  // 通貨記号を含む数値形式かチェック
  const hasCurrency = CURRENCY_SYMBOLS_REGEX.test(trimmed);
  const isNumericLike = NUMBER_WITH_SEPARATORS_REGEX.test(trimmed);

  if (hasCurrency || isNumericLike) {
    // 通貨記号とカンマを削除
    const cleaned = trimmed
      .replace(CURRENCY_SYMBOLS_REGEX, "")
      .replace(SEPARATOR_CHARS_REGEX, "")
      .trim();

    return Number.parseFloat(cleaned);
  }

  // 通常の数値パース（指数表記などもサポート）
  return Number.parseFloat(trimmed);
}
