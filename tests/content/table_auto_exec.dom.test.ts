import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMessageListener } from "@/content/message-handlers";
import { setupTableAutoExec } from "@/content/table-auto-exec";
import type { DomainPatternConfig } from "@/domain-pattern-configs";
import { createChromeStub } from "../helpers/chromeStub";

const { refreshTableConfig } = vi.hoisted(() => ({
  refreshTableConfig: vi.fn<() => Promise<DomainPatternConfig[]>>(),
}));

vi.mock("@/content/config", () => ({ refreshTableConfig }));

type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void;

describe("table activation lifecycle", () => {
  let dom: JSDOM;
  let configs: DomainPatternConfig[];
  let storageListeners: StorageListener[];
  const showNotification = vi.fn();
  const onContextActionsChange = vi.fn(async () => {
    // The context-action callback is independent of table activation.
  });

  function setup() {
    return setupTableAutoExec({ onContextActionsChange, showNotification });
  }

  function appendTable(): HTMLTableElement {
    const table = document.createElement("table");
    const header = document.createElement("th");
    header.textContent = "Score";
    table.createTHead().insertRow().append(header);
    const body = table.createTBody();
    for (const value of ["2", "0", "1"]) {
      body.insertRow().insertCell().textContent = value;
    }
    document.body.append(table);
    return table;
  }

  function sort(table: HTMLTableElement): void {
    table.querySelector("th")?.click();
  }

  function setHidden(hidden: boolean): void {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: hidden,
    });
    document.dispatchEvent(new dom.window.Event("visibilitychange"));
  }

  function emitStorageChange(
    changes: Record<string, chrome.storage.StorageChange>,
    areaName = "sync"
  ): void {
    for (const listener of storageListeners) {
      listener(changes, areaName);
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    dom = new JSDOM("<!doctype html><html><body></body></html>", {
      pretendToBeVisual: true,
      url: "https://example.com/tables",
    });
    configs = [];
    storageListeners = [];
    refreshTableConfig.mockReset();
    refreshTableConfig.mockImplementation(async () => configs);
    const chromeStub = createChromeStub();
    chromeStub.storage.onChanged.addListener.mockImplementation(
      (listener: StorageListener) => storageListeners.push(listener)
    );
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("MutationObserver", dom.window.MutationObserver);
    vi.stubGlobal("chrome", chromeStub);
    vi.stubGlobal("__MBU_CONTENT_STATE__", undefined);
  });

  afterEach(() => {
    window.dispatchEvent(new dom.window.Event("pagehide"));
    dom.window.close();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("enables existing and future tables from the manual message even without a matching URL", async () => {
    configs = [{ enableRowFilter: false, pattern: "other.example/*" }];
    const table = appendTable();
    const tables = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(table.dataset.sortable).toBeUndefined();

    const listener = createMessageListener({
      enableTableSort: tables.enable,
      getOrCreateToastMount: vi.fn(async () => null),
      getSearchBlocklistDiagnostics: () => ({ available: false }),
      showActionOverlay: vi.fn(),
      showNotification,
      showQrCodeOverlay: vi.fn(),
      showSummaryOverlay: vi.fn(),
    });
    const sendResponse = vi.fn();

    expect(
      listener({ action: "enableTableSort" }, {}, sendResponse)
    ).toBeUndefined();
    expect(sendResponse).toHaveBeenCalledExactlyOnceWith({ success: true });
    expect(table.dataset.sortable).toBe("true");
    expect(showNotification).toHaveBeenCalledExactlyOnceWith(
      "1個のテーブルでソートを有効化しました"
    );

    const added = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(added.dataset.sortable).toBe("true");
    expect(showNotification).toHaveBeenLastCalledWith(
      "1個の新しいテーブルでソートを有効化しました"
    );
  });

  it("keeps repeated activation idempotent while preserving activation counts and batched notifications", async () => {
    const table = appendTable();
    const tables = setup();
    await vi.advanceTimersByTimeAsync(0);
    tables.enable();
    tables.enable();

    expect(showNotification.mock.calls).toEqual([
      ["1個のテーブルでソートを有効化しました"],
      ["1個のテーブルでソートを有効化しました"],
    ]);
    sort(table);
    expect(table.dataset.sortOrder).toBe("asc");
    expect(Array.from(table.tBodies[0].rows, (row) => row.textContent)).toEqual(
      ["0", "1", "2"]
    );

    const first = appendTable();
    const second = appendTable();
    await vi.advanceTimersByTimeAsync(299);
    expect(first.dataset.sortable).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(first.dataset.sortable).toBe("true");
    expect(second.dataset.sortable).toBe("true");
    expect(showNotification).toHaveBeenCalledTimes(3);
    expect(showNotification).toHaveBeenLastCalledWith(
      "2個の新しいテーブルでソートを有効化しました"
    );
  });

  it("starts observing on manual activation even when there are no existing tables", async () => {
    const tables = setup();
    await vi.advanceTimersByTimeAsync(0);
    tables.enable();
    expect(showNotification).not.toHaveBeenCalled();

    const table = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(table.dataset.sortable).toBe("true");
    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it("keeps manual activation available when automatic config loading fails", async () => {
    refreshTableConfig.mockRejectedValueOnce(new Error("storage unavailable"));
    const table = appendTable();
    const tables = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(table.dataset.sortable).toBeUndefined();
    expect(showNotification).not.toHaveBeenCalled();

    tables.enable();
    expect(table.dataset.sortable).toBe("true");
    const added = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(added.dataset.sortable).toBe("true");
  });

  it("automatically enables matching URLs and keeps row-filter callbacks current for existing and dynamic tables", async () => {
    configs = [{ enableRowFilter: true, pattern: "example.com/*" }];
    const existing = appendTable();
    setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(existing.dataset.sortable).toBe("true");
    const added = appendTable();
    await vi.advanceTimersByTimeAsync(300);

    for (const table of [existing, added]) {
      sort(table);
      expect(table.tBodies[0].rows[0].style.display).toBe("none");
    }

    configs = [{ enableRowFilter: false, pattern: "example.com/*" }];
    emitStorageChange({ domainPatternConfigs: { newValue: configs } });
    await vi.advanceTimersByTimeAsync(0);
    for (const table of [existing, added]) {
      sort(table);
      expect(
        Array.from(table.tBodies[0].rows, (row) => row.style.display)
      ).toEqual(["", "", ""]);
    }
  });

  it("checks SPA URL changes without deactivating an already enabled page when the URL stops matching", async () => {
    configs = [{ enableRowFilter: false, pattern: "example.com/enabled" }];
    const table = appendTable();
    setup();
    await vi.advanceTimersByTimeAsync(1000);
    expect(table.dataset.sortable).toBeUndefined();
    expect(showNotification).not.toHaveBeenCalled();

    window.history.replaceState(null, "", "/enabled");
    await vi.advanceTimersByTimeAsync(1000);
    expect(table.dataset.sortable).toBe("true");

    window.history.replaceState(null, "", "/elsewhere");
    await vi.advanceTimersByTimeAsync(1000);
    const added = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(added.dataset.sortable).toBe("true");
  });

  it.each(["domainPatternConfigs", "domainPatterns"])(
    "reacts to sync %s changes but not local changes and preserves the context-action callback",
    async (key) => {
      const table = appendTable();
      setup();
      await vi.advanceTimersByTimeAsync(0);
      configs = [{ enableRowFilter: false, pattern: "example.com/*" }];
      emitStorageChange({ [key]: {} }, "local");
      await vi.advanceTimersByTimeAsync(0);
      expect(table.dataset.sortable).toBeUndefined();

      emitStorageChange({ [key]: {}, contextActions: {} });
      await vi.advanceTimersByTimeAsync(0);
      expect(table.dataset.sortable).toBe("true");
      expect(onContextActionsChange).toHaveBeenCalledTimes(1);
    }
  );

  it("cancels pending insertion work when hidden and resumes with all tables only on an eligible visible page", async () => {
    configs = [{ enableRowFilter: false, pattern: "example.com/*" }];
    const existing = appendTable();
    setup();
    await vi.advanceTimersByTimeAsync(0);
    const pending = appendTable();
    await vi.advanceTimersByTimeAsync(100);
    setHidden(true);
    const hidden = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(existing.dataset.sortable).toBe("true");
    expect(pending.dataset.sortable).toBeUndefined();
    expect(hidden.dataset.sortable).toBeUndefined();
    expect(showNotification).toHaveBeenCalledTimes(1);

    setHidden(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(pending.dataset.sortable).toBe("true");
    expect(hidden.dataset.sortable).toBe("true");
    expect(showNotification).toHaveBeenLastCalledWith(
      "3個のテーブルでソートを有効化しました"
    );
    const added = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(added.dataset.sortable).toBe("true");
  });

  it("does not turn manual activation into automatic resume on an unmatched URL", async () => {
    const tables = setup();
    await vi.advanceTimersByTimeAsync(0);
    tables.enable();
    setHidden(true);
    const table = appendTable();
    setHidden(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(table.dataset.sortable).toBeUndefined();
    expect(showNotification).not.toHaveBeenCalled();

    tables.enable();
    expect(table.dataset.sortable).toBe("true");
  });

  it("does not resume if the page becomes hidden while its visibility config refresh is pending", async () => {
    configs = [{ enableRowFilter: false, pattern: "example.com/*" }];
    setup();
    await vi.advanceTimersByTimeAsync(0);
    setHidden(true);
    const table = appendTable();
    let resolveConfig: (value: DomainPatternConfig[]) => void = () => {
      throw new Error("config refresh was not requested");
    };
    refreshTableConfig.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve;
        })
    );
    setHidden(false);
    setHidden(true);
    resolveConfig(configs);
    await vi.advanceTimersByTimeAsync(300);
    expect(table.dataset.sortable).toBeUndefined();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("owns pagehide cleanup and cancels the pending debounce even when stopped repeatedly", async () => {
    const tables = setup();
    await vi.advanceTimersByTimeAsync(0);
    tables.enable();
    const pending = appendTable();
    await vi.advanceTimersByTimeAsync(100);

    window.dispatchEvent(new dom.window.Event("pagehide"));
    window.dispatchEvent(new dom.window.Event("pagehide"));
    const afterPagehide = appendTable();
    await vi.advanceTimersByTimeAsync(300);
    expect(pending.dataset.sortable).toBeUndefined();
    expect(afterPagehide.dataset.sortable).toBeUndefined();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("does not duplicate activation setup when the content script is reinjected", async () => {
    vi.resetModules();
    await import("@/content");
    await vi.advanceTimersByTimeAsync(0);
    const listenerCount = vi.mocked(chrome.runtime.onMessage.addListener).mock
      .calls.length;
    const storageListenerCount = storageListeners.length;
    const timerCount = vi.getTimerCount();
    expect(listenerCount).toBe(1);
    expect(refreshTableConfig).toHaveBeenCalledTimes(1);

    vi.resetModules();
    await import("@/content");
    await vi.advanceTimersByTimeAsync(0);
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(
      listenerCount
    );
    expect(storageListeners).toHaveLength(storageListenerCount);
    expect(vi.getTimerCount()).toBe(timerCount);
    expect(refreshTableConfig).toHaveBeenCalledTimes(1);
  });
});
