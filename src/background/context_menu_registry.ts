import { APP_NAME } from "@/app_meta";
import {
  buildContextMenuSelectionContext,
  handleCalendarContextMenuClick,
  handleContextMenuClick,
  showContextMenuUnexpectedErrorOverlay,
} from "@/background/context_menu_actions";
import { handleCopyTitleLinkContextMenuClick } from "@/background/context_menu_copy";
import {
  CONTEXT_MENU_ACTION_PREFIX,
  CONTEXT_MENU_BUILTIN_SEPARATOR_ID,
  CONTEXT_MENU_CALENDAR_ID,
  CONTEXT_MENU_COPY_TITLE_LINK_ID,
  CONTEXT_MENU_CUSTOM_SEPARATOR_ID,
  CONTEXT_MENU_ROOT_ID,
  CONTEXT_MENU_SEARCH_PARENT_ID,
  CONTEXT_MENU_SEARCH_PREFIX,
  CONTEXT_MENU_SEARCH_SEPARATOR_ID,
  CONTEXT_MENU_SETTINGS_ID,
  CONTEXT_MENU_TEMPLATE_PREFIX,
  CONTEXT_MENU_TEMPLATE_ROOT_ID,
  CONTEXT_MENU_TEMPLATE_SEPARATOR_ID,
} from "@/background/context_menu_ids";
import { storageSyncGet, storageSyncSet } from "@/background/storage";
import type { SyncStorageData } from "@/background/types";
import {
  type ContextAction,
  DEFAULT_CONTEXT_ACTIONS,
  normalizeContextActions,
} from "@/context_actions";
import {
  buildSearchUrl,
  DEFAULT_SEARCH_ENGINES,
  normalizeSearchEngines,
  type SearchEngine,
} from "@/search_engines";
import { DEFAULT_TEXT_TEMPLATES, type TextTemplate } from "@/text_templates";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

let contextMenuRefreshQueue: Promise<void> = Promise.resolve();

export function registerContextMenuHandlers(): void {
  chrome.contextMenus.onClicked.addListener(
    (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
      if (typeof info.menuItemId !== "string") {
        return;
      }

      const tabId = tab?.id;
      if (tabId === undefined) {
        return;
      }

      const menuItemId = info.menuItemId;

      if (menuItemId === CONTEXT_MENU_COPY_TITLE_LINK_ID) {
        handleCopyTitleLinkContextMenuClick({ tabId, tab }).catch(() => {
          // no-op
        });
        return;
      }

      if (menuItemId === CONTEXT_MENU_CALENDAR_ID) {
        handleCalendarContextMenuClick({ tabId, info, tab }).catch(() => {
          // no-op
        });
        return;
      }

      if (menuItemId === CONTEXT_MENU_SETTINGS_ID) {
        chrome.tabs
          .create({
            url: chrome.runtime.getURL("popup.html#pane-settings"),
          })
          .catch(() => {
            // no-op
          });
        return;
      }

      if (menuItemId.startsWith(CONTEXT_MENU_SEARCH_PREFIX)) {
        const engineId = menuItemId.slice(CONTEXT_MENU_SEARCH_PREFIX.length);
        handleSearchEngineClick(engineId, info).catch(() => {
          // no-op
        });
        return;
      }

      if (menuItemId.startsWith(CONTEXT_MENU_TEMPLATE_PREFIX)) {
        const templateId = menuItemId.slice(
          CONTEXT_MENU_TEMPLATE_PREFIX.length
        );
        handleTemplateClick(tabId, templateId).catch(() => {
          // no-op
        });
        return;
      }

      if (!menuItemId.startsWith(CONTEXT_MENU_ACTION_PREFIX)) {
        return;
      }

      const selectionContext = buildContextMenuSelectionContext(info);
      const actionId = menuItemId.slice(CONTEXT_MENU_ACTION_PREFIX.length);
      ensureContextActionsInitialized()
        .then((actions) =>
          handleContextMenuClick({ tabId, actionId, info, tab }, actions)
        )
        .catch((error) => {
          showContextMenuUnexpectedErrorOverlay(
            tabId,
            selectionContext.initialSource,
            error
          ).catch(() => {
            // no-op
          });
        });
    }
  );
}

