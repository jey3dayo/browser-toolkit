import type { JSDOM } from "jsdom";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("popup Table Sort pane", () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;

  beforeEach(async () => {
    vi.resetModules();

    dom = createPopupDom("chrome-extension://test/popup.html#pane-table");
    chromeStub = createPopupChromeStub();

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
        callback(items);
      }
    );

    chromeStub.tabs.query.mockImplementation(
      (_queryInfo: unknown, callback: (tabs: unknown[]) => void) => {
        chromeStub.runtime.lastError = null;
        callback([{ id: 10 }]);
      }
    );

    chromeStub.tabs.sendMessage.mockImplementation(
      (
        _tabId: number,
        _message: unknown,
        callback: (resp: unknown) => void
      ) => {
        chromeStub.runtime.lastError = null;
        callback({ success: true });
      }
    );

    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);
    registerPopupTestHooks();

    await act(async () => {
      await import("@/popup.ts");
      await flush(dom.window);
    });
  });

  afterEach(async () => {
    await act(async () => {
      cleanupPopupTestHooks();
      await flush(dom.window);
    });
    vi.unstubAllGlobals();
  });

  it("sends enableTableSort to the active tab and shows feedback", async () => {
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
    const pane = dom.window.document.querySelector('[data-pane="pane-table"]');
    expect(pane).not.toBeNull();
    expect(pane?.textContent ?? "").toContain("example.com/foo*");

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
});
