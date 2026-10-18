import { storageSyncGet, storageSyncSet } from "@/background/storage";
import type { SyncStorageData } from "@/background/types";
import {
  type ContextAction,
  DEFAULT_CONTEXT_ACTIONS,
  normalizeContextActions,
} from "@/context_actions";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  normalizeSearchEngineGroups,
  type SearchEngineGroup,
} from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";
import {
  DEFAULT_SEARCH_ENGINES,
  normalizeSearchEngines,
} from "@/search_engines";
import { DEFAULT_TEXT_TEMPLATES, type TextTemplate } from "@/text_templates";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

type EnsureStorageInitializedOptions<T> = {
  storageKey: keyof SyncStorageData;
  normalize?: (raw: unknown) => T[];
  defaults: T[];
  functionName: string;
  initializeOnEmpty?: boolean;
  logDetails?: boolean;
};

async function initializeOnEmptyPattern<T>(
  raw: unknown,
  normalize: ((raw: unknown) => T[]) | undefined,
  storageKey: keyof SyncStorageData,
  defaults: T[],
  functionName: string,
  logDetails: boolean
): Promise<T[]> {
  let existing: T[];
  if (normalize) {
    existing = normalize(raw);
  } else if (Array.isArray(raw)) {
    existing = raw as T[];
  } else {
    existing = [];
  }

  if (logDetails) {
    await debugLog(functionName, "normalized existing", {
      count: existing.length,
      existing,
    });
  }

  if (existing.length > 0) {
    if (logDetails) {
      await debugLog(functionName, "returning existing");
    }
    return existing;
  }

  if (logDetails) {
    await debugLog(functionName, "saving defaults", { defaults });
  }

  await storageSyncSet({ [storageKey]: defaults });

  if (logDetails) {
    await debugLog(functionName, "returning defaults");
  }

  return defaults;
}

/**
 * Handles storage initialization for patterns that only initialize if undefined.
 * Used by textTemplates (empty array means user deleted all templates).
 */
async function initializeOnUndefinedPattern<T>(
  raw: unknown,
  storageKey: keyof SyncStorageData,
  defaults: T[]
): Promise<T[]> {
  if (raw === undefined) {
    await storageSyncSet({ [storageKey]: defaults });
    return defaults;
  }
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  return defaults;
}

async function ensureStorageInitialized<T>({
  storageKey,
  normalize,
  defaults,
  functionName,
  initializeOnEmpty = true,
  logDetails = false,
}: EnsureStorageInitializedOptions<T>): Promise<T[]> {
  try {
    if (logDetails) {
      await debugLog(functionName, "start");
    }

    const stored = (await storageSyncGet([storageKey])) as SyncStorageData;

    if (logDetails) {
      await debugLog(functionName, "stored data", { stored });
    }

    const raw = stored[storageKey];

    if (initializeOnEmpty) {
      return initializeOnEmptyPattern(
        raw,
        normalize,
        storageKey,
        defaults,
        functionName,
        logDetails
      );
    }

    return initializeOnUndefinedPattern(raw, storageKey, defaults);
  } catch (error) {
    await debugLog(
      functionName,
      logDetails ? "error occurred" : "failed",
      { error: formatErrorLog("", {}, error) },
      "error"
    );

    if (logDetails) {
      await debugLog(functionName, "returning defaults after error");
    }

    if (!logDetails) {
      console.error(formatErrorLog(`${functionName} failed`, {}, error));
    }

    return defaults;
  }
}

export function ensureContextActionsInitialized(): Promise<ContextAction[]> {
  return ensureStorageInitialized({
    defaults: DEFAULT_CONTEXT_ACTIONS,
    functionName: "ensureContextActionsInitialized",
    initializeOnEmpty: true,
    logDetails: false,
    normalize: normalizeContextActions,
    storageKey: "contextActions",
  });
}

export function ensureSearchEnginesInitialized(): Promise<SearchEngine[]> {
  return ensureStorageInitialized({
    defaults: DEFAULT_SEARCH_ENGINES,
    functionName: "ensureSearchEnginesInitialized",
    initializeOnEmpty: true,
    logDetails: true,
    normalize: normalizeSearchEngines,
    storageKey: "searchEngines",
  });
}

export function ensureSearchEngineGroupsInitialized(): Promise<
  SearchEngineGroup[]
> {
  return ensureStorageInitialized({
    defaults: DEFAULT_SEARCH_ENGINE_GROUPS,
    functionName: "ensureSearchEngineGroupsInitialized",
    initializeOnEmpty: true,
    logDetails: true,
    normalize: normalizeSearchEngineGroups,
    storageKey: "searchEngineGroups",
  });
}

/**
 * Ensures text templates are initialized in storage.
 * If textTemplates key is undefined, saves and returns default templates.
 * An empty array [] means the user intentionally deleted all templates.
 *
 * @returns Promise resolving to text templates array
 */
export function ensureTextTemplatesInitialized(): Promise<TextTemplate[]> {
  return ensureStorageInitialized({
    defaults: DEFAULT_TEXT_TEMPLATES,
    functionName: "ensureTextTemplatesInitialized",
    initializeOnEmpty: false,
    logDetails: false,
    storageKey: "textTemplates",
  });
}

export async function loadContextActions(): Promise<ContextAction[]> {
  const data = (await storageSyncGet(["contextActions"])) as SyncStorageData;
  return normalizeContextActions(data.contextActions);
}
