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
  DEFAULT_SEARCH_ENGINES,
  normalizeSearchEngines,
  type SearchEngine,
} from "@/search_engines";
import { DEFAULT_TEXT_TEMPLATES, type TextTemplate } from "@/text_templates";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

/**
 * Ensures context actions are initialized in storage.
 * If no actions exist, saves and returns default actions.
 *
 * @returns Promise resolving to context actions array
 */
export async function ensureContextActionsInitialized(): Promise<
  ContextAction[]
> {
  try {
    const stored = (await storageSyncGet([
      "contextActions",
    ])) as SyncStorageData;
    const existing = normalizeContextActions(stored.contextActions);
    if (existing.length > 0) {
      return existing;
    }
    await storageSyncSet({ contextActions: DEFAULT_CONTEXT_ACTIONS });
    return DEFAULT_CONTEXT_ACTIONS;
  } catch (error) {
    await debugLog(
      "ensureContextActionsInitialized",
      "failed",
      { error: formatErrorLog("", {}, error) },
      "error"
    );
    console.error(
      formatErrorLog("ensureContextActionsInitialized failed", {}, error)
    );
    // ストレージ読み込み失敗時もデフォルト値を返す
    return DEFAULT_CONTEXT_ACTIONS;
  }
}

/**
 * Ensures search engines are initialized in storage.
 * If no engines exist, saves and returns default engines.
 *
 * @returns Promise resolving to search engines array
 */
export async function ensureSearchEnginesInitialized(): Promise<
  SearchEngine[]
> {
  try {
    await debugLog("ensureSearchEnginesInitialized", "start");
    const stored = (await storageSyncGet(["searchEngines"])) as SyncStorageData;
    await debugLog("ensureSearchEnginesInitialized", "stored data", { stored });
    const existing = normalizeSearchEngines(stored.searchEngines);
    await debugLog("ensureSearchEnginesInitialized", "normalized existing", {
      existing,
      count: existing.length,
    });
    if (existing.length > 0) {
      await debugLog("ensureSearchEnginesInitialized", "returning existing");
      return existing;
    }
    await debugLog("ensureSearchEnginesInitialized", "saving defaults", {
      defaults: DEFAULT_SEARCH_ENGINES,
    });
    await storageSyncSet({ searchEngines: DEFAULT_SEARCH_ENGINES });
    await debugLog("ensureSearchEnginesInitialized", "returning defaults");
    return DEFAULT_SEARCH_ENGINES;
  } catch (error) {
    await debugLog(
      "ensureSearchEnginesInitialized",
      "error occurred",
      { error: formatErrorLog("", {}, error) },
      "error"
    );
    // ストレージ読み込み失敗時もデフォルト値を返す
    await debugLog(
      "ensureSearchEnginesInitialized",
      "returning defaults after error"
    );
    return DEFAULT_SEARCH_ENGINES;
  }
}

/**
 * Ensures text templates are initialized in storage.
 * If textTemplates key is undefined, saves and returns default templates.
 * An empty array [] means the user intentionally deleted all templates.
 *
 * @returns Promise resolving to text templates array
 */
export async function ensureTextTemplatesInitialized(): Promise<
  TextTemplate[]
> {
  try {
    const stored = (await storageSyncGet(["textTemplates"])) as SyncStorageData;

    // Only initialize defaults if textTemplates key is undefined
    // An empty array [] means the user intentionally deleted all templates
    if (stored.textTemplates === undefined) {
      await storageSyncSet({ textTemplates: DEFAULT_TEXT_TEMPLATES });
      return DEFAULT_TEXT_TEMPLATES;
    }

    return stored.textTemplates;
  } catch (error) {
    await debugLog(
      "ensureTextTemplatesInitialized",
      "failed",
      { error: formatErrorLog("", {}, error) },
      "error"
    );
    return DEFAULT_TEXT_TEMPLATES;
  }
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
