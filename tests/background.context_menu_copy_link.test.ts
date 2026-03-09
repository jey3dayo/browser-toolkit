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

  it("adds copy title/link parent item under root menu", async () => {
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

  it("adds copy link submenu items under copy title/link parent", async () => {
    const registry = await import("@/background/context_menu_registry");
    const scheduleSpy = vi.spyOn(registry, "scheduleRefreshContextMenus");
    await import("@/background.ts");
    const scheduled = scheduleSpy.mock.results[0]?.value as
      | Promise<void>
      | undefined;
    if (scheduled) {
      await scheduled;
    }

    const created = chromeStub.contextMenus.create.mock.calls.map(
      (call) => call[0] as Record<string, unknown>
    );

    const subItems = created.filter(
      (item) => item.parentId === "mbu-copy-title-link"
    );
    const subItemIds = subItems.map((item) => item.id as string);

    expect(subItemIds).toContain("mbu-copy-link:url");
    expect(subItemIds).toContain("mbu-copy-link:text");
    expect(subItemIds).toContain("mbu-copy-link:markdown");
    expect(subItemIds).toContain("mbu-copy-link:html");
  });
});
