import type { JSDOM } from "jsdom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flush } from "./helpers/async";
import { createPopupChromeStub } from "./helpers/popupChromeStub";
import { createPopupDom } from "./helpers/popupDom";
import {
  cleanupPopupTestHooks,
  registerPopupTestHooks,
} from "./helpers/popupTestHooks";

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

function createLocalStoreWithOnChanged(initialRules: StoredRule[] = []): {
  rules: StoredRule[];
  applyToStub: (chromeStub: ReturnType<typeof createPopupChromeStub>) => {
    triggerChange: (nextRules: StoredRule[]) => void;
    addListenerSpy: ReturnType<typeof vi.fn>;
    removeListenerSpy: ReturnType<typeof vi.fn>;
  };
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

      const listeners = new Set<
        (
          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
          areaName: string
        ) => void
      >();
      const addListenerSpy = vi.fn(
        (
          listener: (
            changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
            areaName: string
          ) => void
        ) => {
          listeners.add(listener);
        }
      );
      const removeListenerSpy = vi.fn(
        (
          listener: (
            changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
            areaName: string
          ) => void
        ) => {
          listeners.delete(listener);
        }
      );

      (
        chromeStub as unknown as {
          storage: {
            onChanged: {
              addListener: typeof addListenerSpy;
              removeListener: typeof removeListenerSpy;
            };
          };
        }
      ).storage.onChanged = {
        addListener: addListenerSpy,
        removeListener: removeListenerSpy,
      };

      return {
        addListenerSpy,
        removeListenerSpy,
        triggerChange: (nextRules: StoredRule[]) => {
          state.rules = nextRules;
          for (const listener of listeners) {
            listener(
              { searchBlocklistRules: { newValue: nextRules } },
              "local"
            );
          }
        },
      };
    },
    get rules() {
      return state.rules;
    },
  };
}

async function setupSearchBlocklistPane(initialRules: StoredRule[] = []) {
  vi.resetModules();

  const dom = createPopupDom(
    "chrome-extension://test/popup.html#pane-search-blocklist"
  );
  const chromeStub = createPopupChromeStub();
  const store = createLocalStoreWithOnChanged(initialRules);
  const onChangedControls = store.applyToStub(chromeStub);

  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("navigator", dom.window.navigator);
  vi.stubGlobal("chrome", chromeStub);
  registerPopupTestHooks();

  await act(async () => {
    await import("@/popup.ts");
    await flush(dom.window, 8);
  });

  return { chromeStub, dom, onChangedControls, store };
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

describe("popup Search Blocklist storage sync", { timeout: 15_000 }, () => {
  it("refreshes the rule list when another context adds a rule via chrome.storage.onChanged", async () => {
    const { dom, onChangedControls } = await setupSearchBlocklistPane([
      { createdAt: 1, id: "sbl-one", pattern: "example.com" },
    ]);

    expect(paneText(dom)).toContain("example.com");
    expect(paneText(dom)).not.toContain("added-elsewhere.com");

    await act(async () => {
      onChangedControls.triggerChange([
        { createdAt: 1, id: "sbl-one", pattern: "example.com" },
        {
          createdAt: 2,
          id: "sbl-two",
          pattern: "added-elsewhere.com",
        },
      ]);
      await flush(dom.window, 8);
    });

    expect(paneText(dom)).toContain("added-elsewhere.com");
  });

  it("unsubscribes from chrome.storage.onChanged on unmount", async () => {
    const { onChangedControls } = await setupSearchBlocklistPane([]);

    expect(onChangedControls.addListenerSpy).toHaveBeenCalledTimes(1);
    expect(onChangedControls.removeListenerSpy).not.toHaveBeenCalled();

    act(() => {
      cleanupPopupTestHooks();
    });

    expect(onChangedControls.removeListenerSpy).toHaveBeenCalledTimes(1);
  });
});
