import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

describe("background: focus override registration", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    chromeStub = createChromeStub();
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers a main-world document_start script for configured patterns", async () => {
    chromeStub.storage.sync.get.mockImplementation(
      (_keys: unknown, callback?: (items: unknown) => void) => {
        chromeStub.runtime.lastError = null;
        callback?.({
          focusOverridePatterns: ["https://pocket.shonenmagazine.com/title/*"],
        });
      }
    );

    const { syncFocusOverrideContentScript } = await import(
      "@/background/focus_override_registration"
    );
    await syncFocusOverrideContentScript();

    expect(chromeStub.scripting.registerContentScripts).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "mbu-focus-override",
        js: ["dist/focus-override.js"],
        matches: ["*://pocket.shonenmagazine.com/title/*"],
        runAt: "document_start",
        world: "MAIN",
      }),
    ]);
  });

  it("unregisters the script when no patterns are configured", async () => {
    chromeStub.storage.sync.get.mockImplementation(
      (_keys: unknown, callback?: (items: unknown) => void) => {
        chromeStub.runtime.lastError = null;
        callback?.({ focusOverridePatterns: [] });
      }
    );
    chromeStub.scripting.getRegisteredContentScripts.mockResolvedValue([
      { id: "mbu-focus-override" },
    ]);

    const { syncFocusOverrideContentScript } = await import(
      "@/background/focus_override_registration"
    );
    await syncFocusOverrideContentScript();

    expect(chromeStub.scripting.unregisterContentScripts).toHaveBeenCalledWith({
      ids: ["mbu-focus-override"],
    });
    expect(chromeStub.scripting.registerContentScripts).not.toHaveBeenCalled();
  });

  it("serializes overlapping calls so registration never overlaps", async () => {
    chromeStub.storage.sync.get.mockImplementation(
      (_keys: unknown, callback?: (items: unknown) => void) => {
        chromeStub.runtime.lastError = null;
        callback?.({
          focusOverridePatterns: ["https://pocket.shonenmagazine.com/title/*"],
        });
      }
    );

    let inFlight = 0;
    let maxConcurrent = 0;

    const trackConcurrency = async () => {
      inFlight += 1;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    };

    chromeStub.scripting.getRegisteredContentScripts.mockImplementation(
      async () => {
        await trackConcurrency();
        return [];
      }
    );
    chromeStub.scripting.registerContentScripts.mockImplementation(async () => {
      await trackConcurrency();
    });

    const { syncFocusOverrideContentScript } = await import(
      "@/background/focus_override_registration"
    );

    const first = syncFocusOverrideContentScript();
    const second = syncFocusOverrideContentScript();

    await expect(Promise.all([first, second])).resolves.toBeDefined();

    expect(maxConcurrent).toBe(1);
    expect(chromeStub.scripting.registerContentScripts).toHaveBeenCalledTimes(
      2
    );
  });
});