export async function refreshContextMenus(): Promise<void> {
  try {
    await new Promise<void>((resolve) => {
      chrome.contextMenus.removeAll(() => resolve());
    });

    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_ROOT_ID,
          title: APP_NAME,
          contexts: ["page", "selection", "editable"],
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });

    const searchEngines = await ensureSearchEnginesInitialized();
    const enabledEngines = searchEngines.filter((engine) => engine.enabled);

    await debugLog("refreshContextMenus", "searchEngines loaded", {
      searchEngines,
    });
    await debugLog("refreshContextMenus", "enabledEngines filtered", {
      enabledEngines,
    });

    if (enabledEngines.length > 0) {
      await debugLog("refreshContextMenus", "creating search parent menu");
      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.create(
          {
            id: CONTEXT_MENU_SEARCH_PARENT_ID,
            parentId: CONTEXT_MENU_ROOT_ID,
            title: "検索",
            contexts: ["selection"],
          },
          () => {
            const err = chrome.runtime.lastError;
            if (err) {
              debugLog(
                "refreshContextMenus",
                "search parent menu error",
                { error: err.message },
                "error"
              ).catch(() => {
                // デバッグログの失敗は無視（処理を継続）
              });
              reject(new Error(err.message));
              return;
            }
            debugLog("refreshContextMenus", "search parent menu created").catch(
              () => {
                // デバッグログの失敗は無視（処理を継続）
              }
            );
            resolve();
          }
        );
      });

      for (const engine of enabledEngines) {
        await debugLog("refreshContextMenus", "creating search engine menu", {
          engine,
        });
        await new Promise<void>((resolve, reject) => {
          chrome.contextMenus.create(
            {
              id: `${CONTEXT_MENU_SEARCH_PREFIX}${engine.id}`,
              parentId: CONTEXT_MENU_SEARCH_PARENT_ID,
              title: engine.name,
              contexts: ["selection"],
            },
            () => {
              const err = chrome.runtime.lastError;
              if (err) {
                debugLog(
                  "refreshContextMenus",
                  "search engine menu error",
                  { engine, error: err.message },
                  "error"
                ).catch(() => {
                  // デバッグログの失敗は無視（処理を継続）
                });
                reject(new Error(err.message));
                return;
              }
              debugLog("refreshContextMenus", "search engine menu created", {
                engine,
              }).catch(() => {
                // デバッグログの失敗は無視（処理を継続）
              });
              resolve();
            }
          );
        });
      }

      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.create(
          {
            id: CONTEXT_MENU_SEARCH_SEPARATOR_ID,
            parentId: CONTEXT_MENU_ROOT_ID,
            type: "separator",
            contexts: ["page", "selection"],
          },
          () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
              return;
            }
            resolve();
          }
        );
      });
    }

    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_COPY_TITLE_LINK_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          title: "タイトルとリンクをコピー",
          contexts: ["page", "selection", "editable"],
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_CALENDAR_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          title: "カレンダー登録",
          contexts: ["page", "selection", "editable"],
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_BUILTIN_SEPARATOR_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          type: "separator",
          contexts: ["page", "selection", "editable"],
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });

    const actions = await ensureContextActionsInitialized();
    for (const action of actions) {
      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.create(
          {
            id: `${CONTEXT_MENU_ACTION_PREFIX}${action.id}`,
            parentId: CONTEXT_MENU_ROOT_ID,
            title: action.title,
            contexts: ["page", "selection", "editable"],
          },
          () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
              return;
            }
            resolve();
          }
        );
      });
    }

    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_CUSTOM_SEPARATOR_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          type: "separator",
          contexts: ["page", "selection", "editable"],
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });

    const templates = await ensureTextTemplatesInitialized();
    const visibleTemplates = templates.filter((template) => !template.hidden);

    if (visibleTemplates.length > 0) {
      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.create(
          {
            id: CONTEXT_MENU_TEMPLATE_ROOT_ID,
            parentId: CONTEXT_MENU_ROOT_ID,
            title: "テキストテンプレート",
            contexts: ["page", "selection", "editable"],
          },
          () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
              return;
            }
            resolve();
          }
        );
      });

      for (const template of visibleTemplates) {
        await new Promise<void>((resolve, reject) => {
          chrome.contextMenus.create(
            {
              id: `${CONTEXT_MENU_TEMPLATE_PREFIX}${template.id}`,
              parentId: CONTEXT_MENU_TEMPLATE_ROOT_ID,
              title: template.title,
              contexts: ["page", "selection", "editable"],
            },
            () => {
              const err = chrome.runtime.lastError;
              if (err) {
                reject(new Error(err.message));
                return;
              }
              resolve();
            }
          );
        });
      }

      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.create(
          {
            id: CONTEXT_MENU_TEMPLATE_SEPARATOR_ID,
            parentId: CONTEXT_MENU_ROOT_ID,
            type: "separator",
            contexts: ["page", "selection", "editable"],
          },
          () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
              return;
            }
            resolve();
          }
        );
      });
    }

    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_SETTINGS_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          title: "設定",
          contexts: ["page", "selection", "editable"],
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });
  } catch (error) {
    await debugLog(
      "refreshContextMenus",
      "failed",
      { error: formatErrorLog("", {}, error) },
      "error"
    );
  }
}

