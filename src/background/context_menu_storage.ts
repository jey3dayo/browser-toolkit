/**
 * Context menu storage utilities.
 * Handles loading and initialization of context actions, search engines, and text templates.
 */

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
import {
  DEFAULT_SEARCH_ENGINES,
  normalizeSearchEngines,
  type SearchEngine,
} from "@/search_engines";
import { DEFAULT_TEXT_TEMPLATES, type TextTemplate } from "@/text_templates";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

/**
 * Options for generic storage initialization.
 */
type EnsureStorageInitializedOptions<T> = {
  storageKey: keyof SyncStorageData;
  normalize?: (raw: unknown) => T[];
  defaults: T[];
  functionName: string;
  initializeOnEmpty?: boolean;
  logDetails?: boolean;
};

/**
 * Handles storage initialization for patterns that initialize on empty array.
 * Used by contextActions and searchEngines.
 */
async function initializeOnEmptyPattern<T>(
  raw: unknown,
  normalize: ((raw: unknown) => T[]) | undefined,
  storageKey: keyof SyncStorageData,
  defaults: T[],
  functionName: string,
  logDetails: boolean
): Promise<T[]> {
  const existing = normalize ? normalize(raw) : ((raw as T[]) ?? []);

  if (logDetails) {
    await debugLog(functionName, "normalized existing", {
      existing,
      count: existing.length,
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
  return (raw as T[]) ?? defaults;
}

/**
 * Generic helper to ensure storage is initialized with defaults.
 * Handles the common pattern of checking storage, normalizing, and initializing defaults.
 */
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

/**
 * Ensures context actions are initialized in storage.
 * If no actions exist, saves and returns default actions.
 *
 * @returns Promise resolving to context actions array
 */
export function ensureContextActionsInitialized(): Promise<ContextAction[]> {
  return ensureStorageInitialized({
    storageKey: "contextActions",
    normalize: normalizeContextActions,
    defaults: DEFAULT_CONTEXT_ACTIONS,
    functionName: "ensureContextActionsInitialized",
    initializeOnEmpty: true,
    logDetails: false,
  });
}

/**
 * Ensures search engines are initialized in storage.
 * If no engines exist, saves and returns default engines.
 *
 * @returns Promise resolving to search engines array
 */
export function ensureSearchEnginesInitialized(): Promise<SearchEngine[]> {
  return ensureStorageInitialized({
    storageKey: "searchEngines",
    normalize: normalizeSearchEngines,
    defaults: DEFAULT_SEARCH_ENGINES,
    functionName: "ensureSearchEnginesInitialized",
    initializeOnEmpty: true,
    logDetails: true,
  });
}

/**
 * Ensures search engine groups are initialized in storage.
 * If no groups exist, saves and returns default groups.
 *
 * @returns Promise resolving to search engine groups array
 */
export function ensureSearchEngineGroupsInitialized(): Promise<
  SearchEngineGroup[]
> {
  return ensureStorageInitialized({
    storageKey: "searchEngineGroups",
    normalize: normalizeSearchEngineGroups,
    defaults: DEFAULT_SEARCH_ENGINE_GROUPS,
    functionName: "ensureSearchEngineGroupsInitialized",
    initializeOnEmpty: true,
    logDetails: true,
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
    storageKey: "textTemplates",
    defaults: DEFAULT_TEXT_TEMPLATES,
    functionName: "ensureTextTemplatesInitialized",
    initializeOnEmpty: false,
    logDetails: false,
  });
}

/**
 * Loads context actions from storage.
 * Normalizes the loaded actions before returning.
 *
 * @returns Promise resolving to normalized context actions
 */
export async function loadContextActions(): Promise<ContextAction[]> {
  const data = (await storageSyncGet(["contextActions"])) as SyncStorageData;
  return normalizeContextActions(data.contextActions);
}
