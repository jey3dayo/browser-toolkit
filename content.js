// Content Script - Webページに注入される

// ========================================
// 1. ユーティリティ関数
// ========================================

/**
 * ワイルドカードパターンを正規表現に変換
 * @param {string} pattern - ワイルドカードパターン（例: *.example.com/path/*）
 * @returns {RegExp} - 正規表現オブジェクト
 */
function patternToRegex(pattern) {
  // エスケープ処理: 正規表現の特殊文字をエスケープ（*を除く）
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*'); // * を .* に変換

  return new RegExp(`^${escaped}$`);
}

/**
 * 現在のURLが登録パターンにマッチするかチェック
 * @param {string[]} patterns - 登録済みパターン配列
 * @returns {boolean} - マッチしたらtrue
 */
function matchesAnyPattern(patterns) {
  const url = window.location.href;

  // プロトコルを除去したURLを生成（http/https両対応）
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');

  return patterns.some(pattern => {
    // パターンからプロトコルを除去
    const patternWithoutProtocol = pattern.replace(/^https?:\/\//, '');
    const regex = patternToRegex(patternWithoutProtocol);

    return regex.test(urlWithoutProtocol);
  });
}

// ========================================
// 2. メッセージリスナー
// ========================================

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enableTableSort') {
    enableTableSort();
    startTableObserver(); // MutationObserverも開始
    sendResponse({ success: true });
  }
  return true;
});

// ========================================
// 3. テーブルソート機能
// ========================================

/**
 * 単一テーブルに対してソート機能を有効化
 * @param {HTMLTableElement} table - 対象テーブル
 */
function enableSingleTable(table) {
  if (table.dataset.sortable) return; // 既に有効化済み

  table.dataset.sortable = 'true';
  const headers = table.querySelectorAll('th');

  headers.forEach((header, index) => {
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.title = 'クリックでソート';

    header.addEventListener('click', () => {
      sortTable(table, index);
    });
  });
}

/**
 * ページ内の全テーブルに対してソート機能を有効化
 */
function enableTableSort() {
  const tables = document.querySelectorAll('table');

  tables.forEach(table => {
    enableSingleTable(table);
  });

  if (tables.length > 0) {
    showNotification(`${tables.length}個のテーブルでソートを有効化しました`);
  }
}

function sortTable(table, columnIndex) {
  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr')).filter(row =>
    row.parentNode === tbody
  );

  const isAscending = table.dataset.sortOrder !== 'asc';
  table.dataset.sortOrder = isAscending ? 'asc' : 'desc';

  rows.sort((a, b) => {
    const aCell = a.cells[columnIndex]?.textContent.trim() || '';
    const bCell = b.cells[columnIndex]?.textContent.trim() || '';

    // 数値として比較できる場合は数値比較
    const aNum = parseFloat(aCell);
    const bNum = parseFloat(bCell);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return isAscending ? aNum - bNum : bNum - aNum;
    }

    // 文字列比較
    return isAscending
      ? aCell.localeCompare(bCell, 'ja')
      : bCell.localeCompare(aCell, 'ja');
  });

  rows.forEach(row => tbody.appendChild(row));
}

// ========================================
// 4. MutationObserver（動的テーブル検出）
// ========================================

let tableObserver = null;

/**
 * MutationObserverを開始（動的テーブル検出用）
 */
function startTableObserver() {
  // 既に起動中なら何もしない
  if (tableObserver) return;

  // debounce用のタイマー
  let debounceTimer = null;

  tableObserver = new MutationObserver(() => {
    // debounce: 300ms以内の連続呼び出しをまとめる
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkForNewTables();
    }, 300);
  });

  // document.body全体を監視
  tableObserver.observe(document.body, {
    childList: true,      // 子要素の追加・削除を監視
    subtree: true         // 子孫要素も監視
  });
}

/**
 * 新しいテーブルをチェックして有効化
 */
function checkForNewTables() {
  const tables = document.querySelectorAll('table:not([data-sortable])');

  if (tables.length > 0) {
    tables.forEach(table => {
      enableSingleTable(table);
    });

    // 通知は1回のみ
    showNotification(`${tables.length}個の新しいテーブルでソートを有効化しました`);
  }
}

/**
 * MutationObserverを停止
 */
function stopTableObserver() {
  if (tableObserver) {
    tableObserver.disconnect();
    tableObserver = null;
  }
}

// ========================================
// 5. UI・通知関連
// ========================================

// 範囲選択テキストのAI連携（右クリックメニュー用）
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // 選択テキストをストレージに保存
    chrome.storage.local.set({ selectedText });
  }
});

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4285f4;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// アニメーション用CSS
if (!document.getElementById('my-browser-utils-styles')) {
  const style = document.createElement('style');
  style.id = 'my-browser-utils-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// ========================================
// 6. 自動実行ロジック
// ========================================

/**
 * ページ読み込み時に自動実行
 * 登録されたドメインパターンにマッチする場合、自動的にテーブルソートを有効化
 */
(async function autoEnableTableSort() {
  try {
    // chrome.storage.syncから設定を取得
    const { domainPatterns = [], autoEnableSort = false } =
      await chrome.storage.sync.get(['domainPatterns', 'autoEnableSort']);

    // グローバルフラグがONの場合は全サイトで有効化
    if (autoEnableSort) {
      enableTableSort();
      startTableObserver();
      return;
    }

    // ドメインパターンマッチング
    if (domainPatterns.length > 0 && matchesAnyPattern(domainPatterns)) {
      enableTableSort();
      startTableObserver();
    }
  } catch (error) {
    console.error('Auto-enable table sort failed:', error);
  }
})();
