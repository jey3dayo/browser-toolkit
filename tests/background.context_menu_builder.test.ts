import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

describe("background: context menu builder", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    chromeStub = createChromeStub();
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates the existing item when Chrome reports a duplicate menu id", async () => {
    chromeStub.contextMenus.create.mockImplementationOnce(
      (_properties, callback?: () => void) => {
        chromeStub.runtime.lastError = {
          message: "Cannot create item with duplicate id mbu-search-parent",
        };
        callback?.();
      }
    );

    const { createMenuItem } = await import(
      "@/background/context_menu_builder"
    );

    await expect(
      createMenuItem({
        contexts: ["selection"],
        id: "mbu-search-parent",
        title: "Search",
      })
    ).resolves.toBeUndefined();

    expect(chromeStub.contextMenus.update).toHaveBeenCalledWith(
      "mbu-search-parent",
      {
        contexts: ["selection"],
        title: "Search",
      },
      expect.any(Function)
    );
    expect(chromeStub.contextMenus.remove).not.toHaveBeenCalled();
  });

  it("rejects non-duplicate creation errors", async () => {
    chromeStub.contextMenus.create.mockImplementationOnce(
      (_properties, callback?: () => void) => {
        chromeStub.runtime.lastError = {
          message: "Parent item not found",
        };
        callback?.();
      }
    );

    const { createMenuItem } = await import(
      "@/background/context_menu_builder"
    );

    await expect(
      createMenuItem({
        contexts: ["selection"],
        id: "mbu-search-parent",
        title: "Search",
      })
    ).rejects.toThrow("Parent item not found");
  });
});
