(() => {
  type SyncStorageData = {
    domainPatterns?: string[];
    autoEnableSort?: boolean;
  };

  type LocalStorageData = {
    openaiApiToken?: string;
    openaiCustomPrompt?: string;
  };

  type EnableResponse = {
    success: boolean;
  };

  type NotificationType = 'info' | 'error';

  type PopupToContentMessage = {
    action: 'enableTableSort';
  };

  type SummarySource = 'selection' | 'page';

  type PopupToBackgroundMessage = {
    action: 'summarizeTab';
    tabId: number;
  };

  type PopupToBackgroundTestTokenMessage = {
    action: 'testOpenAiToken';
    token?: string;
  };

  type SummarizeResponse = { ok: true; summary: string; source: SummarySource } | { ok: false; error: string };

  type TestTokenResponse = { ok: true } | { ok: false; error: string };

  const isExtensionPage = window.location.protocol === 'chrome-extension:';
  const fallbackStoragePrefix = 'mbu:popup:';

  const start = (): void => {
    void initializePopup().catch(error => {
      // 初期化が途中で落ちると、ボタンが一切反応しないように見えるため通知しておく
      console.error('Popup initialization failed:', error);
      showNotification(
        error instanceof Error ? error.message : '初期化に失敗しました（拡張機能を再読み込みしてください）',
        'error',
      );
    });
  };

  // `popup.js` が遅れて読み込まれるケースでも初期化できるようにする
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  async function initializePopup(): Promise<void> {
    const autoEnableCheckbox = document.getElementById('auto-enable-sort') as HTMLInputElement | null;
    const enableButton = document.getElementById('enable-table-sort') as HTMLButtonElement | null;
    const addPatternButton = document.getElementById('add-pattern') as HTMLButtonElement | null;
    const patternInput = document.getElementById('pattern-input') as HTMLInputElement | null;
    const tokenInput = document.getElementById('openai-token') as HTMLInputElement | null;
    const saveTokenButton = document.getElementById('save-openai-token') as HTMLButtonElement | null;
    const clearTokenButton = document.getElementById('clear-openai-token') as HTMLButtonElement | null;
    const toggleTokenVisibilityButton = document.getElementById(
      'toggle-openai-token-visibility',
    ) as HTMLButtonElement | null;
    const testTokenButton = document.getElementById('test-openai-token') as HTMLButtonElement | null;
    const customPromptInput = document.getElementById('openai-custom-prompt') as HTMLTextAreaElement | null;
    const saveCustomPromptButton = document.getElementById('save-openai-custom-prompt') as HTMLButtonElement | null;
    const clearCustomPromptButton = document.getElementById('clear-openai-custom-prompt') as HTMLButtonElement | null;
    const summarizeButton = document.getElementById('summarize-tab') as HTMLButtonElement | null;
    const copySummaryButton = document.getElementById('copy-summary') as HTMLButtonElement | null;
    const summaryOutput = document.getElementById('summary-output') as HTMLTextAreaElement | null;
    const summarySourceChip = document.getElementById('summary-source-chip') as HTMLSpanElement | null;

    setupNavigation();

    if (autoEnableCheckbox) {
      autoEnableCheckbox.addEventListener('change', event => {
        const target = event.target as HTMLInputElement;
        void storageSyncSet({ autoEnableSort: target.checked }).catch(error => {
          showNotification(error instanceof Error ? error.message : '設定の保存に失敗しました', 'error');
        });
      });
    }

    enableButton?.addEventListener('click', async () => {
      try {
        const [tab] = await tabsQuery({
          active: true,
          currentWindow: true,
        });
        if (tab?.id === undefined) {
          showNotification('有効なタブが見つかりません', 'error');
          return;
        }

        const message: PopupToContentMessage = { action: 'enableTableSort' };

        chrome.tabs.sendMessage(tab.id, message, (response?: EnableResponse) => {
          if (response?.success) {
            showNotification('テーブルソートを有効化しました');
          }
        });
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'テーブルソートの実行に失敗しました', 'error');
      }
    });

    addPatternButton?.addEventListener('click', () => {
      void handleAddPattern();
    });

    patternInput?.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        void handleAddPattern();
      }
    });

    saveTokenButton?.addEventListener('click', () => {
      void handleSaveToken(tokenInput);
    });

    clearTokenButton?.addEventListener('click', () => {
      void handleClearToken(tokenInput);
    });

    toggleTokenVisibilityButton?.addEventListener('click', () => {
      if (!tokenInput) return;
      const nextType = tokenInput.type === 'password' ? 'text' : 'password';
      tokenInput.type = nextType;
      toggleTokenVisibilityButton.textContent = nextType === 'text' ? '非表示' : '表示';
    });

    testTokenButton?.addEventListener('click', async () => {
      if (testTokenButton) testTokenButton.disabled = true;
      showNotification('OpenAI API Tokenを確認中...');
      try {
        const token = tokenInput?.value.trim() ?? '';
        const response = await sendMessageToBackground<PopupToBackgroundTestTokenMessage, TestTokenResponse>({
          action: 'testOpenAiToken',
          token: token || undefined,
        });

        if (!response.ok) {
          showNotification(response.error, 'error');
          return;
        }

        showNotification('OK: トークンは有効です');
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'トークン確認に失敗しました', 'error');
      } finally {
        if (testTokenButton) testTokenButton.disabled = false;
      }
    });

    saveCustomPromptButton?.addEventListener('click', () => {
      void handleSaveCustomPrompt(customPromptInput);
    });

    clearCustomPromptButton?.addEventListener('click', () => {
      void handleClearCustomPrompt(customPromptInput);
    });

    summarizeButton?.addEventListener('click', async () => {
      try {
        const [tab] = await tabsQuery({
          active: true,
          currentWindow: true,
        });
        if (tab?.id === undefined) {
          showNotification('有効なタブが見つかりません', 'error');
          return;
        }

        if (summaryOutput) summaryOutput.value = '要約中...';
        if (copySummaryButton) copySummaryButton.disabled = true;
        if (summarySourceChip) summarySourceChip.textContent = '-';
        if (summarizeButton) summarizeButton.disabled = true;

        const response = await sendMessageToBackground<PopupToBackgroundMessage, SummarizeResponse>({
          action: 'summarizeTab',
          tabId: tab.id,
        });

        if (!response.ok) {
          showNotification(response.error, 'error');
          if (summaryOutput) summaryOutput.value = '';
          return;
        }

        if (summaryOutput) summaryOutput.value = response.summary;
        if (copySummaryButton) copySummaryButton.disabled = false;
        if (summarySourceChip) {
          summarySourceChip.textContent = response.source === 'selection' ? '選択範囲' : 'ページ本文';
        }
        showNotification('要約しました');
      } catch (error) {
        showNotification(error instanceof Error ? error.message : '要約に失敗しました', 'error');
        if (summaryOutput) summaryOutput.value = '';
      } finally {
        if (summarizeButton) summarizeButton.disabled = false;
      }
    });

    copySummaryButton?.addEventListener('click', async () => {
      const text = summaryOutput?.value ?? '';
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showNotification('コピーしました');
    });

    // 初期表示のロード（失敗しても、ボタン操作自体は動くようにしておく）
    try {
      const settings = (await storageSyncGet(['autoEnableSort'])) as SyncStorageData;
      if (autoEnableCheckbox) {
        autoEnableCheckbox.checked = settings.autoEnableSort ?? false;
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : '設定の読み込みに失敗しました', 'error');
    }

    try {
      await loadPatterns();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'ドメインパターンの読み込みに失敗しました', 'error');
    }

    try {
      await loadOpenAiCustomPrompt(customPromptInput);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'カスタムプロンプトの読み込みに失敗しました', 'error');
    }

    try {
      await loadOpenAiToken(tokenInput);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'OpenAIトークンの読み込みに失敗しました', 'error');
    }
  }

  function showNotification(message: string, type: NotificationType = 'info'): void {
    const notification = document.createElement('div');
    notification.textContent = message;

    const bgColor = type === 'error' ? '#e53935' : '#3ecf8e';

    notification.style.cssText = `
    position: fixed;
    top: 12px;
    right: 12px;
    background: ${bgColor};
    color: white;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 10px 24px rgba(0,0,0,0.2);
  `;
    document.body.appendChild(notification);

    window.setTimeout(() => notification.remove(), 2000);
  }

  function sendMessageToBackground<TRequest, TResponse>(message: TRequest): Promise<TResponse> {
    if (!isExtensionPage || !(chrome as unknown as { runtime?: unknown }).runtime) {
      return Promise.reject(new Error('拡張機能として開いてください（chrome-extension://...）'));
    }
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: TResponse) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(response);
      });
    });
  }

  // ========================================
  // ドメインパターン管理機能
  // ========================================

  function fallbackStorageGet(scope: 'sync' | 'local', keys: string[]): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    keys.forEach(key => {
      const raw = window.localStorage.getItem(`${fallbackStoragePrefix}${scope}:${key}`);
      if (raw === null) return;
      try {
        data[key] = JSON.parse(raw) as unknown;
      } catch {
        data[key] = raw;
      }
    });
    return data;
  }

  function fallbackStorageSet(scope: 'sync' | 'local', items: Record<string, unknown>): void {
    Object.entries(items).forEach(([key, value]) => {
      window.localStorage.setItem(`${fallbackStoragePrefix}${scope}:${key}`, JSON.stringify(value));
    });
  }

  function fallbackStorageRemove(scope: 'sync' | 'local', keys: string[] | string): void {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach(key => {
      window.localStorage.removeItem(`${fallbackStoragePrefix}${scope}:${key}`);
    });
  }

  function storageSyncGet(keys: string[]): Promise<unknown> {
    if (!isExtensionPage || !(chrome as unknown as { storage?: unknown }).storage) {
      return Promise.resolve(fallbackStorageGet('sync', keys));
    }
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, items => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(items);
      });
    });
  }

  function storageSyncSet(items: Record<string, unknown>): Promise<void> {
    if (!isExtensionPage || !(chrome as unknown as { storage?: unknown }).storage) {
      fallbackStorageSet('sync', items);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(items, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }

  function storageLocalGet(keys: string[]): Promise<unknown> {
    if (!isExtensionPage || !(chrome as unknown as { storage?: unknown }).storage) {
      return Promise.resolve(fallbackStorageGet('local', keys));
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, items => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(items);
      });
    });
  }

  function storageLocalSet(items: Record<string, unknown>): Promise<void> {
    if (!isExtensionPage || !(chrome as unknown as { storage?: unknown }).storage) {
      fallbackStorageSet('local', items);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }

  function storageLocalRemove(keys: string[] | string): Promise<void> {
    if (!isExtensionPage || !(chrome as unknown as { storage?: unknown }).storage) {
      fallbackStorageRemove('local', keys);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }

  function tabsQuery(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    if (!isExtensionPage || !(chrome as unknown as { tabs?: unknown }).tabs) {
      return Promise.reject(new Error('拡張機能として開いてください（chrome-extension://...）'));
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, tabs => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(tabs);
      });
    });
  }

  async function loadPatterns(): Promise<void> {
    const { domainPatterns = [] } = (await storageSyncGet(['domainPatterns'])) as SyncStorageData;
    renderPatternList(domainPatterns);
  }

  function renderPatternList(patterns: string[]): void {
    const listContainer = document.getElementById('pattern-list') as HTMLDivElement | null;

    if (!listContainer) return;

    if (patterns.length === 0) {
      listContainer.innerHTML = '<p class="empty-message">登録されたパターンはありません</p>';
      return;
    }

    listContainer.innerHTML = patterns
      .map(
        (pattern, index) => `
      <div class="pattern-item" data-index="${index}">
        <span class="pattern-text">${escapeHtml(pattern)}</span>
        <button class="btn-delete" data-index="${index}">削除</button>
      </div>
    `,
      )
      .join('');

    listContainer.querySelectorAll('.btn-delete').forEach(btn => {
      const button = btn as HTMLButtonElement;
      button.addEventListener('click', handleDeletePattern);
    });
  }

  async function handleAddPattern(): Promise<void> {
    const input = document.getElementById('pattern-input') as HTMLInputElement | null;
    const pattern = input?.value.trim() ?? '';

    if (!pattern) {
      showNotification('パターンを入力してください', 'error');
      return;
    }

    if (!validatePattern(pattern)) {
      showNotification('無効なパターンです', 'error');
      return;
    }

    let domainPatterns: string[] = [];
    try {
      ({ domainPatterns = [] } = (await storageSyncGet(['domainPatterns'])) as SyncStorageData);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'パターンの読み込みに失敗しました', 'error');
      return;
    }

    if (domainPatterns.includes(pattern)) {
      showNotification('このパターンは既に登録されています', 'error');
      return;
    }

    if (domainPatterns.length >= 50) {
      showNotification('パターンは最大50個まで登録できます', 'error');
      return;
    }

    try {
      domainPatterns.push(pattern);
      await storageSyncSet({ domainPatterns });

      if (input) {
        input.value = '';
      }
      renderPatternList(domainPatterns);
      showNotification('パターンを追加しました');
    } catch (error) {
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        showNotification('ストレージ容量を超えました', 'error');
      } else {
        showNotification('パターンの追加に失敗しました', 'error');
      }
    }
  }

  async function handleDeletePattern(event: Event): Promise<void> {
    const target = event.target as HTMLButtonElement | null;
    const index = target?.dataset.index ? Number(target.dataset.index) : Number.NaN;

    if (Number.isNaN(index)) {
      showNotification('削除に失敗しました', 'error');
      return;
    }

    let domainPatterns: string[] = [];
    try {
      ({ domainPatterns = [] } = (await storageSyncGet(['domainPatterns'])) as SyncStorageData);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : '削除に失敗しました', 'error');
      return;
    }

    domainPatterns.splice(index, 1);
    await storageSyncSet({ domainPatterns });

    renderPatternList(domainPatterns);
    showNotification('パターンを削除しました');
  }

  function validatePattern(pattern: string): boolean {
    if (pattern.length === 0 || pattern.length > 200) return false;

    if (/\s/.test(pattern)) return false;

    // URLっぽい文字（? # & = % など）も許可して、コピペしたURLをそのまま登録できるようにする
    // RFC3986 の予約文字 + % + ワイルドカード(*) を許可
    if (!/^[A-Za-z0-9._~:/?#\][@!$&'()*+,;=%*-]+$/.test(pattern)) {
      return false;
    }

    return true;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setupNavigation(): void {
    // 拡張機能ページではJSでタブ切り替え（.active）を制御できるので、
    // CSSの `:target` フォールバック（no-js）を無効化する。
    if (isExtensionPage) {
      document.body.classList.remove('no-js');
    }

    const navItems = Array.from(document.querySelectorAll<HTMLElement>('.nav-item'));
    const panes = Array.from(document.querySelectorAll<HTMLElement>('.pane'));
    const heroChip = document.getElementById('hero-chip') as HTMLSpanElement | null;
    const ctaPill = document.getElementById('cta-pill') as HTMLButtonElement | null;

    if (ctaPill && !isExtensionPage) {
      ctaPill.disabled = true;
    }

    const updateHero = (activeTargetId?: string): void => {
      if (!heroChip || !ctaPill) return;
      if (activeTargetId === 'pane-summary') {
        heroChip.textContent = 'AI要約';
        ctaPill.textContent = 'すぐ要約';
        ctaPill.hidden = false;
        return;
      }
      if (activeTargetId === 'pane-settings') {
        heroChip.textContent = '設定';
        ctaPill.textContent = '好みに調整';
        ctaPill.hidden = false;
        return;
      }

      heroChip.textContent = 'テーブルソート';
      ctaPill.textContent = '';
      ctaPill.hidden = true;
    };

    let currentActiveTargetId: string | undefined;

    const setActive = (targetId?: string): void => {
      const resolvedTargetId =
        targetId || navItems.find(item => item.classList.contains('active'))?.dataset.target || panes[0]?.id;

      if (!resolvedTargetId) return;
      currentActiveTargetId = resolvedTargetId;

      navItems.forEach(nav => {
        const isActive = nav.dataset.target === resolvedTargetId;
        nav.classList.toggle('active', isActive);
        nav.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      panes.forEach(pane => {
        pane.classList.toggle('active', pane.id === resolvedTargetId);
      });

      updateHero(resolvedTargetId);
    };

    ctaPill?.addEventListener('click', () => {
      if (currentActiveTargetId === 'pane-summary') {
        const summarizeButton = document.getElementById('summarize-tab') as HTMLButtonElement | null;
        summarizeButton?.click();
        return;
      }

      if (currentActiveTargetId === 'pane-settings') {
        const tokenInput = document.getElementById('openai-token') as HTMLInputElement | null;
        (tokenInput as HTMLElement | null)?.focus?.();
        return;
      }

      const enableButton = document.getElementById('enable-table-sort') as HTMLButtonElement | null;
      enableButton?.click();
    });

    const getTargetFromHash = (): string | undefined => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return undefined;
      if (!document.getElementById(hash)) return undefined;
      return hash;
    };

    navItems.forEach(item => {
      item.addEventListener('click', event => {
        if (!isExtensionPage) {
          // 通常ページ（file:// など）ではアンカーのデフォルト挙動に任せて `:target` を更新する。
          // `hashchange` で setActive が呼ばれるので、ここで何もしなくてOK。
          return;
        }

        // `href="#pane-..."` のデフォルト挙動（アンカーへのスクロール）を止めて、
        // タブ切り替え時にスクロール位置が意図せず動かないようにする。
        event.preventDefault();

        const targetId = item.dataset.target;
        if (!targetId) return;

        setActive(targetId);

        // `location.hash = ...` はスクロールしてしまうので replaceState でURLだけ更新する。
        const nextHash = `#${targetId}`;
        if (window.location.hash !== nextHash) {
          window.history.replaceState(null, '', nextHash);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      setActive(getTargetFromHash());
    });

    setActive(getTargetFromHash());
  }

  async function loadOpenAiToken(input: HTMLInputElement | null): Promise<void> {
    if (!input) return;
    const { openaiApiToken = '' } = (await storageLocalGet(['openaiApiToken'])) as LocalStorageData;
    input.value = openaiApiToken;
  }

  async function handleSaveToken(input: HTMLInputElement | null): Promise<void> {
    const token = input?.value.trim() ?? '';
    if (!token) {
      showNotification('トークンを入力してください', 'error');
      return;
    }

    try {
      await storageLocalSet({ openaiApiToken: token });
      showNotification('OpenAIトークンを保存しました');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : '保存に失敗しました', 'error');
    }
  }

  async function handleClearToken(input: HTMLInputElement | null): Promise<void> {
    if (input) {
      input.value = '';
    }
    try {
      await storageLocalRemove('openaiApiToken');
      showNotification('トークンをクリアしました');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'クリアに失敗しました', 'error');
    }
  }

  async function loadOpenAiCustomPrompt(input: HTMLTextAreaElement | null): Promise<void> {
    if (!input) return;
    const { openaiCustomPrompt = '' } = (await storageLocalGet(['openaiCustomPrompt'])) as LocalStorageData;
    input.value = openaiCustomPrompt;
  }

  async function handleSaveCustomPrompt(input: HTMLTextAreaElement | null): Promise<void> {
    const prompt = input?.value ?? '';
    try {
      await storageLocalSet({ openaiCustomPrompt: prompt });
      showNotification('カスタムプロンプトを保存しました');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : '保存に失敗しました', 'error');
    }
  }

  async function handleClearCustomPrompt(input: HTMLTextAreaElement | null): Promise<void> {
    if (input) input.value = '';
    try {
      await storageLocalRemove('openaiCustomPrompt');
      showNotification('カスタムプロンプトをクリアしました');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'クリアに失敗しました', 'error');
    }
  }
})();
