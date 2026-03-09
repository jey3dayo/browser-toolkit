import { sendMessageToTab } from "@/background/messaging";
import type {
  ContentScriptMessage,
  ContextMenuTabParams,
} from "@/background/types";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export async function handleQrCodeContextMenuClick(
  params: ContextMenuTabParams
): Promise<void> {
  const url = params.tab?.url?.trim() ?? "";
  if (!url) {
    await debugLog(
      "handleQrCodeContextMenuClick",
      "no url available",
      { tabId: params.tabId },
      "error"
    );
    return;
  }

  await sendMessageToTab(params.tabId, {
    action: "showQrCodeOverlay",
    url,
  } satisfies ContentScriptMessage).catch((error) => {
    // content script が注入されていないページ（chrome:// 等）では失敗するため info レベルで記録
    debugLog(
      "handleQrCodeContextMenuClick",
      "sendMessageToTab failed (content script not available)",
      { tabId: params.tabId, error: formatErrorLog("", {}, error) },
      "info"
    ).catch(() => {
      // no-op
    });
  });
}
