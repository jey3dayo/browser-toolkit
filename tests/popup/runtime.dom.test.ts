import { Result } from "@praha/byethrow";
import type { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPopupRuntime } from "@/popup/runtime";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "../helpers/popupChromeStub";
import { createPopupDom } from "../helpers/popupDom";

describe("createPopupRuntime", () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("when running outside the extension page", () => {
    beforeEach(() => {
      dom = createPopupDom("https://example.com/popup.html");
      chromeStub = createPopupChromeStub();
      vi.stubGlobal("window", dom.window);
      vi.stubGlobal("document", dom.window.document);
      vi.stubGlobal("navigator", dom.window.navigator);
      vi.stubGlobal("chrome", chromeStub);
    });

    it("uses localStorage fallback for sync/local storage operations", async () => {
      const runtime = createPopupRuntime();

      const setResult = await runtime.storageSyncSet({
        linkFormat: "markdown",
      });
      expect(Result.isSuccess(setResult)).toBe(true);
      expect(chromeStub.storage.sync.set).not.toHaveBeenCalled();

      const getSyncResult = await runtime.storageSyncGet(["linkFormat"]);
      expect(Result.isSuccess(getSyncResult)).toBe(true);
      if (Result.isSuccess(getSyncResult)) {
        expect(getSyncResult.value.linkFormat).toBe("markdown");
      }

      const localSetResult = await runtime.storageLocalSet({
        openaiApiToken: "sk-test",
      });
      expect(Result.isSuccess(localSetResult)).toBe(true);
      expect(chromeStub.storage.local.set).not.toHaveBeenCalled();

      const removeResult = await runtime.storageLocalRemove("openaiApiToken");
      expect(Result.isSuccess(removeResult)).toBe(true);
      expect(chromeStub.storage.local.remove).not.toHaveBeenCalled();

      const getLocalResult = await runtime.storageLocalGet(["openaiApiToken"]);
      expect(Result.isSuccess(getLocalResult)).toBe(true);
      if (Result.isSuccess(getLocalResult)) {
        expect(getLocalResult.value.openaiApiToken).toBeUndefined();
      }
    });
  });

  describe("when running as an extension page", () => {
    beforeEach(() => {
      dom = createPopupDom();
      chromeStub = createPopupChromeStub();
      vi.stubGlobal("window", dom.window);
      vi.stubGlobal("document", dom.window.document);
      vi.stubGlobal("navigator", dom.window.navigator);
      vi.stubGlobal("chrome", chromeStub);
    });

    it("delegates storage reads to the matching Chrome storage area", async () => {
      chromeStub.storage.sync.get.mockImplementation(
        (_keys: unknown, callback?: (items: unknown) => void) => {
          chromeStub.runtime.lastError = null;
          callback?.({ linkFormat: "html" });
        }
      );
      chromeStub.storage.local.get.mockImplementation(
        (_keys: unknown, callback?: (items: unknown) => void) => {
          chromeStub.runtime.lastError = null;
          callback?.({ openaiApiToken: "sk-live" });
        }
      );

      const runtime = createPopupRuntime();
      const syncResult = await runtime.storageSyncGet(["linkFormat"]);
      const localResult = await runtime.storageLocalGet(["openaiApiToken"]);

      expect(chromeStub.storage.sync.get).toHaveBeenCalledWith(
        ["linkFormat"],
        expect.any(Function)
      );
      expect(chromeStub.storage.local.get).toHaveBeenCalledWith(
        ["openaiApiToken"],
        expect.any(Function)
      );

      expect(Result.isSuccess(syncResult)).toBe(true);
      expect(Result.isSuccess(localResult)).toBe(true);
      if (Result.isSuccess(syncResult)) {
        expect(syncResult.value.linkFormat).toBe("html");
      }
      if (Result.isSuccess(localResult)) {
        expect(localResult.value.openaiApiToken).toBe("sk-live");
      }
    });

    it("opens the surface page that hosts the requested pane", async () => {
      const runtime = createPopupRuntime();
      const result = await runtime.openOptionsPane("pane-settings", {
        focus: "token",
      });

      expect(Result.isSuccess(result)).toBe(true);
      expect(chromeStub.runtime.getURL).toHaveBeenCalledWith(
        "options.html#pane-settings?focus=token"
      );
      expect(chromeStub.tabs.create).toHaveBeenCalledWith(
        {
          url: "chrome-extension://test/options.html#pane-settings?focus=token",
        },
        expect.any(Function)
      );

      const popupResult = await runtime.openOptionsPane("pane-actions");
      expect(Result.isSuccess(popupResult)).toBe(true);
      expect(chromeStub.runtime.getURL).toHaveBeenCalledWith(
        "popup.html#pane-actions"
      );
    });

    it("queries search result tabs and picks the most recently accessed one", async () => {
      chromeStub.tabs.query.mockImplementation(
        (_queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
          chromeStub.runtime.lastError = null;
          callback?.([
            { id: 11, lastAccessed: 100 },
            { id: 12, lastAccessed: 300 },
            { id: 13, lastAccessed: 200 },
          ]);
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.getSearchResultTabId();

      expect(chromeStub.tabs.query).toHaveBeenCalledWith(
        {
          url: ["*://www.google.com/search*", "*://www.google.co.jp/search*"],
        },
        expect.any(Function)
      );
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(12);
      }
    });

    it("falls back to the first search result tab when lastAccessed is missing", async () => {
      chromeStub.tabs.query.mockImplementation(
        (_queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
          chromeStub.runtime.lastError = null;
          callback?.([{ id: 21 }, { id: 22 }]);
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.getSearchResultTabId();

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(21);
      }
    });

    it("returns null when no search result tab is open", async () => {
      const runtime = createPopupRuntime();
      const result = await runtime.getSearchResultTabId();

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBeNull();
      }
    });

    it("returns a failure when the search result tab query reports lastError", async () => {
      chromeStub.tabs.query.mockImplementation(
        (_queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
          chromeStub.runtime.lastError = { message: "query failed" };
          callback?.([]);
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.getSearchResultTabId();

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error).toBe("query failed");
      }
    });

    it("falls back to the most recently accessed web tab when the options page is active", async () => {
      chromeStub.tabs.query.mockImplementation(
        (queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
          chromeStub.runtime.lastError = null;
          const info = queryInfo as { active?: boolean };
          if (info.active) {
            callback?.([
              {
                id: 1,
                title: "設定",
                url: "chrome-extension://test/options.html#pane-actions",
              },
            ]);
            return;
          }
          callback?.([
            {
              id: 1,
              url: "chrome-extension://test/options.html#pane-actions",
            },
            {
              id: 2,
              lastAccessed: 100,
              title: "old",
              url: "https://example.com/old",
            },
            {
              id: 3,
              lastAccessed: 300,
              title: "recent",
              url: "https://example.com/recent",
            },
          ]);
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.getActiveTab();

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({
          id: 3,
          title: "recent",
          url: "https://example.com/recent",
        });
      }
    });

    it("keeps the active tab when it is already a web page", async () => {
      chromeStub.tabs.query.mockImplementation(
        (_queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
          chromeStub.runtime.lastError = null;
          callback?.([
            { id: 7, title: "page", url: "https://example.com/page" },
          ]);
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.getActiveTab();

      expect(chromeStub.tabs.query).toHaveBeenCalledTimes(1);
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({
          id: 7,
          title: "page",
          url: "https://example.com/page",
        });
      }
    });

    it("returns null when the options page is active and no web tab is open", async () => {
      chromeStub.tabs.query.mockImplementation(
        (queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
          chromeStub.runtime.lastError = null;
          const info = queryInfo as { active?: boolean };
          if (info.active) {
            callback?.([
              { id: 1, url: "chrome-extension://test/options.html" },
            ]);
            return;
          }
          callback?.([
            { id: 1, url: "chrome-extension://test/options.html" },
            { id: 4, url: "chrome://extensions" },
          ]);
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.getActiveTab();

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBeNull();
      }
    });

    it("returns a failure when Chrome storage remove reports lastError", async () => {
      chromeStub.storage.local.remove.mockImplementation(
        (_keys: unknown, callback?: () => void) => {
          chromeStub.runtime.lastError = { message: "remove failed" };
          callback?.();
        }
      );

      const runtime = createPopupRuntime();
      const result = await runtime.storageLocalRemove("openaiApiToken");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error).toBe("remove failed");
      }
    });
  });
});
