import { APP_NAME } from "@/app_meta";
import { sendMessageToTab } from "@/background/messaging";
import {
  storageLocalGet,
  storageLocalRemove,
  storageLocalSet,
  storageSyncGet,
} from "@/background/storage";
import type {
  ContentScriptMessage,
  ContextMenuTabParams,
  SyncStorageData,
} from "@/background/types";
import type { CopyTitleLinkFailure } from "@/storage/types";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog, toErrorMessage } from "@/utils/errors";
import {
  coerceLinkFormat,
  formatLink,
  type LinkFormat,
} from "@/utils/link_format";
import { showErrorNotification } from "@/utils/notifications";

const DEFAULT_LINK_FORMAT: LinkFormat = "text";

function buildCopyTitleLinkOverlayTitle(): string {
  return "タイトルとリンクをコピー";
}

function buildCopyTitleLinkFallbackSecondary(errorMessage: string): string {
  return [
    "自動コピーに失敗しました。上のボタンでコピーしてください。",
    "",
    errorMessage,
  ].join("\n");
}

async function showCopyTitleLinkOverlay(params: {
  tabId: number;
  text: string;
  secondary: string;
}): Promise<void> {
  await sendMessageToTab(params.tabId, {
    action: "showActionOverlay",
    status: "ready",
    mode: "text",
    source: "page",
    title: buildCopyTitleLinkOverlayTitle(),
    primary: params.text,
    secondary: params.secondary,
  } satisfies ContentScriptMessage);
}

async function loadLinkFormatPreference(): Promise<LinkFormat> {
  try {
    const stored = (await storageSyncGet(["linkFormat"])) as SyncStorageData;
    const format = coerceLinkFormat(stored.linkFormat);
    return format ?? DEFAULT_LINK_FORMAT;
  } catch (error) {
    await debugLog(
      "loadLinkFormatPreference",
      "failed",
      { error: formatErrorLog("", {}, error) },
      "error"
    );
    return DEFAULT_LINK_FORMAT;
  }
}

export async function handleCopyTitleLinkContextMenuClick(
  params: ContextMenuTabParams
): Promise<void> {
  const title = params.tab?.title?.trim() ?? "";
  const url = params.tab?.url?.trim() ?? "";
  const format = await loadLinkFormatPreference();
  const formatted = formatLink({ title, url }, format);
  const fallback = title && url ? `${title}\n${url}` : url || title;
  const text = formatted || fallback;
  if (!text.trim()) {
    await sendMessageToTab(params.tabId, {
      action: "showNotification",
      message: "コピーする内容がありません",
    } satisfies ContentScriptMessage).catch(() => {
      // no-op
    });
    return;
  }

  try {
    await clearCopyTitleLinkFailureIndicator(params.tabId);

    const result: { ok: true } | { ok: false; error: string } =
      await sendMessageToTab(params.tabId, {
        action: "copyToClipboard",
        text,
        successMessage: "コピーしました",
      } satisfies ContentScriptMessage);

    if (result.ok) {
      return;
    }

    await showCopyTitleLinkOverlay({
      tabId: params.tabId,
      text,
      secondary: buildCopyTitleLinkFallbackSecondary(result.error),
    });
  } catch (error) {
    const errorMessage = toErrorMessage(error, "コピーに失敗しました");
    await debugLog(
      "handleCopyTitleLinkContextMenuClick",
      "failed",
      {
        tabId: params.tabId,
        title,
        url,
        format,
        errorMessage,
        error: formatErrorLog("", {}, error),
      },
      "error"
    );
    console.error(
      formatErrorLog(
        "copy title/link failed",
        { tabId: params.tabId, title, url, format, errorMessage },
        error
      )
    );

    await showErrorNotification({
      title: "コピーに失敗しました",
      errorMessage: [
        errorMessage,
        "",
        title ? `タイトル: ${title}` : null,
        url ? `URL: ${url}` : null,
        "",
        "ポップアップの「リンク作成」タブからコピーできます。",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const overlayShown = await showCopyTitleLinkOverlay({
      tabId: params.tabId,
      text,
      secondary: errorMessage,
    })
      .then(() => true)
      .catch(() => false);

    if (!overlayShown) {
      await showCopyTitleLinkFailureIndicator(params.tabId, {
        occurredAt: Date.now(),
        tabId: params.tabId,
        pageTitle: title,
        pageUrl: url,
        text,
        error: errorMessage,
        format,
      });
    }
  }
}

async function showCopyTitleLinkFailureIndicator(
  tabId: number,
  failure: CopyTitleLinkFailure
): Promise<void> {
  await storageLocalSet({ lastCopyTitleLinkFailure: failure }).catch(
    (error) => {
      debugLog(
        "showCopyTitleLinkFailureIndicator",
        "storageLocalSet failed",
        { tabId, error: formatErrorLog("", {}, error) },
        "error"
      ).catch(() => {
        // no-op
      });
    }
  );

  const pageLabel = failure.pageUrl || failure.pageTitle || "このページ";
  try {
    chrome.action.setBadgeText({ text: "!", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#e5484d", tabId });
    chrome.action.setTitle({
      title: `${APP_NAME}: このページではコピーできません\n${pageLabel}\n（ポップアップ「リンク作成」からコピーできます）`,
      tabId,
    });
  } catch (error) {
    await debugLog(
      "showCopyTitleLinkFailureIndicator",
      "chrome.action API failed",
      { tabId, error: formatErrorLog("", {}, error) },
      "error"
    );
  }
}

async function clearCopyTitleLinkFailureIndicator(
  tabId: number
): Promise<void> {
  const stored = await storageLocalGet(["lastCopyTitleLinkFailure"]).catch(
    () => null
  );
  const storedFailure =
    stored && typeof stored === "object"
      ? (
          stored as {
            lastCopyTitleLinkFailure?: { tabId?: unknown } | null;
          }
        ).lastCopyTitleLinkFailure
      : null;

  if (
    storedFailure &&
    typeof storedFailure.tabId === "number" &&
    storedFailure.tabId === tabId
  ) {
    await storageLocalRemove("lastCopyTitleLinkFailure").catch(() => {
      // no-op
    });
  }

  try {
    chrome.action.setBadgeText({ text: "", tabId });
    chrome.action.setTitle({ title: APP_NAME, tabId });
  } catch {
    // no-op
  }
}
