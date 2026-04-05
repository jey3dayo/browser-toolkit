import { Result } from "@praha/byethrow";
import type { SummaryTarget } from "@/background/types";
import { matchesAnyPattern } from "@/content/url-pattern";
import type { ContextAction } from "@/context_actions";
import type { FocusOverrideStorageData } from "@/focus-override/patterns";
import type { SearchEngineGroup } from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";
import type { CalendarRegistrationTarget } from "@/shared_types";
import type { LocalStorageData } from "@/storage/types";
import type { TextTemplate } from "@/text_templates";
import { toErrorMessage } from "@/utils/errors";
import type { LinkFormat } from "@/utils/link_format";

// Re-export types from background/types for popup components
export type {
  RunContextActionResponse,
  SummarizeEventResponse,
  SummaryTarget,
} from "@/background/types";

/**
 * URLパターンとその設定
 */
export type DomainPatternConfig = {
  pattern: string;
  enableRowFilter: boolean;
};

export type SyncStorageData = {
  domainPatternConfigs?: DomainPatternConfig[];
  focusOverridePatterns?: FocusOverrideStorageData["focusOverridePatterns"];
  contextActions?: ContextAction[];
  linkFormat?: LinkFormat;
  calendarTargets?: CalendarRegistrationTarget[];
  searchEngines?: SearchEngine[];
  searchEngineGroups?: SearchEngineGroup[];
  textTemplates?: TextTemplate[];
};

export type EnableTableSortMessage = { action: "enableTableSort" };
export type EnableTableSortResponse = { success: boolean };

export type RunContextActionRequest = {
  action: "runContextAction";
  tabId: number;
  actionId: string;
  target?: SummaryTarget;
  source?: "popup" | "contextMenu";
};

export type SummarizeEventRequest = {
  action: "summarizeEvent";
  target: SummaryTarget;
};

export type TestOpenAiTokenRequest = {
  action: "testOpenAiToken";
  token?: string;
};
export type TestOpenAiTokenResponse = Result.Result<void, string>;

export type TestAiTokenRequest = {
  action: "testAiToken";
  token?: string;
};
export type TestAiTokenResponse = Result.Result<void, string>;

export type DownloadDebugLogsRequest = {
  action: "downloadDebugLogs";
};
export type DownloadDebugLogsResponse = Result.Result<void, string>;

export type ClearDebugLogsRequest = {
  action: "clearDebugLogs";
};
export type ClearDebugLogsResponse = Result.Result<void, string>;

export type ActiveTabInfo = {
  id: number;
  title?: string;
  url?: string;
};

export type FocusOverrideDiagnosticSnapshot = {
  markerPresent: boolean;
  visibilityState: string;
  hidden: boolean;
  hasFocus: boolean;
};

export type PopupRuntime = {
  isExtensionPage: boolean;
  storageSyncGet: (
    keys: (keyof SyncStorageData)[]
  ) => Result.ResultAsync<Partial<SyncStorageData>, string>;
  storageSyncSet: (
    items: Partial<SyncStorageData>
  ) => Result.ResultAsync<void, string>;
  storageLocalGet: (
    keys: (keyof LocalStorageData)[]
  ) => Result.ResultAsync<Partial<LocalStorageData>, string>;
  storageLocalSet: (
    items: Partial<LocalStorageData>
  ) => Result.ResultAsync<void, string>;
  storageLocalRemove: (
    keys: (keyof LocalStorageData)[] | keyof LocalStorageData
  ) => Result.ResultAsync<void, string>;
  getActiveTab: () => Result.ResultAsync<ActiveTabInfo | null, string>;
  getActiveTabId: () => Result.ResultAsync<number | null, string>;
  matchesFocusOverridePatterns: (patterns: string[], url: string) => boolean;
  diagnoseFocusOverride: (
    tabId: number
  ) => Result.ResultAsync<FocusOverrideDiagnosticSnapshot, string>;
  reloadTab: (tabId: number) => Result.ResultAsync<void, string>;
  sendMessageToBackground: <TRequest, TResponse>(
    message: TRequest
  ) => Result.ResultAsync<TResponse, string>;
  sendMessageToTab: <TRequest, TResponse>(
    tabId: number,
    message: TRequest
  ) => Result.ResultAsync<TResponse, string>;
  openUrl: (url: string) => void;
};

const FALLBACK_STORAGE_PREFIX = "mbu:popup:";
type StorageAreaName = "sync" | "local";
type StorageHandlerParams = {
  area: StorageAreaName;
  isExtensionPage: boolean;
  errorMessage: string;
};

