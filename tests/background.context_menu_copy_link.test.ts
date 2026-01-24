import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

describe("background: context menu", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    chromeStub = createChromeStub();
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds copy title/link item under root menu", async () => {
    const registry = await import("@/background/context_menu_registry");
    const scheduleSpy = vi.spyOn(registry, "scheduleRefreshContextMenus");
    await import("@/background.ts");
    expect(scheduleSpy).toHaveBeenCalled();
    const scheduled = scheduleSpy.mock.results[0]?.value as
      | Promise<void>
      | undefined;
    if (scheduled) {
      await scheduled;
    }

    const created = chromeStub.contextMenus.create.mock.calls.map(
      (call) => call[0] as Record<string, unknown>
    );

    expect(
      created.some(
        (item) =>
          item.id === "mbu-copy-title-link" &&
          item.parentId === "mbu-root" &&
          item.title === "タイトルとリンクをコピー"
      )
    ).toBe(true);
  });
});
