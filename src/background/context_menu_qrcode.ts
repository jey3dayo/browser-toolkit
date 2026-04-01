import { sendMessageToTab } from "@/background/messaging";
import type {
  ContentScriptMessage,
  ContextMenuTabParams,
} from "@/background/types";
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
    target: { tabId },
    files: ["dist/content.js"],
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
      { tabId: params.tabId, pageUrl: params.pageUrl },
      "error"
    );
    await showErrorNotification({
      title: "QRコードを表示できません",
      errorMessage: "このページのURLを取得できませんでした",
      hint: "ページを再読み込みしてから、もう一度お試しください。",
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
        { tabId: params.tabId, url, error: formatErrorLog("", {}, error) },
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
            tabId: params.tabId,
            url,
            error: formatErrorLog("", {}, retryError),
          },
          "error"
        );
        await showErrorNotification({
          title: "QRコードを表示できません",
          errorMessage: toErrorMessage(
            retryError,
            "このページではQRコードを表示できませんでした"
          ),
          hint: "ページを再読み込みしてから、もう一度お試しください。",
        });
        return;
      }
    }

    debugLog(
      "handleQrCodeContextMenuClick",
      "sendMessageToTab failed",
      { tabId: params.tabId, error: formatErrorLog("", {}, error) },
      "error"
    ).catch(() => {
      // no-op
    });
    await showErrorNotification({
      title: "QRコードを表示できません",
      errorMessage: toErrorMessage(error, "QRコードの表示に失敗しました"),
      hint: "ページを再読み込みしてから、もう一度お試しください。",
    });
  }
}
