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

  it("removes and retries when Chrome reports a duplicate menu id", async () => {
    chromeStub.contextMenus.create
      .mockImplementationOnce((_properties, callback?: () => void) => {
        chromeStub.runtime.lastError = {
          message: "Cannot create item with duplicate id mbu-search-parent",
        };
        callback?.();
      })
      .mockImplementationOnce((_properties, callback?: () => void) => {
        chromeStub.runtime.lastError = null;
        callback?.();
      });

    const { createMenuItem } = await import(
      "@/background/context_menu_builder"
    );

    await expect(
      createMenuItem({
        id: "mbu-search-parent",
        title: "Search",
        contexts: ["selection"],
      })
    ).resolves.toBeUndefined();

    expect(chromeStub.contextMenus.remove).toHaveBeenCalledWith(
      "mbu-search-parent",
      expect.any(Function)
    );
    expect(chromeStub.contextMenus.create).toHaveBeenCalledTimes(2);
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
        id: "mbu-search-parent",
        title: "Search",
        contexts: ["selection"],
      })
    ).rejects.toThrow("Parent item not found");

    expect(chromeStub.contextMenus.remove).not.toHaveBeenCalled();
  });

  it("rejects when duplicate recovery also reports a duplicate id", async () => {
    chromeStub.contextMenus.create.mockImplementation(
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
        id: "mbu-search-parent",
        title: "Search",
        contexts: ["selection"],
      })
    ).rejects.toThrow("Cannot create item with duplicate id");

    expect(chromeStub.contextMenus.remove).toHaveBeenCalledTimes(1);
    expect(chromeStub.contextMenus.create).toHaveBeenCalledTimes(2);
  });
});
