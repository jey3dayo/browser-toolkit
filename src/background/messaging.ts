import { t } from "@/i18n";

export function sendMessageToTab<TRequest, TResponse>(
  tabId: number,
  message: TRequest
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: TResponse) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(
          new Error(
            t("background.messaging.pageUnavailable", {
              message: err.message ?? "",
            })
          )
        );
        return;
      }
      resolve(response);
    });
  });
}
