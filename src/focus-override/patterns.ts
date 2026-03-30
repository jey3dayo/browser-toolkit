import { Result } from "@praha/byethrow";

const OPTIONAL_PROTOCOL_REGEX = /^(https?|[*]):\/\//;
const INVALID_HOST_CHARS_REGEX = /[/?#:]/;
const QUERY_OR_HASH_REGEX = /[?#]/;

export type FocusOverrideStorageData = {
  focusOverridePatterns?: string[];
};

export function normalizeFocusOverridePatterns(
  data: Partial<FocusOverrideStorageData>
): Result.Result<string[], string> {
  const value = data.focusOverridePatterns;
  if (value === undefined) {
    return Result.succeed([]);
  }
  if (!Array.isArray(value)) {
    return Result.fail("focusOverridePatterns must be an array");
  }

  const patterns: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return Result.fail("Invalid focusOverridePatterns item format");
    }
    const pattern = item.trim();
    if (!pattern || patterns.includes(pattern)) {
      continue;
    }
    patterns.push(pattern);
  }

  return Result.succeed(patterns.slice(0, 200));
}

function isSupportedHostPattern(host: string): boolean {
  if (!host || INVALID_HOST_CHARS_REGEX.test(host)) {
    return false;
  }
  if (host === "*") {
    return true;
  }
  if (host.startsWith("*.")) {
    const suffix = host.slice(2);
    return suffix.length > 0 && !suffix.includes("*");
  }
  return !host.includes("*");
}

export function toFocusOverrideMatchPattern(
  pattern: string
): Result.Result<string, string> {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return Result.fail("パターンを入力してください");
  }

  const withoutProtocol = trimmed.replace(OPTIONAL_PROTOCOL_REGEX, "");
  if (!withoutProtocol) {
    return Result.fail("ホストを含むパターンを入力してください");
  }
  if (QUERY_OR_HASH_REGEX.test(withoutProtocol)) {
    return Result.fail(
      "フォーカス維持はクエリ・ハッシュ付きパターンに未対応です"
    );
  }

  const slashIndex = withoutProtocol.indexOf("/");
  const host =
    slashIndex === -1 ? withoutProtocol : withoutProtocol.slice(0, slashIndex);
  const path =
    slashIndex === -1 ? "/*" : withoutProtocol.slice(slashIndex) || "/*";

  if (!isSupportedHostPattern(host)) {
    return Result.fail(
      "フォーカス維持は example.com または *.example.com 形式のホストに対応しています"
    );
  }
  if (!path.startsWith("/")) {
    return Result.fail("パスは / から始まる形式で入力してください");
  }

  return Result.succeed(`*://${host}${path}`);
}

export function toFocusOverrideMatchPatterns(patterns: string[]): string[] {
  const seen = new Set<string>();
  const matches: string[] = [];

  for (const pattern of patterns) {
    const result = toFocusOverrideMatchPattern(pattern);
    if (Result.isFailure(result) || seen.has(result.value)) {
      continue;
    }
    seen.add(result.value);
    matches.push(result.value);
  }

  return matches;
}
