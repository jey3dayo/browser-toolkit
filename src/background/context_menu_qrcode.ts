import { sendMessageToTab } from "@/background/messaging";
import type {
  ContentScriptMessage,
  ContextMenuTabParams,
} from "@/background/types";
import { t } from "@/i18n";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog, toErrorMessage } from "@/utils/errors";
import { showErrorNotification } from "@/utils/notifications";

type QrCodeContextMenuTabParams = ContextMenuTabParams & {
  pageUrl?: string;
};

const RECEIVING_END_DOES_NOT_EXIST_FRAGMENT = "Receiving end does not exist";

function resolveQrCodeUrl(params: QrCodeContextMenuTabParams): string {
  return params.tab?.url?.trim() || params.pageUrl?.trim() || "";
}

function buildShowQrCodeMessage(url: string): ContentScriptMessage {
  return {
    action: "showQrCodeOverlay",
    url,
  };
}

function isMissingContentScriptError(error: unknown): boolean {
  const message = toErrorMessage(error, "");
  return message.includes(RECEIVING_END_DOES_NOT_EXIST_FRAGMENT);
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    files: ["dist/content.js"],
    target: { tabId },
  });
}

export async function handleQrCodeContextMenuClick(
  params: QrCodeContextMenuTabParams
): Promise<void> {
  const url = resolveQrCodeUrl(params);
  if (!url) {
    await debugLog(
      "handleQrCodeContextMenuClick",
      "no url available",
      { pageUrl: params.pageUrl, tabId: params.tabId },
      "error"
    );
    await showErrorNotification({
      errorMessage: t("background.qrCode.missingUrl"),
      hint: t("background.qrCode.reloadAndRetry"),
      title: t("background.qrCode.unavailableTitle"),
    });
    return;
  }

  const message = buildShowQrCodeMessage(url);

  try {
    await sendMessageToTab(params.tabId, message);
  } catch (error) {
    if (isMissingContentScriptError(error)) {
      await debugLog(
        "handleQrCodeContextMenuClick",
        "content script missing, reinjecting and retrying",
        { error: formatErrorLog("", {}, error), tabId: params.tabId, url },
        "info"
      );

      try {
        await injectContentScript(params.tabId);
        await sendMessageToTab(params.tabId, message);
        return;
      } catch (retryError) {
        await debugLog(
          "handleQrCodeContextMenuClick",
          "retry after content script injection failed",
          {
            error: formatErrorLog("", {}, retryError),
            tabId: params.tabId,
            url,
          },
          "error"
        );
        await showErrorNotification({
          errorMessage: toErrorMessage(
            retryError,
            t("background.qrCode.pageUnavailable")
          ),
          hint: t("background.qrCode.reloadAndRetry"),
          title: t("background.qrCode.unavailableTitle"),
        });
        return;
      }
    }

    debugLog(
      "handleQrCodeContextMenuClick",
      "sendMessageToTab failed",
      { error: formatErrorLog("", {}, error), tabId: params.tabId },
      "error"
    ).catch(() => {
      // no-op
    });
    await showErrorNotification({
      errorMessage: toErrorMessage(error, t("background.qrCode.displayFailed")),
      hint: t("background.qrCode.reloadAndRetry"),
      title: t("background.qrCode.unavailableTitle"),
    });
  }
}
