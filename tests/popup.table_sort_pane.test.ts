import type { JSDOM } from "jsdom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flush } from "./helpers/async";
import { inputValue } from "./helpers/forms";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "./helpers/popupChromeStub";
import { createPopupDom } from "./helpers/popupDom";
import {
  cleanupPopupTestHooks,
  registerPopupTestHooks,
} from "./helpers/popupTestHooks";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type SetupOptions = {
  activeTab?: {
    id?: number;
    title?: string;
    url?: string;
  } | null;
  focusPatterns?: string[];
  focusDiagnosisResult?: {
    markerPresent: boolean;
    visibilityState: string;
    hidden: boolean;
    hasFocus: boolean;
  };
  focusDiagnosisError?: string;
};

async function setupTablePane(
  options: SetupOptions = {}
): Promise<{ dom: JSDOM; chromeStub: PopupChromeStub }> {
  vi.resetModules();

  const dom = createPopupDom("chrome-extension://test/popup.html#pane-table");
  const chromeStub = createPopupChromeStub();
  const activeTab = options.activeTab ?? {
    id: 10,
    title: "Pocket",
    url: "https://pocket.shonenmagazine.com/title/123",
  };
  const focusPatterns = options.focusPatterns ?? [
    "pocket.shonenmagazine.com/title/*",
  ];

  chromeStub.storage.sync.get.mockImplementation(
    (keys: string[], callback: (items: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      const keyList = Array.isArray(keys) ? keys : [String(keys)];
      const items: Record<string, unknown> = {};
      if (keyList.includes("domainPatternConfigs")) {
        items.domainPatternConfigs = [
          { pattern: "example.com/foo*", enableRowFilter: false },
        ];
      }
      if (keyList.includes("focusOverridePatterns")) {
        items.focusOverridePatterns = focusPatterns;
      }
      callback(items);
    }
  );

  chromeStub.tabs.query.mockImplementation(
    (_queryInfo: unknown, callback: (tabs: unknown[]) => void) => {
      chromeStub.runtime.lastError = null;
      callback(activeTab ? [activeTab] : []);
    }
  );

  chromeStub.tabs.sendMessage.mockImplementation(
    (_tabId: number, _message: unknown, callback: (resp: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      callback({ success: true });
    }
  );

  chromeStub.scripting.executeScript.mockImplementation(() => {
    if (options.focusDiagnosisError) {
      return Promise.reject(new Error(options.focusDiagnosisError));
    }

    return Promise.resolve([
      {
        result: options.focusDiagnosisResult ?? {
          markerPresent: false,
          visibilityState: "visible",
          hidden: false,
          hasFocus: true,
        },
      },
    ]);
  });

  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("navigator", dom.window.navigator);
  vi.stubGlobal("chrome", chromeStub);
  registerPopupTestHooks();

  await act(async () => {
    await import("@/popup.ts");
    dom.window.document.dispatchEvent(
      new dom.window.Event("DOMContentLoaded", { bubbles: true })
    );
    await flush(dom.window, 8);
  });

  return { dom, chromeStub };
}

afterEach(async () => {
  const currentWindow =
    globalThis.window && "setTimeout" in globalThis.window
      ? globalThis.window
      : null;

  await act(async () => {
    cleanupPopupTestHooks();
    if (currentWindow) {
      await flush(currentWindow, 4);
    }
  });
  vi.unstubAllGlobals();
});

describe("popup Table Sort pane", () => {
  it("renders the summary and section-card layout", async () => {
    const { dom } = await setupTablePane();

    const summary = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="table-pane-summary"]'
    );
    const enable = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="enable-table-sort"]'
    );
    const sections = [
      ...dom.window.document.querySelectorAll<HTMLElement>(
        '[data-testid="table-pane-section"]'
      ),
    ].map((element) => element.dataset.section);
    const diagnostic = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-diagnostic-panel"]'
    );
    const focusInput = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-pattern-input"]'
    );

    expect(summary).not.toBeNull();
    expect(summary?.textContent ?? "").toContain("自動ソート対象サイト");
    expect(summary?.textContent ?? "").toContain("フォーカス維持");
    expect(enable?.textContent).toContain("このタブで有効化");
    expect(sections).toEqual(["url-patterns", "focus-override"]);
    expect(diagnostic).not.toBeNull();
    expect(focusInput).not.toBeNull();
    expect(diagnostic?.compareDocumentPosition(focusInput as Node)).toBe(
      dom.window.Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("sends enableTableSort to the active tab and shows feedback", async () => {
    const { dom, chromeStub } = await setupTablePane();

    const enable = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="enable-table-sort"]'
    );
    expect(enable).not.toBeNull();

    await act(async () => {
      enable?.click();
      await flush(dom.window);
    });

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledWith(
      10,
      { action: "enableTableSort" },
      expect.any(Function)
    );
    expect(dom.window.document.body.textContent).toContain(
      "テーブルソートを有効化"
    );
  });

  it("adds and removes URL patterns in sync storage", async () => {
    const { dom, chromeStub } = await setupTablePane();

    const pane = dom.window.document.querySelector('[data-pane="pane-table"]');
    expect(pane).not.toBeNull();
    expect(pane?.textContent ?? "").toContain("example.com/foo*");

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="pattern-input"]'
    );
    const add = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="pattern-add"]'
    );
    expect(input).not.toBeNull();
    expect(add).not.toBeNull();

    await act(async () => {
      inputValue(dom.window, input as HTMLInputElement, "foo.com/*");
      add?.click();
      await flush(dom.window);
    });

    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        domainPatternConfigs: expect.arrayContaining([
          { pattern: "example.com/foo*", enableRowFilter: false },
          { pattern: "foo.com/*", enableRowFilter: false },
        ]),
      }),
      expect.any(Function)
    );

    const remove = dom.window.document.querySelector<HTMLButtonElement>(
      'button[data-pattern-remove="example.com/foo*"]'
    );
    expect(remove).not.toBeNull();

    await act(async () => {
      remove?.click();
      await flush(dom.window);
    });

    const lastCall = chromeStub.storage.sync.set.mock.calls.at(-1)?.[0] as
      | {
          domainPatternConfigs?: Array<{
            pattern: string;
            enableRowFilter: boolean;
          }>;
        }
      | undefined;
    expect(lastCall?.domainPatternConfigs).toEqual([
      { pattern: "foo.com/*", enableRowFilter: false },
    ]);
  });

  it("toggles row filter per pattern", async () => {
    const { dom, chromeStub } = await setupTablePane();

    const filterToggle = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="row-filter-example.com/foo*"]'
    );
    expect(filterToggle).not.toBeNull();

    await act(async () => {
      filterToggle?.click();
      await flush(dom.window);
    });

    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        domainPatternConfigs: expect.arrayContaining([
          { pattern: "example.com/foo*", enableRowFilter: true },
        ]),
      }),
      expect.any(Function)
    );
  });

  it("shows not-configured when the current tab is not matched", async () => {
    const { dom, chromeStub } = await setupTablePane({
      activeTab: {
        id: 10,
        title: "Other page",
        url: "https://example.com/other",
      },
    });

    const status = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-diagnostic-status"]'
    );
    const summary = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-diagnostic-summary"]'
    );

    expect(status?.textContent).toBe("未設定");
    expect(summary?.textContent).toContain("example.com/other");
    expect(chromeStub.scripting.executeScript).not.toHaveBeenCalled();
    expect(
      dom.window.document.querySelector(
        '[data-testid="focus-diagnostic-reload"]'
      )
    ).toBeNull();
  });

  it("shows reload-required when the URL matches but override is not applied", async () => {
    const { dom } = await setupTablePane({
      focusDiagnosisResult: {
        markerPresent: false,
        visibilityState: "visible",
        hidden: false,
        hasFocus: true,
      },
    });

    const status = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-diagnostic-status"]'
    );

    expect(status?.textContent).toBe("要リロード");
    expect(dom.window.document.body.textContent).toContain(
      "再読み込みで確実に反映されます"
    );
    expect(
      dom.window.document.querySelector(
        '[data-testid="focus-diagnostic-reload"]'
      )
    ).not.toBeNull();
  });

  it("shows active when the override marker and values are present", async () => {
    const { dom } = await setupTablePane({
      focusDiagnosisResult: {
        markerPresent: true,
        visibilityState: "visible",
        hidden: false,
        hasFocus: true,
      },
    });

    const status = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-diagnostic-status"]'
    );

    expect(status?.textContent).toBe("有効");
    expect(dom.window.document.body.textContent).toContain(
      "フォーカス維持が反映済み"
    );
    expect(
      dom.window.document.querySelector(
        '[data-testid="focus-diagnostic-reload"]'
      )
    ).toBeNull();
  });

  it("shows unavailable when main-world diagnosis cannot run", async () => {
    const { dom } = await setupTablePane({
      focusDiagnosisError: "Cannot access this page",
    });

    const status = dom.window.document.querySelector<HTMLElement>(
      '[data-testid="focus-diagnostic-status"]'
    );

    expect(status?.textContent).toBe("判定不可");
    expect(dom.window.document.body.textContent).toContain(
      "Cannot access this page"
    );
  });

  it("adds and removes focus override patterns in sync storage", async () => {
    const { dom, chromeStub } = await setupTablePane({
      activeTab: {
        id: 10,
        title: "Reader",
        url: "https://example.com/reader/42",
      },
    });

    const pane = dom.window.document.querySelector('[data-pane="pane-table"]');
    expect(pane).not.toBeNull();
    expect(pane?.textContent ?? "").toContain("フォーカス維持");
    expect(pane?.textContent ?? "").toContain(
      "pocket.shonenmagazine.com/title/*"
    );

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="focus-pattern-input"]'
    );
    const add = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="focus-pattern-add"]'
    );
    expect(input).not.toBeNull();
    expect(add).not.toBeNull();

    await act(async () => {
      inputValue(dom.window, input as HTMLInputElement, "example.com/reader/*");
      add?.click();
      await flush(dom.window, 8);
    });

    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        focusOverridePatterns: expect.arrayContaining([
          "pocket.shonenmagazine.com/title/*",
          "example.com/reader/*",
        ]),
      }),
      expect.any(Function)
    );
    expect(dom.window.document.body.textContent).toContain(
      "このタブでは再読み込みで反映されます"
    );

    const remove = dom.window.document.querySelector<HTMLButtonElement>(
      'button[data-focus-pattern-remove="pocket.shonenmagazine.com/title/*"]'
    );
    expect(remove).not.toBeNull();

    await act(async () => {
      remove?.click();
      await flush(dom.window, 8);
    });

    const lastCall = chromeStub.storage.sync.set.mock.calls.at(-1)?.[0] as
      | {
          focusOverridePatterns?: string[];
        }
      | undefined;
    expect(lastCall?.focusOverridePatterns).toEqual(["example.com/reader/*"]);
  });

  it("reloads the current tab from the diagnostic card", async () => {
    const { dom, chromeStub } = await setupTablePane({
      focusDiagnosisResult: {
        markerPresent: false,
        visibilityState: "visible",
        hidden: false,
        hasFocus: true,
      },
    });

    const reload = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="focus-diagnostic-reload"]'
    );
    expect(reload).not.toBeNull();

    await act(async () => {
      reload?.click();
      await flush(dom.window);
    });

    expect(chromeStub.tabs.reload).toHaveBeenCalledWith(
      10,
      undefined,
      expect.any(Function)
    );
    expect(dom.window.document.body.textContent).toContain(
      "このタブを再読み込みしました"
    );
  });
});
