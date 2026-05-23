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
  handleBatchSearchClick,
  handleSearchEngineClick,
  handleTemplateClick,
} from "@/background/context_menu_handlers";
import {
  CONTEXT_MENU_ACTION_PREFIX,
  CONTEXT_MENU_BATCH_SEARCH_PARENT_ID,
  CONTEXT_MENU_BATCH_SEARCH_PREFIX,
  CONTEXT_MENU_BUILTIN_SEPARATOR_ID,
  CONTEXT_MENU_CALENDAR_ID,
  CONTEXT_MENU_COPY_LINK_PREFIX,
  CONTEXT_MENU_COPY_TITLE_LINK_ID,
  CONTEXT_MENU_CUSTOM_SEPARATOR_ID,
  CONTEXT_MENU_QR_CODE_ID,
  CONTEXT_MENU_ROOT_ID,
  CONTEXT_MENU_SEARCH_PARENT_ID,
  CONTEXT_MENU_SEARCH_PREFIX,
  CONTEXT_MENU_SEARCH_SEPARATOR_ID,
  CONTEXT_MENU_SETTINGS_ID,
  CONTEXT_MENU_TEMPLATE_PREFIX,
  CONTEXT_MENU_TEMPLATE_ROOT_ID,
} from "@/background/context_menu_ids";
import { handleQrCodeContextMenuClick } from "@/background/context_menu_qrcode";
import {
  ensureContextActionsInitialized,
  ensureSearchEngineGroupsInitialized,
  ensureSearchEnginesInitialized,
  ensureTextTemplatesInitialized,
} from "@/background/context_menu_storage";
import { t } from "@/i18n";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";
import {
  CONTEXT_MENU_LINK_FORMATS,
  coerceLinkFormat,
  LINK_FORMAT_OPTIONS,
} from "@/utils/link_format";

let contextMenuRefreshQueue: Promise<void> = Promise.resolve();
const LINK_FORMAT_LABELS = new Map(
  LINK_FORMAT_OPTIONS.map((option) => [option.value, option.label])
);
type ContextMenuContexts = chrome.contextMenus.CreateProperties["contexts"];

const ROOT_MENU_CONTEXTS: ContextMenuContexts = [
  "page",
  "selection",
  "editable",
];

function createBuiltinRootMenuItems(): chrome.contextMenus.CreateProperties[] {
  return [
    {
      id: CONTEXT_MENU_QR_CODE_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: t("contextMenu.qrCode"),
      contexts: ROOT_MENU_CONTEXTS,
    },
    {
      id: CONTEXT_MENU_CALENDAR_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: t("contextMenu.calendar"),
      contexts: ROOT_MENU_CONTEXTS,
    },
    {
      id: CONTEXT_MENU_BUILTIN_SEPARATOR_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      type: "separator",
      contexts: ROOT_MENU_CONTEXTS,
    },
  ];
}

function runSequentially<T>(
  items: readonly T[],
  task: (item: T) => Promise<void>
): Promise<void> {
  return items.reduce(
    (previous, item) => previous.then(() => task(item)),
    Promise.resolve()
  );
}

/**
 * Exact-match menu items ハンドラー。処理した場合 true を返す。
 */
