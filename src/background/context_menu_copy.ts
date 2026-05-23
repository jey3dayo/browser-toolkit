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
import { t } from "@/i18n";
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
  return t("background.copyTitleLink.title");
}

function buildCopyTitleLinkFallbackSecondary(errorMessage: string): string {
  return [
    t("background.copyTitleLink.fallbackSecondary"),
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
  params: ContextMenuTabParams,
  formatOverride?: LinkFormat
): Promise<void> {
  const title = params.tab?.title?.trim() ?? "";
  const url = params.tab?.url?.trim() ?? "";
  const format = formatOverride ?? (await loadLinkFormatPreference());
  const formatted = formatLink({ title, url }, format);
  const fallback = title && url ? `${title}\n${url}` : url || title;
  const text = formatted || fallback;
  if (!text.trim()) {
    await sendMessageToTab(params.tabId, {
      action: "showNotification",
      message: t("background.copyTitleLink.emptyContent"),
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
        successMessage: t("background.copyTitleLink.copied"),
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
    const errorMessage = toErrorMessage(
      error,
      t("background.copyTitleLink.copyFailed")
    );
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

    // Chrome通知の文字数制限を考慮してシンプルなメッセージにする
    await showErrorNotification({
      title: t("background.copyTitleLink.copyFailed"),
      errorMessage,
      hint: t("background.copyTitleLink.fallbackHint"),
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

  const pageLabel =
    failure.pageUrl ||
    failure.pageTitle ||
    t("background.copyTitleLink.fallbackPage");
  try {
    chrome.action.setBadgeText({ text: "!", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#e5484d", tabId });
    chrome.action.setTitle({
      title: t("background.copyTitleLink.badgeTitle", {
        appName: APP_NAME,
        pageLabel,
      }),
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
