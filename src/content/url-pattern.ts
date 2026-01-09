// URLパターンマッチングモジュール

// Regex patterns at module level for performance (lint/performance/useTopLevelRegex)
const QUERY_OR_HASH_REGEX = /[?#]/;
const HTTP_PROTOCOL_REGEX = /^https?:\/\//;

/**
 * ワイルドカード文字列パターンを正規表現に変換
 * @param pattern - ワイルドカード文字列パターン（* がワイルドカード）
 * @returns 正規表現オブジェクト
 */
export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  const shouldAllowQueryHashSuffix = !QUERY_OR_HASH_REGEX.test(pattern);
  const allowOptionalTrailingSlash =
    shouldAllowQueryHashSuffix &&
    !pattern.endsWith("/") &&
    !pattern.includes("*");

  const optionalTrailingSlash = allowOptionalTrailingSlash ? "(?:/)?" : "";
  const optionalQueryHashSuffix = shouldAllowQueryHashSuffix
    ? "(?:[?#].*)?"
    : "";

  return new RegExp(
    `^${escaped}${optionalTrailingSlash}${optionalQueryHashSuffix}$`,
  );
}

/**
 * 現在のURLが指定されたパターンのいずれかにマッチするかチェック
 * @param patterns - URLパターン配列
 * @param url - チェック対象のURL（指定しない場合は現在のページのURL）
 * @returns マッチした場合true
 */
export function matchesAnyPattern(
  patterns: string[],
  url: string = window.location.href,
): boolean {
  const urlWithoutProtocol = url.replace(HTTP_PROTOCOL_REGEX, "");

  return patterns.some((pattern) => {
    const patternWithoutProtocol = pattern.replace(HTTP_PROTOCOL_REGEX, "");
    const regex = patternToRegex(patternWithoutProtocol);
    return regex.test(urlWithoutProtocol);
  });
}
