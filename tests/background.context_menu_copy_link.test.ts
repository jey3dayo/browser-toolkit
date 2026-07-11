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
    // モジュールロードだけでは再構築が走らないこと（SW復帰ごとの
    // removeAll→再作成による空白ウィンドウ再発の regression guard）
    expect(scheduleSpy).not.toHaveBeenCalled();
    const onInstalledListener =
      chromeStub.runtime.onInstalled.addListener.mock.calls[0]?.[0];
    expect(onInstalledListener).toBeDefined();
    onInstalledListener?.({ reason: "install" });
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
    expect(created).toContainEqual(
      expect.objectContaining({
        id: "mbu-root",
        contexts: ["page", "selection", "editable", "link"],
      })
    );
  });

  it("adds copy link submenu items under copy title/link parent", async () => {
    const registry = await import("@/background/context_menu_registry");
    const scheduleSpy = vi.spyOn(registry, "scheduleRefreshContextMenus");
    await import("@/background.ts");
    const onInstalledListener =
      chromeStub.runtime.onInstalled.addListener.mock.calls[0]?.[0];
    onInstalledListener?.({ reason: "install" });
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

  it("adds built-in QR code and calendar root items with localized labels", async () => {
    const registry = await import("@/background/context_menu_registry");
    const scheduleSpy = vi.spyOn(registry, "scheduleRefreshContextMenus");
    await import("@/background.ts");
    const onInstalledListener =
      chromeStub.runtime.onInstalled.addListener.mock.calls[0]?.[0];
    onInstalledListener?.({ reason: "install" });
    const scheduled = scheduleSpy.mock.results[0]?.value as
      | Promise<void>
      | undefined;
    if (scheduled) {
      await scheduled;
    }

    const created = chromeStub.contextMenus.create.mock.calls.map(
      (call) => call[0] as Record<string, unknown>
    );

    expect(created).toContainEqual(
      expect.objectContaining({
        id: "mbu-qr-code",
        parentId: "mbu-root",
        title: "QRコードを表示",
      })
    );
    expect(created).toContainEqual(
      expect.objectContaining({
        id: "mbu-calendar-register",
        parentId: "mbu-root",
        title: "カレンダー登録",
      })
    );
    expect(created).toContainEqual(
      expect.objectContaining({
        id: "mbu-gemini-research",
        parentId: "mbu-root",
        title: "Geminiで要約",
        contexts: ["page", "selection", "link"],
      })
    );
  });
});
