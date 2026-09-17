import { Result } from "@praha/byethrow";
import { t } from "@/i18n";
import { generateId } from "@/utils/id_generator";
import type { SearchBlocklistRule } from "./types";

const SEARCH_BLOCKLIST_RULE_ID_PREFIX = "sbl";

export const SEARCH_BLOCKLIST_RULE_LIMIT = 2000;
export const SEARCH_BLOCKLIST_PATTERN_MAX_LENGTH = 255;
export const SEARCH_BLOCKLIST_PATTERN_MAX_WILDCARDS = 3;
export const SEARCH_BLOCKLIST_URL_MAX_LENGTH = 2048;

const ALLOWED_SCHEMES = new Set(["*", "http", "https"]);

export type CompiledSearchBlocklistPattern = {
  scheme: "any" | "http" | "https";
  hostWildcard: boolean;
  hostLabels: string[];
  pathPattern: string;
};

function isRegexLiteral(pattern: string): boolean {
  return (
    pattern.length >= 2 && pattern.startsWith("/") && pattern.endsWith("/")
  );
}

function splitPattern(
  pattern: string
): Result.Result<{ scheme: string; host: string; path: string }, string> {
  const schemeSeparatorIndex = pattern.indexOf("://");
  if (schemeSeparatorIndex === -1) {
    return Result.fail("スキームを含む形式で解釈できませんでした");
  }

  const scheme = pattern.slice(0, schemeSeparatorIndex);
  const rest = pattern.slice(schemeSeparatorIndex + 3);
  const pathIndex = rest.indexOf("/");
  const host = pathIndex === -1 ? rest : rest.slice(0, pathIndex);
  const path = pathIndex === -1 ? "/*" : rest.slice(pathIndex);

  return Result.succeed({ host, path: path || "/*", scheme });
}

export function normalizeSearchBlocklistPattern(
  input: string
): Result.Result<string, string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return Result.fail("パターンを入力してください");
  }
  if (trimmed.length > SEARCH_BLOCKLIST_PATTERN_MAX_LENGTH) {
    return Result.fail(
      `パターンは${SEARCH_BLOCKLIST_PATTERN_MAX_LENGTH}文字以内で入力してください`
    );
  }
  if (isRegexLiteral(trimmed)) {
    return Result.fail("正規表現ルールは v1 未対応です");
  }

  const hasScheme = trimmed.includes("://");
  const withScheme = hasScheme ? trimmed : `*://*.${trimmed}`;

  const splitResult = splitPattern(withScheme);
  if (Result.isFailure(splitResult)) {
    return splitResult;
  }
  const { scheme, host, path } = splitResult.value;

  if (!ALLOWED_SCHEMES.has(scheme)) {
    return Result.fail("スキームは http/https のみ対応しています");
  }
  if (!host) {
    return Result.fail("ホストを含むパターンを入力してください");
  }
  if (host.includes("@")) {
    return Result.fail("ユーザー情報を含むパターンは未対応です");
  }
  if (host.includes(":")) {
    return Result.fail("ポート指定は未対応です");
  }

  const hostLabels = host.split(".");
  for (const [index, label] of hostLabels.entries()) {
    const isLeadingWildcardLabel = index === 0 && label === "*";
    if (label.includes("*") && !isLeadingWildcardLabel) {
      return Result.fail(
        "ホストのワイルドカードは *.example.com 形式のみ対応しています"
      );
    }
  }

  const normalizedHost = hostLabels
    .map((label) => label.toLowerCase())
    .join(".");
  if (!path.startsWith("/")) {
    return Result.fail("パスは / から始まる形式で入力してください");
  }

  const normalizedPattern = `${scheme}://${normalizedHost}${path}`;
  const wildcardCount = (normalizedPattern.match(/\*/g) ?? []).length;
  if (wildcardCount > SEARCH_BLOCKLIST_PATTERN_MAX_WILDCARDS) {
    return Result.fail(
      `ワイルドカード(*)は${SEARCH_BLOCKLIST_PATTERN_MAX_WILDCARDS}個までです`
    );
  }

  return Result.succeed(normalizedPattern);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSearchBlocklistRule(
  value: unknown
): value is SearchBlocklistRule {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.pattern === "string" &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt)
  );
}

export type SearchBlocklistRulePartition = {
  valid: SearchBlocklistRule[];
  invalid: unknown[];
  skippedCount: number;
};

