(() => {
  type StorageData = {
    domainPatterns?: string[];
    autoEnableSort?: boolean;
  };

  type EnableResponse = {
    success: boolean;
  };

  type NotificationType = "info" | "error";

  type PopupToContentMessage = {
    action: "enableTableSort";
  };

  document.addEventListener("DOMContentLoaded", () => {
    void initializePopup();
  });

  async function initializePopup(): Promise<void> {
    const settings = (await chrome.storage.sync.get([
      "autoEnableSort",
    ])) as StorageData;
    const autoEnableCheckbox = document.getElementById(
      "auto-enable-sort",
    ) as HTMLInputElement | null;
    const enableButton = document.getElementById(
      "enable-table-sort",
    ) as HTMLButtonElement | null;
    const addPatternButton = document.getElementById(
      "add-pattern",
    ) as HTMLButtonElement | null;
    const patternInput = document.getElementById(
      "pattern-input",
    ) as HTMLInputElement | null;

    if (autoEnableCheckbox) {
      autoEnableCheckbox.checked = settings.autoEnableSort ?? false;
      autoEnableCheckbox.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        void chrome.storage.sync.set({ autoEnableSort: target.checked });
      });
    }

    await loadPatterns();

    enableButton?.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id === undefined) {
        showNotification("有効なタブが見つかりません", "error");
        return;
      }

      const message: PopupToContentMessage = { action: "enableTableSort" };

      chrome.tabs.sendMessage(tab.id, message, (response?: EnableResponse) => {
        if (response?.success) {
          showNotification("テーブルソートを有効化しました");
        }
      });
    });

    addPatternButton?.addEventListener("click", () => {
      void handleAddPattern();
    });

    patternInput?.addEventListener("keypress", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        void handleAddPattern();
      }
    });
  }

  function showNotification(
    message: string,
    type: NotificationType = "info",
  ): void {
    const notification = document.createElement("div");
    notification.textContent = message;

    const bgColor = type === "error" ? "#e53935" : "#4285f4";

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

    window.setTimeout(() => notification.remove(), 2000);
  }

  // ========================================
  // ドメインパターン管理機能
  // ========================================

  async function loadPatterns(): Promise<void> {
    const { domainPatterns = [] } = (await chrome.storage.sync.get([
      "domainPatterns",
    ])) as StorageData;
    renderPatternList(domainPatterns);
  }

  function renderPatternList(patterns: string[]): void {
    const listContainer = document.getElementById(
      "pattern-list",
    ) as HTMLDivElement | null;

    if (!listContainer) return;

    if (patterns.length === 0) {
      listContainer.innerHTML =
        '<p class="empty-message">登録されたパターンはありません</p>';
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
      .join("");

    listContainer.querySelectorAll(".btn-delete").forEach((btn) => {
      const button = btn as HTMLButtonElement;
      button.addEventListener("click", handleDeletePattern);
    });
  }

  async function handleAddPattern(): Promise<void> {
    const input = document.getElementById(
      "pattern-input",
    ) as HTMLInputElement | null;
    const pattern = input?.value.trim() ?? "";

    if (!pattern) {
      showNotification("パターンを入力してください", "error");
      return;
    }

    if (!validatePattern(pattern)) {
      showNotification("無効なパターンです", "error");
      return;
    }

    const { domainPatterns = [] } = (await chrome.storage.sync.get([
      "domainPatterns",
    ])) as StorageData;

    if (domainPatterns.includes(pattern)) {
      showNotification("このパターンは既に登録されています", "error");
      return;
    }

    if (domainPatterns.length >= 50) {
      showNotification("パターンは最大50個まで登録できます", "error");
      return;
    }

    try {
      domainPatterns.push(pattern);
      await chrome.storage.sync.set({ domainPatterns });

      if (input) {
        input.value = "";
      }
      renderPatternList(domainPatterns);
      showNotification("パターンを追加しました");
    } catch (error) {
      if (error instanceof Error && error.message.includes("QUOTA_BYTES")) {
        showNotification("ストレージ容量を超えました", "error");
      } else {
        showNotification("パターンの追加に失敗しました", "error");
      }
    }
  }

  async function handleDeletePattern(event: Event): Promise<void> {
    const target = event.target as HTMLButtonElement | null;
    const index = target?.dataset.index
      ? Number(target.dataset.index)
      : Number.NaN;

    if (Number.isNaN(index)) {
      showNotification("削除に失敗しました", "error");
      return;
    }

    const { domainPatterns = [] } = (await chrome.storage.sync.get([
      "domainPatterns",
    ])) as StorageData;

    domainPatterns.splice(index, 1);
    await chrome.storage.sync.set({ domainPatterns });

    renderPatternList(domainPatterns);
    showNotification("パターンを削除しました");
  }

  function validatePattern(pattern: string): boolean {
    if (pattern.length === 0 || pattern.length > 200) return false;

    if (/\s/.test(pattern)) return false;

    if (!/^[a-zA-Z0-9.*\\-_/:]+$/.test(pattern)) return false;

    return true;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
})();