async function ensureContextActionsInitialized(): Promise<ContextAction[]> {
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

async function ensureSearchEnginesInitialized(): Promise<SearchEngine[]> {
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

async function handleTemplateClick(
  tabId: number,
  templateId: string
): Promise<void> {
  const templates = await ensureTextTemplatesInitialized();
  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    return;
  }

  chrome.tabs
    .sendMessage(tabId, {
      action: "pasteTemplate",
      content: template.content,
    })
    .catch((error) => {
      debugLog(
        "handleTemplateClick",
        "chrome.tabs.sendMessage failed",
        {
          tabId,
          templateId,
          error: formatErrorLog("", {}, error),
        },
        "error"
      ).catch(() => {
        // no-op
      });
    });
}

async function handleSearchEngineClick(
  engineId: string,
  info: chrome.contextMenus.OnClickData
): Promise<void> {
  const selectionText = info.selectionText;
  if (!selectionText) {
    return;
  }

  const searchEngines = await ensureSearchEnginesInitialized();
  const engine = searchEngines.find((e) => e.id === engineId);
  if (!engine?.enabled) {
    return;
  }

  const searchUrl = buildSearchUrl(engine.urlTemplate, selectionText);
  chrome.tabs.create({ url: searchUrl }).catch((error) => {
    debugLog(
      "handleSearchEngineClick",
      "chrome.tabs.create failed",
      {
        engineId,
        selectionText,
        searchUrl,
        error: formatErrorLog("", {}, error),
      },
      "error"
    ).catch(() => {
      // no-op
    });
  });
}

export async function loadContextActions(): Promise<ContextAction[]> {
  const data = (await storageSyncGet(["contextActions"])) as SyncStorageData;
  return normalizeContextActions(data.contextActions);
}

export function scheduleRefreshContextMenus(): Promise<void> {
  // 直前の更新が失敗しても次回を止めないようにしつつ、
  // 非標準の thenable 等が混入しても壊れないように Promise.resolve で正規化する。
  contextMenuRefreshQueue = Promise.resolve(contextMenuRefreshQueue)
    .catch(() => {
      // no-op
    })
    .then(() => refreshContextMenus());
  return contextMenuRefreshQueue;
}
