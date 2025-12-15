// Content Script - Webページに注入される

(() => {
  type StorageData = {
    domainPatterns?: string[];
    autoEnableSort?: boolean;
  };

  type SummarySource = "selection" | "page";

  type ContentRequest =
    | { action: "enableTableSort" }
    | { action: "showNotification"; message: string }
    | { action: "getSummaryTargetText" }
    | { action: "showSummaryOverlay"; summary: string; source: SummarySource };

  type SummaryTarget = {
    text: string;
    source: SummarySource;
    title: string;
    url: string;
  };

  let tableObserver: MutationObserver | null = null;

  // ========================================
  // 1. ユーティリティ関数
  // ========================================

  function patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");

    return new RegExp(`^${escaped}$`);
  }

  function matchesAnyPattern(patterns: string[]): boolean {
    const url = window.location.href;
    const urlWithoutProtocol = url.replace(/^https?:\/\//, "");

    return patterns.some((pattern) => {
      const patternWithoutProtocol = pattern.replace(/^https?:\/\//, "");
      const regex = patternToRegex(patternWithoutProtocol);

      return regex.test(urlWithoutProtocol);
    });
  }

  // ========================================
  // 2. メッセージリスナー
  // ========================================

  chrome.runtime.onMessage.addListener(
    (
      request: ContentRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (request.action === "enableTableSort") {
        enableTableSort();
        startTableObserver();
        sendResponse({ success: true });
      }

      if (request.action === "showNotification") {
        showNotification(request.message);
      }

      if (request.action === "getSummaryTargetText") {
        void (async () => {
          const target = await getSummaryTargetText();
          sendResponse(target);
        })();
      }

      if (request.action === "showSummaryOverlay") {
        showSummaryOverlay(request.summary, request.source);
      }

      return true;
    },
  );

  // ========================================
  // 3. テーブルソート機能
  // ========================================

  function enableSingleTable(table: HTMLTableElement): void {
    if (table.dataset.sortable) return;

    table.dataset.sortable = "true";
    const headers = table.querySelectorAll<HTMLTableCellElement>("th");

    headers.forEach((header, index) => {
      header.style.cursor = "pointer";
      header.style.userSelect = "none";
      header.title = "クリックでソート";

      header.addEventListener("click", () => {
        sortTable(table, index);
      });
    });
  }

  function enableTableSort(): void {
    const tables = document.querySelectorAll<HTMLTableElement>("table");

    tables.forEach((table) => {
      enableSingleTable(table);
    });

    if (tables.length > 0) {
      showNotification(`${tables.length}個のテーブルでソートを有効化しました`);
    }
  }

  function sortTable(table: HTMLTableElement, columnIndex: number): void {
    const tbody = table.querySelector(
      "tbody",
    ) as HTMLTableSectionElement | null;
    const targetBody = tbody ?? table;
    const rows = Array.from(
      targetBody.querySelectorAll<HTMLTableRowElement>("tr"),
    ).filter((row) => row.parentNode === targetBody);

    const isAscending = table.dataset.sortOrder !== "asc";
    table.dataset.sortOrder = isAscending ? "asc" : "desc";

    rows.sort((a, b) => {
      const aCell = a.cells[columnIndex]?.textContent?.trim() ?? "";
      const bCell = b.cells[columnIndex]?.textContent?.trim() ?? "";

      const aNum = parseFloat(aCell);
      const bNum = parseFloat(bCell);

      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return isAscending ? aNum - bNum : bNum - aNum;
      }

      return isAscending
        ? aCell.localeCompare(bCell, "ja")
        : bCell.localeCompare(aCell, "ja");
    });

    rows.forEach((row) => targetBody.appendChild(row));
  }

  // ========================================
  // 4. MutationObserver（動的テーブル検出）
  // ========================================

  function startTableObserver(): void {
    if (tableObserver) return;

    let debounceTimer: number | undefined;

    const handleMutations = (): void => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        checkForNewTables();
      }, 300);
    };

    tableObserver = new MutationObserver(handleMutations);

    tableObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function checkForNewTables(): void {
    const tables = document.querySelectorAll<HTMLTableElement>(
      "table:not([data-sortable])",
    );

    if (tables.length > 0) {
      tables.forEach((table) => {
        enableSingleTable(table);
      });

      showNotification(
        `${tables.length}個の新しいテーブルでソートを有効化しました`,
      );
    }
  }

  function stopTableObserver(): void {
    if (tableObserver) {
      tableObserver.disconnect();
      tableObserver = null;
    }
  }

  // ========================================
  // 5. UI・通知関連
  // ========================================

  document.addEventListener("mouseup", () => {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText) {
      void chrome.storage.local.set({
        selectedText,
        selectedTextUpdatedAt: Date.now(),
      });
    }
  });

  function showNotification(message: string): void {
    const notification = document.createElement("div");
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
    window.setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-out";
      window.setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  if (!document.getElementById("my-browser-utils-styles")) {
    const style = document.createElement("style");
    style.id = "my-browser-utils-styles";
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

  async function getSummaryTargetText(): Promise<SummaryTarget> {
    const selection = window.getSelection()?.toString().trim() ?? "";
    if (selection) {
      return {
        text: selection,
        source: "selection",
        title: document.title ?? "",
        url: window.location.href,
      };
    }

    const storedSelection = (await chrome.storage.local.get([
      "selectedText",
      "selectedTextUpdatedAt",
    ])) as {
      selectedText?: string;
      selectedTextUpdatedAt?: number;
    };
    const fallbackSelection = storedSelection.selectedText?.trim() ?? "";
    const updatedAt = storedSelection.selectedTextUpdatedAt ?? 0;
    const isFresh = Date.now() - updatedAt <= 30_000;

    if (isFresh && fallbackSelection) {
      return {
        text: fallbackSelection,
        source: "selection",
        title: document.title ?? "",
        url: window.location.href,
      };
    }

    const bodyText = document.body?.innerText ?? "";
    return {
      text: normalizeText(bodyText),
      source: "page",
      title: document.title ?? "",
      url: window.location.href,
    };
  }

  function normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function showSummaryOverlay(summary: string, source: SummarySource): void {
    const existing = document.getElementById("my-browser-utils-summary");
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = "my-browser-utils-summary";
    root.style.cssText = `
    position: fixed;
    right: 16px;
    bottom: 16px;
    width: min(520px, calc(100vw - 32px));
    max-height: 70vh;
    z-index: 2147483647;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.22);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

    const header = document.createElement("div");
    header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background: #f7f7f7;
    border-bottom: 1px solid rgba(0,0,0,0.08);
  `;

    const title = document.createElement("div");
    title.textContent =
      source === "selection" ? "要約（選択範囲）" : "要約（ページ本文）";
    title.style.cssText = `
    font-size: 13px;
    font-weight: 700;
    color: #111;
  `;

    const actions = document.createElement("div");
    actions.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

    const copyButton = document.createElement("button");
    copyButton.textContent = "コピー";
    copyButton.style.cssText = `
    padding: 6px 10px;
    font-size: 12px;
    border: none;
    border-radius: 6px;
    background: #4285f4;
    color: white;
    cursor: pointer;
  `;
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(summary);
        showNotification("コピーしました");
      } catch {
        showNotification("コピーに失敗しました");
      }
    });

    const closeButton = document.createElement("button");
    closeButton.textContent = "閉じる";
    closeButton.style.cssText = `
    padding: 6px 10px;
    font-size: 12px;
    border: none;
    border-radius: 6px;
    background: #6b7280;
    color: white;
    cursor: pointer;
  `;
    closeButton.addEventListener("click", () => root.remove());

    actions.appendChild(copyButton);
    actions.appendChild(closeButton);
    header.appendChild(title);
    header.appendChild(actions);

    const body = document.createElement("div");
    body.style.cssText = `
    padding: 12px;
    overflow: auto;
    max-height: calc(70vh - 44px);
  `;

    const pre = document.createElement("pre");
    pre.textContent = summary;
    pre.style.cssText = `
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13px;
    line-height: 1.45;
    color: #111;
  `;

    body.appendChild(pre);
    root.appendChild(header);
    root.appendChild(body);
    document.body.appendChild(root);
  }

  // ========================================
  // 6. 自動実行ロジック
  // ========================================

  (async function autoEnableTableSort(): Promise<void> {
    try {
      const { domainPatterns = [], autoEnableSort = false }: StorageData =
        await chrome.storage.sync.get(["domainPatterns", "autoEnableSort"]);

      if (autoEnableSort) {
        enableTableSort();
        startTableObserver();
        return;
      }

      if (domainPatterns.length > 0 && matchesAnyPattern(domainPatterns)) {
        enableTableSort();
        startTableObserver();
      }
    } catch (error) {
      console.error("Auto-enable table sort failed:", error);
    }
  })();
})();
