/**
 * Context menu click handlers.
 * Handles search engine and text template menu item clicks.
 */

import {
  ensureSearchEngineGroupsInitialized,
  ensureSearchEnginesInitialized,
  ensureTextTemplatesInitialized,
} from "@/background/context_menu_storage";
import { buildSearchUrl } from "@/search_engines";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

/**
 * Handles search engine context menu click.
 * Creates a new tab with the search URL for the selected text.
 *
 * @param engineId - Search engine ID
 * @param info - Context menu click data
 */
export async function handleSearchEngineClick(
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

  const searchUrl = buildSearchUrl(
    engine.urlTemplate,
    selectionText,
    engine.encoding
  );
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

/**
 * Handles batch search context menu click.
 * Opens multiple tabs for all enabled engines in the group.
 *
 * @param groupId - Search engine group ID
 * @param info - Context menu click data
 */
export async function handleBatchSearchClick(
  groupId: string,
  info: chrome.contextMenus.OnClickData
): Promise<void> {
  const selectionText = info.selectionText;
  if (!selectionText) {
    return;
  }

  const [groups, engines] = await Promise.all([
    ensureSearchEngineGroupsInitialized(),
    ensureSearchEnginesInitialized(),
  ]);

  const group = groups.find((g) => g.id === groupId);
  if (!group?.enabled) {
    return;
  }

  // Filter to enabled engines that exist in the group
  const enabledEngines = group.engineIds
    .map((engineId) => engines.find((e) => e.id === engineId))
    .filter((e): e is NonNullable<typeof e> => e?.enabled ?? false);

  if (enabledEngines.length === 0) {
    return;
  }

  // Open all tabs in parallel
  const results = await Promise.allSettled(
    enabledEngines.map((engine) => {
      const searchUrl = buildSearchUrl(
        engine.urlTemplate,
        selectionText,
        engine.encoding
      );
      return chrome.tabs.create({ url: searchUrl });
    })
  );

  // Log any failures
  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );
  if (failures.length > 0) {
    debugLog(
      "handleBatchSearchClick",
      "Some tabs failed to open",
      {
        groupId,
        selectionText,
        totalEngines: enabledEngines.length,
        failures: failures.map((f) => formatErrorLog("", {}, f.reason)),
      },
      "error"
    ).catch(() => {
      // no-op
    });
  }
}

/**
 * Handles text template context menu click.
 * Sends a message to the content script to paste the template content.
 *
 * @param tabId - Tab ID where the template should be pasted
 * @param templateId - Template ID
 */
export async function handleTemplateClick(
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
        "Failed to paste template. Content script may not be loaded on this page.",
        {
          tabId,
          templateId,
          error: formatErrorLog("sendMessage error", {}, error),
        },
        "error"
      ).catch(() => {
        // no-op
      });
    });
}