export function partitionStoredSearchBlocklistRules(
  value: unknown
): SearchBlocklistRulePartition {
  if (!Array.isArray(value)) {
    return { invalid: [], skippedCount: 0, valid: [] };
  }

  const valid: SearchBlocklistRule[] = [];
  const invalid: unknown[] = [];
  for (const storedRule of value) {
    if (!isSearchBlocklistRule(storedRule)) {
      invalid.push(storedRule);
      continue;
    }
    const normalized = normalizeSearchBlocklistPattern(storedRule.pattern);
    if (Result.isFailure(normalized)) {
      invalid.push(storedRule);
      continue;
    }
    if (Result.isFailure(compileSearchBlocklistPattern(normalized.value))) {
      invalid.push(storedRule);
      continue;
    }
    valid.push({ ...storedRule, pattern: normalized.value });
  }
  return { invalid, skippedCount: invalid.length, valid };
}

export function listDisplayableSearchBlocklistRules(
  value: unknown
): SearchBlocklistRule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isSearchBlocklistRule);
}

export type SearchBlocklistRuleMutation = {
  op: "add" | "remove" | "update";
  pattern?: string;
  ruleIds?: string[];
  ruleId?: string;
};

function addSearchBlocklistRule(
  rules: SearchBlocklistRule[],
  pattern: string | undefined
): Result.Result<SearchBlocklistRule[], string> {
  if (typeof pattern !== "string") {
    return Result.fail(t("searchBlocklist.errors.patternRequired"));
  }
  const normalized = normalizeSearchBlocklistPattern(pattern);
  if (Result.isFailure(normalized)) {
    return normalized;
  }
  if (rules.some((rule) => rule.pattern === normalized.value)) {
    return Result.fail(t("searchBlocklist.info.duplicate"));
  }

  const nextRules = [
    ...rules,
    {
      createdAt: Date.now(),
      id: generateId(normalized.value, SEARCH_BLOCKLIST_RULE_ID_PREFIX),
      pattern: normalized.value,
    },
  ];
  const validated = validateSearchBlocklistRules(nextRules);
  if (Result.isFailure(validated)) {
    return validated;
  }
  return Result.succeed(nextRules);
}

function storedEntryId(entry: unknown): string | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }
  return typeof entry.id === "string" && entry.id.length > 0
    ? entry.id
    : undefined;
}

function storedEntryCreatedAt(entry: unknown): number {
  if (
    isRecord(entry) &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt)
  ) {
    return entry.createdAt;
  }
  return Date.now();
}

function removeSearchBlocklistRules(
  partition: SearchBlocklistRulePartition,
  ruleIds: string[] | undefined
): Result.Result<SearchBlocklistRulePartition, string> {
  if (!Array.isArray(ruleIds)) {
    return Result.fail(t("searchBlocklist.errors.deleteFailed"));
  }
  const idsToRemove = new Set(ruleIds);
  const invalid = partition.invalid.filter((entry) => {
    const id = storedEntryId(entry);
    return id === undefined || !idsToRemove.has(id);
  });
  return Result.succeed({
    invalid,
    skippedCount: invalid.length,
    valid: partition.valid.filter((rule) => !idsToRemove.has(rule.id)),
  });
}

function updateSearchBlocklistRule(
  partition: SearchBlocklistRulePartition,
  ruleId: string | undefined,
  pattern: string | undefined
): Result.Result<SearchBlocklistRulePartition, string> {
  if (typeof pattern !== "string" || typeof ruleId !== "string") {
    return Result.fail(t("searchBlocklist.errors.saveFailed"));
  }
  const normalized = normalizeSearchBlocklistPattern(pattern);
  if (Result.isFailure(normalized)) {
    return normalized;
  }

  if (partition.valid.some((rule) => rule.id === ruleId)) {
    return Result.succeed({
      ...partition,
      valid: partition.valid.map((rule) =>
        rule.id === ruleId ? { ...rule, pattern: normalized.value } : rule
      ),
    });
  }

  const repairTarget = partition.invalid.find(
    (entry) => storedEntryId(entry) === ruleId
  );
  if (repairTarget === undefined) {
    return Result.fail(t("searchBlocklist.errors.saveFailed"));
  }
  const invalid = partition.invalid.filter((entry) => entry !== repairTarget);
  return Result.succeed({
    invalid,
    skippedCount: invalid.length,
    valid: [
      ...partition.valid,
      {
        createdAt: storedEntryCreatedAt(repairTarget),
        id: ruleId,
        pattern: normalized.value,
      },
    ],
  });
}

export type SearchBlocklistMutationOutcome = {
  persisted: unknown[];
  rules: SearchBlocklistRule[];
  skippedCount: number;
};

