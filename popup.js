// ポップアップの初期化
document.addEventListener('DOMContentLoaded', async () => {
  // 設定の読み込み
  const settings = await chrome.storage.sync.get(['autoEnableSort']);
  document.getElementById('auto-enable-sort').checked = settings.autoEnableSort || false;

  // ドメインパターンの読み込みと表示
  await loadPatterns();

  // テーブルソート有効化ボタン
  document.getElementById('enable-table-sort').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'enableTableSort' }, (response) => {
      if (response?.success) {
        showNotification('テーブルソートを有効化しました');
      }
    });
  });

  // ドメインパターン追加ボタン
  document.getElementById('add-pattern').addEventListener('click', handleAddPattern);

  // Enterキーでもパターンを追加
  document.getElementById('pattern-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddPattern();
    }
  });

  // 設定の保存
  document.getElementById('auto-enable-sort').addEventListener('change', (e) => {
    chrome.storage.sync.set({ autoEnableSort: e.target.checked });
  });
});

function showNotification(message, type = 'info') {
  // 簡易的な通知表示
  const notification = document.createElement('div');
  notification.textContent = message;

  const bgColor = type === 'error' ? '#e53935' : '#4285f4';

  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: ${bgColor};
    color: white;
    padding: 10px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
  `;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 2000);
}

// ========================================
// ドメインパターン管理機能
// ========================================

/**
 * 登録済みパターンを読み込んで表示
 */
async function loadPatterns() {
  const { domainPatterns = [] } = await chrome.storage.sync.get(['domainPatterns']);
  renderPatternList(domainPatterns);
}

/**
 * パターンリストをDOMに描画
 * @param {string[]} patterns - パターン配列
 */
function renderPatternList(patterns) {
  const listContainer = document.getElementById('pattern-list');

  if (patterns.length === 0) {
    listContainer.innerHTML = '<p class="empty-message">登録されたパターンはありません</p>';
    return;
  }

  listContainer.innerHTML = patterns
    .map((pattern, index) => `
      <div class="pattern-item" data-index="${index}">
        <span class="pattern-text">${escapeHtml(pattern)}</span>
        <button class="btn-delete" data-index="${index}">削除</button>
      </div>
    `)
    .join('');

  // 削除ボタンのイベントリスナー
  listContainer.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', handleDeletePattern);
  });
}

/**
 * パターン追加ハンドラ
 */
async function handleAddPattern() {
  const input = document.getElementById('pattern-input');
  const pattern = input.value.trim();

  // バリデーション
  if (!pattern) {
    showNotification('パターンを入力してください', 'error');
    return;
  }

  if (!validatePattern(pattern)) {
    showNotification('無効なパターンです', 'error');
    return;
  }

  // 既存パターンを取得
  const { domainPatterns = [] } = await chrome.storage.sync.get(['domainPatterns']);

  // 重複チェック
  if (domainPatterns.includes(pattern)) {
    showNotification('このパターンは既に登録されています', 'error');
    return;
  }

  // パターン数上限チェック（推奨50個）
  if (domainPatterns.length >= 50) {
    showNotification('パターンは最大50個まで登録できます', 'error');
    return;
  }

  // パターンを追加
  try {
    domainPatterns.push(pattern);
    await chrome.storage.sync.set({ domainPatterns });

    // UI更新
    input.value = '';
    renderPatternList(domainPatterns);
    showNotification('パターンを追加しました');
  } catch (error) {
    if (error.message && error.message.includes('QUOTA_BYTES')) {
      showNotification('ストレージ容量を超えました', 'error');
    } else {
      showNotification('パターンの追加に失敗しました', 'error');
    }
  }
}

/**
 * パターン削除ハンドラ
 * @param {Event} e - クリックイベント
 */
async function handleDeletePattern(e) {
  const index = parseInt(e.target.dataset.index, 10);

  // 既存パターンを取得
  const { domainPatterns = [] } = await chrome.storage.sync.get(['domainPatterns']);

  // 指定インデックスを削除
  domainPatterns.splice(index, 1);
  await chrome.storage.sync.set({ domainPatterns });

  // UI更新
  renderPatternList(domainPatterns);
  showNotification('パターンを削除しました');
}

/**
 * パターンのバリデーション
 * @param {string} pattern - 検証するパターン
 * @returns {boolean} - 有効ならtrue
 */
function validatePattern(pattern) {
  // 最小限のバリデーション
  if (pattern.length === 0 || pattern.length > 200) return false;

  // 禁止文字チェック（スペース、改行など）
  if (/\s/.test(pattern)) return false;

  // ワイルドカードとドット、スラッシュ、ハイフンのみ許可
  if (!/^[a-zA-Z0-9.*\-_/:]+$/.test(pattern)) return false;

  return true;
}

/**
 * HTMLエスケープ（XSS対策）
 * @param {string} text - エスケープするテキスト
 * @returns {string} - エスケープ済みテキスト
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
