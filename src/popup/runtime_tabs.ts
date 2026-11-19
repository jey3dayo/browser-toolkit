import { Result } from "@praha/byethrow";
import { getPaneSurfacePage } from "@/popup/panes";
import type {
  ActiveTabInfo,
  FocusOverrideDiagnosticSnapshot,
  PopupRuntime,
} from "@/popup/runtime";
import { hasChromeApi, wrapChromeApi } from "@/popup/runtime_chrome";
import { toErrorMessage } from "@/utils/errors";
import { matchesAnyPattern } from "@/utils/url-pattern";

const SEARCH_RESULT_TAB_MATCH_PATTERNS = [
  "*://www.google.com/search*",
  "*://www.google.co.jp/search*",
];

const WEB_PAGE_URL_PREFIXES = ["http://", "https://"];

function pickMostRecentlyAccessedTab(
  tabs: chrome.tabs.Tab[]
): chrome.tabs.Tab | null {
  let picked: chrome.tabs.Tab | null = null;
  for (const tab of tabs) {
    if (tab.id === undefined) {
      continue;
    }
    if (picked === null) {
      picked = tab;
      continue;
    }
    const candidate: number | undefined = tab.lastAccessed;
    const current: number | undefined = picked.lastAccessed;
    if (typeof candidate !== "number") {
      continue;
    }
    if (typeof current !== "number" || candidate > current) {
      picked = tab;
    }
  }
  return picked;
}

function pickMostRecentlyAccessedTabId(tabs: chrome.tabs.Tab[]): number | null {
  return pickMostRecentlyAccessedTab(tabs)?.id ?? null;
}

function isWebPageUrl(url: string | undefined): url is string {
  return (
    url !== undefined &&
    WEB_PAGE_URL_PREFIXES.some((prefix) => url.startsWith(prefix))
  );
}

export type PopupTabsRuntime = Pick<
  PopupRuntime,
  | "getActiveTab"
  | "getActiveTabId"
  | "getSearchResultTabId"
  | "matchesFocusOverridePatterns"
  | "diagnoseFocusOverride"
  | "reloadTab"
  | "sendMessageToBackground"
  | "sendMessageToTab"
  | "openOptionsPane"
  | "openUrl"
>;

export function createPopupTabs(isExtensionPage: boolean): PopupTabsRuntime {
  const getActiveTab: PopupRuntime["getActiveTab"] = async () => {
    if (!hasChromeApi(isExtensionPage, "tabs")) {
      return Result.succeed(null);
    }
    const extensionUrlPrefix = chrome.runtime.getURL("");
    return await wrapChromeApi<ActiveTabInfo | null>((resolve, reject) => {
      // options.html is itself the active tab; target the last web tab instead
      const resolveFromWebTabs = (): void => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          const fallbackErr = chrome.runtime.lastError;
          if (fallbackErr) {
            reject(new Error(fallbackErr.message));
            return;
          }
          const picked = pickMostRecentlyAccessedTab(
            tabs.filter((tab) => isWebPageUrl(tab.url))
          );
          const pickedId = picked?.id;
          if (pickedId === undefined) {
            resolve(null);
            return;
          }
          resolve({ id: pickedId, title: picked?.title, url: picked?.url });
        });
      };

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
          const url = tab?.url;
          if (
            url === undefined ||
            url.startsWith(extensionUrlPrefix) ||
            url.startsWith("chrome://")
          ) {
            resolveFromWebTabs();
            return;
          }
          resolve({ id, title: tab?.title, url });
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

  const getSearchResultTabId: PopupRuntime["getSearchResultTabId"] =
    async () => {
      if (!hasChromeApi(isExtensionPage, "tabs")) {
        return Result.succeed(null);
      }
      return await wrapChromeApi<number | null>((resolve, reject) => {
        chrome.tabs.query(
          { url: SEARCH_RESULT_TAB_MATCH_PATTERNS },
          (result) => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
              return;
            }
            resolve(pickMostRecentlyAccessedTabId(result));
          }
        );
      }, "検索結果タブの取得に失敗しました");
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
      catch: (error) =>
        toErrorMessage(error, "フォーカス維持の診断に失敗しました"),
      try: async () => {
        const injected = await chrome.scripting.executeScript<
          [],
          FocusOverrideDiagnosticSnapshot
        >({
          func: () => ({
            hasFocus: document.hasFocus(),
            hidden: document.hidden,
            markerPresent:
              document.documentElement?.getAttribute(
                "data-mbu-focus-override-applied"
              ) === "true",
            visibilityState: document.visibilityState,
          }),
          target: { tabId },
          world: "MAIN",
        });

        const snapshot = injected.at(0)?.result;
        if (!snapshot) {
          throw new Error("診断結果を取得できませんでした");
        }
        return snapshot;
      },
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

  const openOptionsPane: PopupRuntime["openOptionsPane"] = async (
    paneId,
    options
  ) => {
    if (!hasChromeApi(isExtensionPage, "tabs")) {
      return Result.fail(
        "拡張機能として開いてください（chrome-extension://...）"
      );
    }

    const focusQuery = options?.focus === "token" ? "?focus=token" : "";
    const page = getPaneSurfacePage(paneId);
    return await wrapChromeApi<void>((resolve, reject) => {
      chrome.tabs.create(
        { url: chrome.runtime.getURL(`${page}#${paneId}${focusQuery}`) },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    }, "設定ページを開けませんでした");
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
    diagnoseFocusOverride,
    getActiveTab,
    getActiveTabId,
    getSearchResultTabId,
    matchesFocusOverridePatterns,
    openOptionsPane,
    openUrl,
    reloadTab,
    sendMessageToBackground,
    sendMessageToTab,
  };
}
