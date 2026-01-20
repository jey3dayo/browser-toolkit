/**
 * Context menu click handlers.
 * Handles search engine and text template menu item clicks.
 */

import {
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
