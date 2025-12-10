// Background Service Worker

// インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('My Browser Utils installed');

  // 右クリックメニューの作成
  chrome.contextMenus.create({
    id: 'ai-process-text',
    title: '選択テキストをAIで処理',
    contexts: ['selection']
  });
});

// 右クリックメニューのクリックイベント
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ai-process-text') {
    const selectedText = info.selectionText;

    // TODO: AI処理の実装
    // ここにAI APIとの連携コードを追加
    console.log('Selected text:', selectedText);

    // 一時的な処理例
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: 'AI処理機能は開発中です'
    });
  }
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 将来的な拡張用
  return true;
});