export function applySearchBlocklistRuleMutation(
  partition: SearchBlocklistRulePartition,
  mutation: SearchBlocklistRuleMutation
): Result.Result<SearchBlocklistMutationOutcome, string> {
  let next: Result.Result<SearchBlocklistRulePartition, string>;
  if (mutation.op === "add") {
    const added = addSearchBlocklistRule(partition.valid, mutation.pattern);
    next = Result.isFailure(added)
      ? added
      : Result.succeed({ ...partition, valid: added.value });
  } else if (mutation.op === "remove") {
    next = removeSearchBlocklistRules(partition, mutation.ruleIds);
  } else {
    next = updateSearchBlocklistRule(
      partition,
      mutation.ruleId,
      mutation.pattern
    );
  }
  if (Result.isFailure(next)) {
    return next;
  }

  const persisted: unknown[] = [...next.value.valid, ...next.value.invalid];
  return Result.succeed({
    persisted,
    rules: listDisplayableSearchBlocklistRules(persisted),
    skippedCount: next.value.skippedCount,
  });
}

export function validateSearchBlocklistRules(
  rules: SearchBlocklistRule[]
): Result.Result<SearchBlocklistRule[], string> {
  if (rules.length > SEARCH_BLOCKLIST_RULE_LIMIT) {
    return Result.fail(
      `ルール件数が上限(${SEARCH_BLOCKLIST_RULE_LIMIT}件)を超えています`
    );
  }
  return Result.succeed(rules);
}

export function compileSearchBlocklistPattern(
  pattern: string
): Result.Result<CompiledSearchBlocklistPattern, string> {
  const splitResult = splitPattern(pattern);
  if (Result.isFailure(splitResult)) {
    return splitResult;
  }
  const { scheme, host, path } = splitResult.value;

  if (!ALLOWED_SCHEMES.has(scheme)) {
    return Result.fail("スキームは http/https のみ対応しています");
  }
  if (!host) {
    return Result.fail("ホストを含むパターンを入力してください");
  }

  const hostWildcard = host.startsWith("*.");
  const hostLabels = (hostWildcard ? host.slice(2) : host)
    .split(".")
    .map((label) => label.toLowerCase());

  let compiledScheme: "any" | "http" | "https";
  if (scheme === "*") {
    compiledScheme = "any";
  } else if (scheme === "http") {
    compiledScheme = "http";
  } else if (scheme === "https") {
    compiledScheme = "https";
  } else {
    return Result.fail("スキームは http/https のみ対応しています");
  }

  return Result.succeed({
    hostLabels,
    hostWildcard,
    pathPattern: path,
    scheme: compiledScheme,
  });
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function globMatch(pattern: string, text: string): boolean {
  let patternIndex = 0;
  let textIndex = 0;
  let starPatternIndex = -1;
  let starTextIndex = -1;

  while (textIndex < text.length) {
    if (
      patternIndex < pattern.length &&
      pattern[patternIndex] === text[textIndex]
    ) {
      patternIndex += 1;
      textIndex += 1;
    } else if (patternIndex < pattern.length && pattern[patternIndex] === "*") {
      starPatternIndex = patternIndex;
      starTextIndex = textIndex;
      patternIndex += 1;
    } else if (starPatternIndex === -1) {
      return false;
    } else {
      patternIndex = starPatternIndex + 1;
      starTextIndex += 1;
      textIndex = starTextIndex;
    }
  }

  while (patternIndex < pattern.length && pattern[patternIndex] === "*") {
    patternIndex += 1;
  }

  return patternIndex === pattern.length;
}

export function matchesCompiledSearchBlocklistPattern(
  compiled: CompiledSearchBlocklistPattern,
  url: string
): boolean {
  if (url.length > SEARCH_BLOCKLIST_URL_MAX_LENGTH) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const urlScheme = parsed.protocol.replace(":", "");
  if (urlScheme !== "http" && urlScheme !== "https") {
    return false;
  }
  if (compiled.scheme !== "any" && compiled.scheme !== urlScheme) {
    return false;
  }

  const urlHostLabels = parsed.hostname.toLowerCase().split(".");
  if (compiled.hostWildcard) {
    if (compiled.hostLabels.length > urlHostLabels.length) {
      return false;
    }
    const suffix = urlHostLabels.slice(
      urlHostLabels.length - compiled.hostLabels.length
    );
    if (!arraysEqual(suffix, compiled.hostLabels)) {
      return false;
    }
  } else if (!arraysEqual(urlHostLabels, compiled.hostLabels)) {
    return false;
  }

  return globMatch(compiled.pathPattern, parsed.pathname || "/");
}

export function matchesSearchBlocklistPattern(
  pattern: string,
  url: string
): boolean {
  const compiled = compileSearchBlocklistPattern(pattern);
  if (Result.isFailure(compiled)) {
    return false;
  }
  return matchesCompiledSearchBlocklistPattern(compiled.value, url);
}
