import { Result } from "@praha/byethrow";
import type { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPopupRuntime } from "@/popup/runtime";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "./helpers/popupChromeStub";
import { createPopupDom } from "./helpers/popupDom";

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