function fallbackStorageGet(
  scope: StorageAreaName,
  keys: string[]
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(
        `${FALLBACK_STORAGE_PREFIX}${scope}:${key}`
      );
    } catch {
      raw = null;
    }
    if (raw === null) {
      continue;
    }
    try {
      data[key] = JSON.parse(raw) as unknown;
    } catch {
      // Keep parity with Chrome Storage: ignore invalid JSON payloads.
    }
  }
  return data;
}

function fallbackStorageSet(
  scope: StorageAreaName,
  items: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(items)) {
    try {
      window.localStorage.setItem(
        `${FALLBACK_STORAGE_PREFIX}${scope}:${key}`,
        JSON.stringify(value)
      );
    } catch {
      // no-op
    }
  }
}

function fallbackStorageRemove(
  scope: StorageAreaName,
  keys: string[] | string
): void {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    try {
      window.localStorage.removeItem(
        `${FALLBACK_STORAGE_PREFIX}${scope}:${key}`
      );
    } catch {
      // no-op
    }
  }
}

/**
 * Check if Chrome API is available
 */
function hasChromeApi<T extends keyof typeof chrome>(
  isExtensionPage: boolean,
  apiName: T
): boolean {
  return (
    isExtensionPage && apiName in (chrome as unknown as Record<string, unknown>)
  );
}

/**
 * Wrap Chrome API call with Result pattern
 */
async function wrapChromeApi<T>(
  operation: (
    resolve: (value: T) => void,
    reject: (error: Error) => void
  ) => void,
  errorMessage: string
): Promise<Result.Result<T, string>> {
  return await Result.try({
    try: () =>
      new Promise<T>((resolve, reject) => {
        operation(resolve, reject);
      }),
    catch: (error) => toErrorMessage(error, errorMessage),
  });
}

function getStorageArea(area: StorageAreaName): chrome.storage.StorageArea {
  return chrome.storage[area];
}

function createStorageGetter<TData>(
  params: StorageHandlerParams
): (keys: string[]) => Promise<Result.Result<Partial<TData>, string>> {
  return async (keys) => {
    if (!hasChromeApi(params.isExtensionPage, "storage")) {
      return Result.succeed(
        fallbackStorageGet(params.area, keys.map(String)) as Partial<TData>
      ) as Result.Result<Partial<TData>, string>;
    }

    return await wrapChromeApi<Partial<TData>>((resolve, reject) => {
      getStorageArea(params.area).get(keys, (items) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(items as Partial<TData>);
      });
    }, params.errorMessage);
  };
}

