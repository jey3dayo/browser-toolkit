import type { JSDOM } from "jsdom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SearchBlocklistMutateRequest,
  SearchBlocklistMutateResponse,
} from "@/background/runtime_types";
import { flush } from "../helpers/async";
import { inputValue } from "../helpers/forms";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "../helpers/popupChromeStub";
import { createPopupDom } from "../helpers/popupDom";
import {
  cleanupPopupTestHooks,
  registerPopupTestHooks,
} from "../helpers/popupTestHooks";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type StoredRule = { id: string; pattern: string; createdAt: number };

function paneText(dom: JSDOM): string {
  return (
    dom.window.document.querySelector('[data-pane="pane-search-blocklist"]')
      ?.textContent ?? ""
  );
}

function corruptedBannerText(dom: JSDOM): string {
  return (
    dom.window.document.querySelector(
      '[data-testid="search-blocklist-corrupted"]'
    )?.textContent ?? ""
  );
}

function listedPatterns(dom: JSDOM): (string | null)[] {
  return Array.from(
    dom.window.document.querySelectorAll<HTMLElement>(".pattern-text"),
    (item) => item.textContent
  );
}

function successMutationResponse(
  rules: StoredRule[],
  revision: number,
  skippedCount = 0
): SearchBlocklistMutateResponse {
  return {
    type: "Success",
    value: { revision, rules, skippedCount },
  };
}

function failureMutationResponse(error: string): SearchBlocklistMutateResponse {
  return { error, type: "Failure" };
}

function mockMutationResponse(
  chromeStub: PopupChromeStub,
  response: SearchBlocklistMutateResponse
): void {
  chromeStub.runtime.sendMessage.mockImplementation(
    (
      _message: SearchBlocklistMutateRequest,
      callback?: (response: unknown) => void
    ) => {
      callback?.(response);
    }
  );
}

function createLocalStore(initialRules: StoredRule[] = []): {
  rules: StoredRule[];
  applyToStub: (chromeStub: PopupChromeStub) => void;
} {
  const state: { rules: StoredRule[] } = { rules: [...initialRules] };

  return {
    applyToStub: (chromeStub) => {
      chromeStub.storage.local.get.mockImplementation(
        (keys: string[], callback: (items: unknown) => void) => {
          chromeStub.runtime.lastError = null;
          const keyList = Array.isArray(keys) ? keys : [String(keys)];
          const items: Record<string, unknown> = {};
          if (keyList.includes("searchBlocklistRules")) {
            items.searchBlocklistRules = state.rules;
          }
          callback(items);
        }
      );
      chromeStub.storage.local.set.mockImplementation(
        (items: Record<string, unknown>, callback: () => void) => {
          chromeStub.runtime.lastError = null;
          if (Array.isArray(items.searchBlocklistRules)) {
            state.rules = items.searchBlocklistRules as StoredRule[];
          }
          callback();
        }
      );
    },
    get rules() {
      return state.rules;
    },
  };
}

async function setupSearchBlocklistPane(
  initialRules: StoredRule[] = []
): Promise<{
  dom: JSDOM;
  chromeStub: PopupChromeStub;
  store: ReturnType<typeof createLocalStore>;
}> {
  vi.resetModules();

  const dom = createPopupDom(
    "chrome-extension://test/popup.html#pane-search-blocklist"
  );
  const chromeStub = createPopupChromeStub();
  const store = createLocalStore(initialRules);
  store.applyToStub(chromeStub);

  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("navigator", dom.window.navigator);
  vi.stubGlobal("chrome", chromeStub);
  registerPopupTestHooks();

  await act(async () => {
    await import("@/popup.ts");
    await flush(dom.window, 8);
  });

  return { chromeStub, dom, store };
}

afterEach(async () => {
  const currentWindow =
    "setTimeout" in globalThis.window ? globalThis.window : null;

  await act(async () => {
    cleanupPopupTestHooks();
    if (currentWindow) {
      await flush(currentWindow, 4);
    }
  });
  vi.unstubAllGlobals();
});