function handleExactMenuItemClick(
  menuItemId: string,
  tabId: number,
  tab: chrome.tabs.Tab | undefined,
  info: chrome.contextMenus.OnClickData
): boolean {
  if (menuItemId === CONTEXT_MENU_QR_CODE_ID) {
    handleQrCodeContextMenuClick({
      tabId,
      tab,
      pageUrl: info.pageUrl,
    }).catch(() => {
      // no-op
    });
    return true;
  }
  if (menuItemId === CONTEXT_MENU_CALENDAR_ID) {
    handleCalendarContextMenuClick({ tabId, info, tab }).catch(() => {
      // no-op
    });
    return true;
  }
  if (menuItemId === CONTEXT_MENU_SETTINGS_ID) {
    chrome.tabs
      .create({
        url: chrome.runtime.getURL("popup.html#pane-settings"),
      })
      .catch(() => {
        // no-op
      });
    return true;
  }
  return false;
}

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

      if (menuItemId.startsWith(CONTEXT_MENU_COPY_LINK_PREFIX)) {
        const formatId = menuItemId.slice(CONTEXT_MENU_COPY_LINK_PREFIX.length);
        const format = coerceLinkFormat(formatId) ?? undefined;
        handleCopyTitleLinkContextMenuClick({ tabId, tab }, format).catch(
          () => {
            // no-op
          }
        );
        return;
      }

      if (handleExactMenuItemClick(menuItemId, tabId, tab, info)) {
        return;
      }

      if (menuItemId.startsWith(CONTEXT_MENU_SEARCH_PREFIX)) {
        const engineId = menuItemId.slice(CONTEXT_MENU_SEARCH_PREFIX.length);
        handleSearchEngineClick(engineId, info).catch(() => {
          // no-op
        });
        return;
      }

      if (menuItemId.startsWith(CONTEXT_MENU_BATCH_SEARCH_PREFIX)) {
        const groupId = menuItemId.slice(
          CONTEXT_MENU_BATCH_SEARCH_PREFIX.length
        );
        handleBatchSearchClick(groupId, info).catch(() => {
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

    await createMenuItem({
      id: CONTEXT_MENU_ROOT_ID,
      title: APP_NAME,
      contexts: ROOT_MENU_CONTEXTS,
    });

    const [searchEngines, templates, actions] = await Promise.all([
      ensureSearchEnginesInitialized(),
      ensureTextTemplatesInitialized(),
      ensureContextActionsInitialized(),
    ]);

    // Search engines section
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
        title: t("contextMenu.search"),
        contexts: ["selection"],
      });

      await runSequentially(enabledEngines, (engine) =>
        debugLog("refreshContextMenus", "creating search engine menu", {
          engine,
        }).then(() =>
          createMenuItem({
            id: `${CONTEXT_MENU_SEARCH_PREFIX}${engine.id}`,
            parentId: CONTEXT_MENU_SEARCH_PARENT_ID,
            title: engine.name,
            contexts: ["selection"],
          })
        )
      );

      // Batch search groups section
      const groups = await ensureSearchEngineGroupsInitialized();
      const enabledGroups = groups.filter((group) => group.enabled);

      if (enabledGroups.length > 0) {
        await debugLog(
          "refreshContextMenus",
          "creating batch search parent menu"
        );
        await createMenuItem({
          id: CONTEXT_MENU_BATCH_SEARCH_PARENT_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          title: t("contextMenu.batchSearch"),
          contexts: ["selection"],
        });

        await runSequentially(enabledGroups, (group) =>
          debugLog("refreshContextMenus", "creating batch search menu", {
            group,
          }).then(() =>
            createMenuItem({
              id: `${CONTEXT_MENU_BATCH_SEARCH_PREFIX}${group.id}`,
              parentId: CONTEXT_MENU_BATCH_SEARCH_PARENT_ID,
              title: group.name,
              contexts: ["selection"],
            })
          )
        );
      }

      await createSeparator(
        CONTEXT_MENU_SEARCH_SEPARATOR_ID,
        CONTEXT_MENU_ROOT_ID,
        ["page", "selection"]
      );
    }

    // Text templates section
    const visibleTemplates = templates.filter((template) => !template.hidden);

    if (visibleTemplates.length > 0) {
      await createMenuItem({
        id: CONTEXT_MENU_TEMPLATE_ROOT_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: t("contextMenu.templates"),
        contexts: ROOT_MENU_CONTEXTS,
      });

      await runSequentially(visibleTemplates, (template) =>
        createMenuItem({
          id: `${CONTEXT_MENU_TEMPLATE_PREFIX}${template.id}`,
          parentId: CONTEXT_MENU_TEMPLATE_ROOT_ID,
          title: template.title,
          contexts: ROOT_MENU_CONTEXTS,
        })
      );
    }

    // Built-in actions
    await createMenuItem({
      id: CONTEXT_MENU_COPY_TITLE_LINK_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: t("contextMenu.copyTitleLink"),
      contexts: ROOT_MENU_CONTEXTS,
    });

    await runSequentially(CONTEXT_MENU_LINK_FORMATS, (format) => {
      const label = LINK_FORMAT_LABELS.get(format) ?? format;
      return createMenuItem({
        id: `${CONTEXT_MENU_COPY_LINK_PREFIX}${format}`,
        parentId: CONTEXT_MENU_COPY_TITLE_LINK_ID,
        title: label,
        contexts: ROOT_MENU_CONTEXTS,
      });
    });

    await runSequentially(createBuiltinRootMenuItems(), createMenuItem);

    // Custom context actions
    await runSequentially(actions, (action) =>
      createMenuItem({
        id: `${CONTEXT_MENU_ACTION_PREFIX}${action.id}`,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: action.title,
        contexts: ROOT_MENU_CONTEXTS,
      })
    );

    await createSeparator(
      CONTEXT_MENU_CUSTOM_SEPARATOR_ID,
      CONTEXT_MENU_ROOT_ID,
      ROOT_MENU_CONTEXTS
    );

    // Settings menu
    await createMenuItem({
      id: CONTEXT_MENU_SETTINGS_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: t("contextMenu.settings"),
      contexts: ROOT_MENU_CONTEXTS,
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