function createStorageSetter<TData>(
  params: StorageHandlerParams
): (items: Partial<TData>) => Promise<Result.Result<void, string>> {
  return async (items) => {
    if (!hasChromeApi(params.isExtensionPage, "storage")) {
      fallbackStorageSet(params.area, items as Record<string, unknown>);
      return Result.succeed();
    }

    return await wrapChromeApi<void>((resolve, reject) => {
      getStorageArea(params.area).set(items as Record<string, unknown>, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    }, params.errorMessage);
  };
}

function createStorageRemover(
  params: StorageHandlerParams
): (keys: string[] | string) => Promise<Result.Result<void, string>> {
  return async (keys) => {
    if (!hasChromeApi(params.isExtensionPage, "storage")) {
      fallbackStorageRemove(params.area, keys);
      return Result.succeed();
    }

    return await wrapChromeApi<void>((resolve, reject) => {
      getStorageArea(params.area).remove(keys, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    }, params.errorMessage);
  };
}

export function createPopupRuntime(): PopupRuntime {
  const isExtensionPage = window.location.protocol === "chrome-extension:";
  const storageSyncGet: PopupRuntime["storageSyncGet"] =
    createStorageGetter<SyncStorageData>({
      area: "sync",
      isExtensionPage,
      errorMessage: "同期ストレージの読み込みに失敗しました",
    });

  const storageSyncSet: PopupRuntime["storageSyncSet"] =
    createStorageSetter<SyncStorageData>({
      area: "sync",
      isExtensionPage,
      errorMessage: "同期ストレージの保存に失敗しました",
    });

  const storageLocalGet: PopupRuntime["storageLocalGet"] =
    createStorageGetter<LocalStorageData>({
      area: "local",
      isExtensionPage,
      errorMessage: "ローカルストレージの読み込みに失敗しました",
    });

  const storageLocalSet: PopupRuntime["storageLocalSet"] =
    createStorageSetter<LocalStorageData>({
      area: "local",
      isExtensionPage,
      errorMessage: "ローカルストレージの保存に失敗しました",
    });

  const storageLocalRemove: PopupRuntime["storageLocalRemove"] =
    createStorageRemover({
      area: "local",
      isExtensionPage,
      errorMessage: "ローカルストレージの削除に失敗しました",
    });

  const getActiveTab: PopupRuntime["getActiveTab"] = async () => {
    if (!hasChromeApi(isExtensionPage, "tabs")) {
      return Result.succeed(null);
    }
    return await wrapChromeApi<ActiveTabInfo | null>((resolve, reject) => {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (result) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          const [tab] = result;
          const id = tab?.id;
          if (id === undefined) {
            resolve(null);
            return;
          }
          resolve({ id, title: tab?.title, url: tab?.url });
        }
      );
    }, "タブ情報の取得に失敗しました");
  };

  const getActiveTabId: PopupRuntime["getActiveTabId"] = async () => {
    const activeTab = await getActiveTab();
    if (Result.isFailure(activeTab)) {
      return activeTab;
    }
    return Result.succeed(activeTab.value?.id ?? null);
  };

  const matchesFocusOverridePatterns: PopupRuntime["matchesFocusOverridePatterns"] =
    (patterns, url) => {
      if (!url.trim()) {
        return false;
      }
      return matchesAnyPattern(patterns, url);
    };

  const diagnoseFocusOverride: PopupRuntime["diagnoseFocusOverride"] = async (
    tabId
  ) => {
    if (!hasChromeApi(isExtensionPage, "scripting")) {
      return Result.fail(
        "拡張機能として開いてください（chrome-extension://...）"
      );
    }

    return await Result.try({
      try: async () => {
        const injected = await chrome.scripting.executeScript<
          [],
          FocusOverrideDiagnosticSnapshot
        >({
          target: { tabId },
          world: "MAIN",
          func: () => ({
            markerPresent:
              document.documentElement?.getAttribute(
                "data-mbu-focus-override-applied"
              ) === "true",
            visibilityState: document.visibilityState,
            hidden: document.hidden,
            hasFocus: document.hasFocus(),
          }),
        });

        const snapshot = injected.at(0)?.result;
        if (!snapshot) {
          throw new Error("診断結果を取得できませんでした");
        }
        return snapshot;
      },
      catch: (error) =>
        toErrorMessage(error, "フォーカス維持の診断に失敗しました"),
    });
  };

  const reloadTab: PopupRuntime["reloadTab"] = async (tabId) => {
    if (!hasChromeApi(isExtensionPage, "tabs")) {
      return Result.fail(
        "拡張機能として開いてください（chrome-extension://...）"
      );
    }

    return await wrapChromeApi<void>((resolve, reject) => {
      chrome.tabs.reload(tabId, undefined, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    }, "タブの再読み込みに失敗しました");
  };

  const sendMessageToBackground: PopupRuntime["sendMessageToBackground"] =
    async <TRequest, TResponse>(
      message: TRequest
    ): Promise<Result.Result<TResponse, string>> => {
      if (!hasChromeApi(isExtensionPage, "runtime")) {
        return Result.fail(
          "拡張機能として開いてください（chrome-extension://...）"
        );
      }
      return await wrapChromeApi<TResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve(response as TResponse);
        });
      }, "バックグラウンドへのメッセージ送信に失敗しました");
    };

  const sendMessageToTab: PopupRuntime["sendMessageToTab"] = async <
    TRequest,
    TResponse,
  >(
    tabId: number,
    message: TRequest
  ): Promise<Result.Result<TResponse, string>> => {
    if (!hasChromeApi(isExtensionPage, "tabs")) {
      return Result.fail(
        "拡張機能として開いてください（chrome-extension://...）"
      );
    }
    return await wrapChromeApi<TResponse>((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(response as TResponse);
      });
    }, "タブへのメッセージ送信に失敗しました");
  };

  const openUrl: PopupRuntime["openUrl"] = (url) => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    if (hasChromeApi(isExtensionPage, "tabs")) {
      chrome.tabs.create({ url: trimmed });
      return;
    }
    window.open(trimmed, "_blank", "noopener,noreferrer");
  };

  return {
    isExtensionPage,
    storageSyncGet,
    storageSyncSet,
    storageLocalGet,
    storageLocalSet,
    storageLocalRemove,
    getActiveTab,
    getActiveTabId,
    matchesFocusOverridePatterns,
    diagnoseFocusOverride,
    reloadTab,
    sendMessageToBackground,
    sendMessageToTab,
    openUrl,
  };
}