describe("popup Search Blocklist pane", { timeout: 15_000 }, () => {
  it("renders existing rules from local storage", async () => {
    const { dom } = await setupSearchBlocklistPane([
      { createdAt: 1, id: "search-blocklist:one", pattern: "example.com" },
    ]);

    const pane = dom.window.document.querySelector(
      '[data-pane="pane-search-blocklist"]'
    );
    expect(pane).not.toBeNull();
    expect(pane?.textContent ?? "").toContain("example.com");
  });

  it("reports the skipped rule count and lists the unreadable rules", async () => {
    const { dom } = await setupSearchBlocklistPane([
      { createdAt: 1, id: "sbl-regexp", pattern: "/regexp/" },
      { createdAt: 2, id: "sbl-valid", pattern: "keep.example.com" },
      {
        createdAt: 3,
        id: "sbl-long",
        pattern: `*://*.${"a".repeat(250)}.com/*`,
      },
    ]);

    expect(corruptedBannerText(dom)).toContain("2件");
    expect(listedPatterns(dom)).toContain("/regexp/");
    expect(paneText(dom)).toContain("修正");
  });

  it("keeps reporting the skipped count returned by a mutation", async () => {
    const { dom, chromeStub } = await setupSearchBlocklistPane([
      { createdAt: 1, id: "sbl-regexp", pattern: "/regexp/" },
    ]);
    mockMutationResponse(
      chromeStub,
      successMutationResponse(
        [
          { createdAt: 2, id: "sbl-added", pattern: "*://*.example.com/*" },
          { createdAt: 1, id: "sbl-regexp", pattern: "/regexp/" },
        ],
        1,
        1
      )
    );

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="search-blocklist-input"]'
    );
    const add = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-add"]'
    );

    await act(async () => {
      inputValue(dom.window, input as HTMLInputElement, "example.com");
      add?.click();
      await flush(dom.window);
    });

    expect(corruptedBannerText(dom)).toContain("1件");
    expect(listedPatterns(dom)).toEqual(["*://*.example.com/*", "/regexp/"]);
  });

  it("adds a new rule from the background mutation response", async () => {
    const { dom, chromeStub, store } = await setupSearchBlocklistPane();
    mockMutationResponse(
      chromeStub,
      successMutationResponse(
        [
          {
            createdAt: 1,
            id: "sbl-added",
            pattern: "*://*.example.com/*",
          },
        ],
        1
      )
    );

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="search-blocklist-input"]'
    );
    const add = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-add"]'
    );
    expect(input).not.toBeNull();
    expect(add).not.toBeNull();

    await act(async () => {
      inputValue(dom.window, input as HTMLInputElement, "example.com");
      add?.click();
      await flush(dom.window);
    });

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith(
      {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "*://*.example.com/*",
      },
      expect.any(Function)
    );
    const patterns = Array.from(
      dom.window.document.querySelectorAll<HTMLElement>(".pattern-text"),
      (item) => item.textContent
    );
    expect(patterns).toEqual(["*://*.example.com/*"]);
    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    expect(store.rules).toHaveLength(0);
  });

  it("rejects invalid pattern syntax with an error message", async () => {
    const { dom, chromeStub } = await setupSearchBlocklistPane();

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="search-blocklist-input"]'
    );
    const add = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-add"]'
    );

    await act(async () => {
      inputValue(
        dom.window,
        input as HTMLInputElement,
        "/example\\.(net|org)/"
      );
      add?.click();
      await flush(dom.window);
    });

    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    expect(dom.window.document.body.textContent).toContain("v1 未対応");
  });

  it("rejects adding a rule once the 2000 rule limit is reached", async () => {
    const existing: StoredRule[] = Array.from({ length: 2000 }, (_, index) => ({
      createdAt: index,
      id: `search-blocklist:${index}`,
      pattern: `site${index}.example.com`,
    }));
    const { dom, chromeStub } = await setupSearchBlocklistPane(existing);
    const limitError = "ルール数が上限に達しています";
    mockMutationResponse(chromeStub, failureMutationResponse(limitError));

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="search-blocklist-input"]'
    );
    const add = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-add"]'
    );

    await act(async () => {
      inputValue(dom.window, input as HTMLInputElement, "overflow.example.com");
      add?.click();
      await flush(dom.window);
    });

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith(
      {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "*://*.overflow.example.com/*",
      },
      expect.any(Function)
    );
    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    expect(dom.window.document.body.textContent).toContain(limitError);
  });

  it("removes a rule from the background mutation response", async () => {
    const { dom, chromeStub, store } = await setupSearchBlocklistPane([
      { createdAt: 1, id: "search-blocklist:one", pattern: "example.com" },
      {
        createdAt: 2,
        id: "search-blocklist:two",
        pattern: "other.example.com",
      },
    ]);
    mockMutationResponse(
      chromeStub,
      successMutationResponse(
        [
          {
            createdAt: 2,
            id: "search-blocklist:two",
            pattern: "*://*.other.example.com/*",
          },
        ],
        1
      )
    );

    const remove = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-delete-search-blocklist:one"]'
    );
    expect(remove).not.toBeNull();

    await act(async () => {
      remove?.click();
      await flush(dom.window);
    });

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith(
      {
        action: "searchBlocklistMutate",
        op: "remove",
        ruleIds: ["search-blocklist:one"],
      },
      expect.any(Function)
    );
    const patterns = Array.from(
      dom.window.document.querySelectorAll<HTMLElement>(".pattern-text"),
      (item) => item.textContent
    );
    expect(patterns).toEqual(["*://*.other.example.com/*"]);
    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    expect(store.rules).toHaveLength(2);
  });

  it("edits an existing rule pattern", async () => {
    const { dom, chromeStub, store } = await setupSearchBlocklistPane([
      { createdAt: 1, id: "search-blocklist:one", pattern: "example.com" },
    ]);
    mockMutationResponse(
      chromeStub,
      successMutationResponse(
        [
          {
            createdAt: 1,
            id: "search-blocklist:one",
            pattern: "*://*.changed.example.com/*",
          },
        ],
        1
      )
    );

    const editButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-edit-search-blocklist:one"]'
    );
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
      await flush(dom.window);
    });

    const editInput = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="search-blocklist-edit-input-search-blocklist:one"]'
    );
    expect(editInput).not.toBeNull();

    await act(async () => {
      inputValue(
        dom.window,
        editInput as HTMLInputElement,
        "changed.example.com"
      );
      await flush(dom.window);
    });

    const saveButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-testid="search-blocklist-save-search-blocklist:one"]'
    );
    await act(async () => {
      saveButton?.click();
      await flush(dom.window);
    });

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith(
      {
        action: "searchBlocklistMutate",
        op: "update",
        pattern: "*://*.changed.example.com/*",
        ruleId: "search-blocklist:one",
      },
      expect.any(Function)
    );
    const patterns = Array.from(
      dom.window.document.querySelectorAll<HTMLElement>(".pattern-text"),
      (item) => item.textContent
    );
    expect(patterns).toEqual(["*://*.changed.example.com/*"]);
    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    expect(store.rules).toHaveLength(1);
  });
});
