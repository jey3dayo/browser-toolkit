/**
 * Context menu registry orchestrator.
 * Coordinates menu creation, refresh, and click event handling.
 */

import { APP_NAME } from "@/app_meta";
import {
  buildContextMenuSelectionContext,
  handleCalendarContextMenuClick,
  handleContextMenuClick,
  showContextMenuUnexpectedErrorOverlay,
} from "@/background/context_menu_actions";
import {
  createMenuItem,
  createSeparator,
  removeAllMenus,
} from "@/background/context_menu_builder";
import { handleCopyTitleLinkContextMenuClick } from "@/background/context_menu_copy";
import {
  handleSearchEngineClick,
  handleTemplateClick,
} from "@/background/context_menu_handlers";
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
import {
  ensureContextActionsInitialized,
  ensureSearchEnginesInitialized,
  ensureTextTemplatesInitialized,
} from "@/background/context_menu_storage";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

let contextMenuRefreshQueue: Promise<void> = Promise.resolve();

/**
 * Registers click handlers for all context menu items.
 * Routes clicks to appropriate handlers based on menu item ID.
 */
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

/**
 * Refreshes all context menus by rebuilding them from current settings.
 * Uses builder utilities to reduce code duplication.
 */
export async function refreshContextMenus(): Promise<void> {
  try {
    await removeAllMenus();

    // Root menu
    await createMenuItem({
      id: CONTEXT_MENU_ROOT_ID,
      title: APP_NAME,
      contexts: ["page", "selection", "editable"],
    });

    // Search engines section
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
      await createMenuItem({
        id: CONTEXT_MENU_SEARCH_PARENT_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "検索",
        contexts: ["selection"],
      });

      for (const engine of enabledEngines) {
        await debugLog("refreshContextMenus", "creating search engine menu", {
          engine,
        });
        await createMenuItem({
          id: `${CONTEXT_MENU_SEARCH_PREFIX}${engine.id}`,
          parentId: CONTEXT_MENU_SEARCH_PARENT_ID,
          title: engine.name,
          contexts: ["selection"],
        });
      }

      await createSeparator(
        CONTEXT_MENU_SEARCH_SEPARATOR_ID,
        CONTEXT_MENU_ROOT_ID,
        ["page", "selection"]
      );
    }

    // Built-in actions
    await createMenuItem({
      id: CONTEXT_MENU_COPY_TITLE_LINK_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: "タイトルとリンクをコピー",
      contexts: ["page", "selection", "editable"],
    });

    await createMenuItem({
      id: CONTEXT_MENU_CALENDAR_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: "カレンダー登録",
      contexts: ["page", "selection", "editable"],
    });

    await createSeparator(
      CONTEXT_MENU_BUILTIN_SEPARATOR_ID,
      CONTEXT_MENU_ROOT_ID,
      ["page", "selection", "editable"]
    );

    // Custom context actions
    const actions = await ensureContextActionsInitialized();
    for (const action of actions) {
      await createMenuItem({
        id: `${CONTEXT_MENU_ACTION_PREFIX}${action.id}`,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: action.title,
        contexts: ["page", "selection", "editable"],
      });
    }

    await createSeparator(
      CONTEXT_MENU_CUSTOM_SEPARATOR_ID,
      CONTEXT_MENU_ROOT_ID,
      ["page", "selection", "editable"]
    );

    // Text templates section
    const templates = await ensureTextTemplatesInitialized();
    const visibleTemplates = templates.filter((template) => !template.hidden);

    if (visibleTemplates.length > 0) {
      await createMenuItem({
        id: CONTEXT_MENU_TEMPLATE_ROOT_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "テキストテンプレート",
        contexts: ["page", "selection", "editable"],
      });

      for (const template of visibleTemplates) {
        await createMenuItem({
          id: `${CONTEXT_MENU_TEMPLATE_PREFIX}${template.id}`,
          parentId: CONTEXT_MENU_TEMPLATE_ROOT_ID,
          title: template.title,
          contexts: ["page", "selection", "editable"],
        });
      }

      await createSeparator(
        CONTEXT_MENU_TEMPLATE_SEPARATOR_ID,
        CONTEXT_MENU_ROOT_ID,
        ["page", "selection", "editable"]
      );
    }

    // Settings menu
    await createMenuItem({
      id: CONTEXT_MENU_SETTINGS_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: "設定",
      contexts: ["page", "selection", "editable"],
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

/**
 * Schedules a context menu refresh with queue management.
 * Ensures refreshes are executed sequentially to avoid race conditions.
 *
 * @returns Promise that resolves when the refresh is complete
 */
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
