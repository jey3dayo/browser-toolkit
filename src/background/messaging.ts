export function sendMessageToTab<TRequest, TResponse>(
  tabId: number,
  message: TRequest
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: TResponse) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`このページでは実行できません（${err.message}）`));
        return;
      }
      resolve(response);
    });
  });
}
