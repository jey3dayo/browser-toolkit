const QUERY_OR_HASH_REGEX = /[?#]/;
const HTTP_PROTOCOL_REGEX = /^https?:\/\//;

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
    `^${escaped}${optionalTrailingSlash}${optionalQueryHashSuffix}$`
  );
}

export function matchesAnyPattern(
  patterns: string[],
  url: string = window.location.href
): boolean {
  const urlWithoutProtocol = url.replace(HTTP_PROTOCOL_REGEX, "");

  return patterns.some((pattern) => {
    const patternWithoutProtocol = pattern.replace(HTTP_PROTOCOL_REGEX, "");
    const regex = patternToRegex(patternWithoutProtocol);
    return regex.test(urlWithoutProtocol);
  });
}
