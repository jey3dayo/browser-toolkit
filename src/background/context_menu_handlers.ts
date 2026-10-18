import {
  ensureSearchEngineGroupsInitialized,
  ensureSearchEnginesInitialized,
  ensureTextTemplatesInitialized,
} from "@/background/context_menu_storage";
import { buildSearchUrl } from "@/search_engines";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";
import { ignoreRejection } from "@/utils/ignore_rejection";

export async function handleSearchEngineClick(
  engineId: string,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  const { selectionText } = info;
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
    {
      query: selectionText,
      title: tab?.title,
      url: tab?.url ?? info.pageUrl,
    },
    engine.encoding
  );
  try {
    await chrome.tabs.create({ url: searchUrl });
  } catch (error) {
    ignoreRejection(
      debugLog(
        "handleSearchEngineClick",
        "chrome.tabs.create failed",
        {
          engineId,
          error: formatErrorLog("", {}, error),
          searchUrl,
          selectionText,
        },
        "error"
      ),
      "context_menu_handlers: search engine click error"
    );
  }
}

export async function handleBatchSearchClick(
  groupId: string,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  const { selectionText } = info;
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

  const enabledEngines = group.engineIds
    .map((engineId) => engines.find((e) => e.id === engineId))
    .filter((e): e is NonNullable<typeof e> => e?.enabled ?? false);

  if (enabledEngines.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    enabledEngines.map((engine) => {
      const searchUrl = buildSearchUrl(
        engine.urlTemplate,
        {
          query: selectionText,
          title: tab?.title,
          url: tab?.url ?? info.pageUrl,
        },
        engine.encoding
      );
      return chrome.tabs.create({ url: searchUrl });
    })
  );

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );
  if (failures.length > 0) {
    ignoreRejection(
      debugLog(
        "handleBatchSearchClick",
        "Some tabs failed to open",
        {
          failures: failures.map((f) => formatErrorLog("", {}, f.reason)),
          groupId,
          selectionText,
          totalEngines: enabledEngines.length,
        },
        "error"
      ),
      "context_menu_handlers: batch search failures"
    );
  }
}

export async function handleTemplateClick(
  tabId: number,
  templateId: string
): Promise<void> {
  const templates = await ensureTextTemplatesInitialized();
  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "pasteTemplate",
      content: template.content,
    });
  } catch (error) {
    ignoreRejection(
      debugLog(
        "handleTemplateClick",
        "Failed to paste template. Content script may not be loaded on this page.",
        {
          error: formatErrorLog("sendMessage error", {}, error),
          tabId,
          templateId,
        },
        "error"
      ),
      "context_menu_handlers: template click error"
    );
  }
}
