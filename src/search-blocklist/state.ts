import { Result } from "@praha/byethrow";
import type {
  SearchBlocklistMutateRequest,
  SearchBlocklistMutateResponse,
} from "@/background/runtime_types";
import { t } from "@/i18n";
import { type StorageError, storageLocalGet } from "@/storage/helpers";
import { debugLog } from "@/utils/debug_log";
import {
  type CompiledSearchBlocklistPattern,
  compileSearchBlocklistPattern,
  isSearchBlocklistRule,
  matchesCompiledSearchBlocklistPattern,
  normalizeSearchBlocklistPattern,
  partitionStoredSearchBlocklistRules,
  validateSearchBlocklistRules,
} from "./rules";
import {
  BLOCKLIST_BLOCKED_ATTR,
  BLOCKLIST_REVEALED_ATTR,
  BLOCKLIST_SCAN_ATTR,
  type BlocklistEntry,
  type BlocklistSnapshot,
  type BlocklistState,
  type SearchBlocklistRule,
  type SearchResultEntry,
} from "./types";

export type StoredSearchBlocklistData = {
  searchBlocklistRules?: SearchBlocklistRule[];
};

export type BlocklistStateController = BlocklistState & {
  applyResults: (results: SearchResultEntry[]) => void;
  rescan: () => void;
  reloadRulesFromStorage: () => Promise<void>;
};

const HASH_MODULUS = 2_147_483_647;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSearchBlocklistRuleList(
  value: unknown
): value is SearchBlocklistRule[] {
  return Array.isArray(value) && value.every(isSearchBlocklistRule);
}

function isSearchBlocklistMutationPayload(
  value: unknown
): value is { rules: SearchBlocklistRule[]; revision: number } {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isSearchBlocklistRuleList(value.rules) &&
    typeof value.revision === "number" &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0
  );
}

function mutationFailureMessage(
  op: SearchBlocklistMutateRequest["op"]
): string {
  return op === "remove"
    ? t("searchBlocklist.errors.deleteFailed")
    : t("searchBlocklist.errors.saveFailed");
}

async function sendSearchBlocklistMutation(
  request: SearchBlocklistMutateRequest
): Promise<
  Result.Result<{ rules: SearchBlocklistRule[]; revision: number }, string>
> {
  try {
    const response = await chrome.runtime.sendMessage<
      SearchBlocklistMutateRequest,
      SearchBlocklistMutateResponse
    >(request);
    if (!isRecord(response)) {
      return Result.fail(mutationFailureMessage(request.op));
    }
    if (response.type === "Failure") {
      return typeof response.error === "string"
        ? Result.fail(response.error)
        : Result.fail(mutationFailureMessage(request.op));
    }
    if (
      response.type !== "Success" ||
      !isSearchBlocklistMutationPayload(response.value)
    ) {
      return Result.fail(mutationFailureMessage(request.op));
    }
    return Result.succeed(response.value);
  } catch (error) {
    return Result.fail(
      error instanceof Error
        ? error.message
        : mutationFailureMessage(request.op)
    );
  }
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash * 31 + url.charCodeAt(index)) % HASH_MODULUS;
  }
  return Math.abs(hash).toString(16);
}

type CompiledRule = {
  id: string;
  pattern: string;
  compiled: CompiledSearchBlocklistPattern;
};

function validateStoredRules(
  data: unknown
): Result.Result<SearchBlocklistRule[], string> {
  const stored = isRecord(data) ? data.searchBlocklistRules : undefined;
  const partition = partitionStoredSearchBlocklistRules(stored);
  if (partition.skippedCount > 0) {
    debugLog("search-blocklist", "invalid stored rules skipped", {
      count: partition.skippedCount,
    }).catch(() => undefined);
  }
  return validateSearchBlocklistRules(partition.valid);
}

