// Background Service Worker

type ContentScriptMessage = {
  action: "showNotification";
  message: string;
};

const CONTEXT_MENU_ID = "ai-process-text";

chrome.runtime.onInstalled.addListener(() => {
  console.log("My Browser Utils installed");

  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "選択テキストをAIで処理",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;

    const selectedText = info.selectionText;
    console.log("Selected text:", selectedText);

    const tabId = tab?.id;
    if (tabId === undefined) {
      return;
    }

    const message: ContentScriptMessage = {
      action: "showNotification",
      message: "AI処理機能は開発中です",
    };

    chrome.tabs.sendMessage(tabId, message);
  },
);

chrome.runtime.onMessage.addListener(
  (
    _request: unknown,
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response?: unknown) => void,
  ) => {
    return true;
  },
);