function createBlocklistEntry(entry: BlocklistEntry): BlocklistEntry {
  Object.freeze(entry.matchedRuleIds);
  if (entry.matchedPatterns) {
    Object.freeze(entry.matchedPatterns);
  }
  return Object.freeze(entry);
}

function compileRules(rules: SearchBlocklistRule[]): CompiledRule[] {
  const compiled: CompiledRule[] = [];
  let failedCount = 0;
  for (const rule of rules) {
    const normalized = normalizeSearchBlocklistPattern(rule.pattern);
    if (Result.isFailure(normalized)) {
      failedCount += 1;
      continue;
    }
    const compiledPattern = compileSearchBlocklistPattern(normalized.value);
    if (Result.isFailure(compiledPattern)) {
      failedCount += 1;
      continue;
    }
    compiled.push({
      compiled: compiledPattern.value,
      id: rule.id,
      pattern: normalized.value,
    });
  }
  if (failedCount > 0) {
    debugLog("search-blocklist", "invalid rules skipped", {
      count: failedCount,
    }).catch(() => undefined);
  }
  return compiled;
}

export function createBlocklistState(
  engineId: string,
  initialRulesPromise: Promise<
    Result.Result<StoredSearchBlocklistData, StorageError>
  >,
  findResults: () => SearchResultEntry[]
): BlocklistStateController {
  let compiledRules: CompiledRule[] = [];
  let ruleRevision = 0;
  let revealed = false;
  const entries = new Map<HTMLElement, BlocklistEntry>();
  const listeners = new Set<() => void>();
  let snapshot: BlocklistSnapshot = Object.freeze({
    blockedCount: 0,
    engineId,
    entries: Object.freeze([]),
    ruleRevision,
  });

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function refreshSnapshot(): void {
    const snapshotEntries = Object.freeze([...entries.values()]);
    const blockedCount = snapshotEntries.filter(
      (entry) => entry.blocked
    ).length;
    const entriesChanged =
      snapshotEntries.length !== snapshot.entries.length ||
      snapshotEntries.some((entry, index) => entry !== snapshot.entries[index]);
    if (
      !entriesChanged &&
      blockedCount === snapshot.blockedCount &&
      ruleRevision === snapshot.ruleRevision
    ) {
      return;
    }
    snapshot = Object.freeze({
      blockedCount,
      engineId,
      entries: snapshotEntries,
      ruleRevision,
    });
  }

  function setRules(nextRules: SearchBlocklistRule[]): void {
    compiledRules = compileRules(nextRules);
    ruleRevision += 1;
    refreshSnapshot();
  }

  function safeFindResults(): SearchResultEntry[] {
    try {
      return findResults();
    } catch {
      return [];
    }
  }

  function applyToContainer(result: SearchResultEntry): void {
    const scanKey = `${ruleRevision}:${hashUrl(result.url)}`;
    const currentEntry = entries.get(result.container);
    if (
      result.container.getAttribute(BLOCKLIST_SCAN_ATTR) === scanKey &&
      currentEntry
    ) {
      if (
        currentEntry.url !== result.url ||
        currentEntry.title !== result.title
      ) {
        entries.set(
          result.container,
          createBlocklistEntry({
            ...currentEntry,
            title: result.title,
            url: result.url,
          })
        );
      }
      return;
    }

    const matchedRules = compiledRules.filter((rule) =>
      matchesCompiledSearchBlocklistPattern(rule.compiled, result.url)
    );
    const matchedRuleIds = matchedRules.map((rule) => rule.id);
    const matchedPatterns = matchedRules.map((rule) => rule.pattern);
    const blocked = matchedRuleIds.length > 0;

    if (blocked) {
      result.container.setAttribute(BLOCKLIST_BLOCKED_ATTR, "1");
      if (revealed) {
        result.container.setAttribute(BLOCKLIST_REVEALED_ATTR, "1");
      } else {
        result.container.removeAttribute(BLOCKLIST_REVEALED_ATTR);
      }
    } else {
      result.container.removeAttribute(BLOCKLIST_BLOCKED_ATTR);
      result.container.removeAttribute(BLOCKLIST_REVEALED_ATTR);
    }
    result.container.setAttribute(BLOCKLIST_SCAN_ATTR, scanKey);

    entries.set(
      result.container,
      createBlocklistEntry({
        blocked,
        container: result.container,
        matchedPatterns,
        matchedRuleIds,
        title: result.title,
        url: result.url,
      })
    );
  }

  function applyResults(results: SearchResultEntry[]): void {
    const scannedContainers = new Set<HTMLElement>();
    for (const result of results) {
      if (!result.container.isConnected) {
        continue;
      }
      scannedContainers.add(result.container);
      applyToContainer(result);
    }
    for (const [container] of entries) {
      if (scannedContainers.has(container) && container.isConnected) {
        continue;
      }
      entries.delete(container);
      container.removeAttribute(BLOCKLIST_BLOCKED_ATTR);
      container.removeAttribute(BLOCKLIST_REVEALED_ATTR);
      container.removeAttribute(BLOCKLIST_SCAN_ATTR);
    }
    refreshSnapshot();
    notify();
  }

  function rescan(): void {
    applyResults(safeFindResults());
  }

  function loadRulesFromStorage(): Promise<
    Result.Result<SearchBlocklistRule[], StorageError | string>
  > {
    return storageLocalGet<unknown>(["searchBlocklistRules"]).then((loaded) => {
      if (Result.isFailure(loaded)) {
        return loaded;
      }
      return validateStoredRules(loaded.value);
    });
  }

  async function reloadRulesFromStorage(): Promise<void> {
    const loaded = await loadRulesFromStorage();
    if (Result.isFailure(loaded)) {
      return;
    }
    setRules(loaded.value);
    rescan();
  }

  const ready: Promise<void> = initialRulesPromise
    .then((loaded) => {
      if (Result.isFailure(loaded)) {
        setRules([]);
        return;
      }
      const validated = validateStoredRules(loaded.value);
      setRules(Result.isSuccess(validated) ? validated.value : []);
    })
    .catch(() => {
      setRules([]);
    })
    .then(() => {
      try {
        rescan();
      } catch {
        // fail open: initial scan must never reject `ready`
      }
    });

  function getSnapshot(): BlocklistSnapshot {
    return snapshot;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  async function addRule(
    pattern: string
  ): Promise<Result.Result<void, string>> {
    const normalized = normalizeSearchBlocklistPattern(pattern);
    if (Result.isFailure(normalized)) {
      return normalized;
    }

    const response = await sendSearchBlocklistMutation({
      action: "searchBlocklistMutate",
      op: "add",
      pattern: normalized.value,
    });
    if (Result.isFailure(response)) {
      return response;
    }
    setRules(response.value.rules);
    rescan();
    return Result.succeed(undefined);
  }

  async function removeRules(
    ruleIds: string[]
  ): Promise<Result.Result<void, string>> {
    const response = await sendSearchBlocklistMutation({
      action: "searchBlocklistMutate",
      op: "remove",
      ruleIds,
    });
    if (Result.isFailure(response)) {
      return response;
    }
    setRules(response.value.rules);
    rescan();
    return Result.succeed(undefined);
  }

  function setRevealed(nextRevealed: boolean): void {
    revealed = nextRevealed;
    for (const entry of entries.values()) {
      if (!entry.blocked) {
        continue;
      }
      if (revealed) {
        entry.container.setAttribute(BLOCKLIST_REVEALED_ATTR, "1");
      } else {
        entry.container.removeAttribute(BLOCKLIST_REVEALED_ATTR);
      }
    }
    notify();
  }

  return {
    addRule,
    applyResults,
    getSnapshot,
    ready,
    reloadRulesFromStorage,
    removeRules,
    rescan,
    setRevealed,
    subscribe,
  };
}
