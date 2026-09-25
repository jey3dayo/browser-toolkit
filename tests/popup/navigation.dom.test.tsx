import type { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { PopupApp } from "@/popup/App";
import { getNavigationItems, navigationItems } from "@/popup/navigation-items";
import { flush } from "../helpers/async";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "../helpers/popupChromeStub";
import { createPopupDom } from "../helpers/popupDom";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("popup navigation (React + Base UI Tabs)", () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;

  const mountDom = (url: string): void => {
    dom = createPopupDom(url);
    chromeStub = createPopupChromeStub();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);
  };

  beforeEach(() => {
    vi.resetModules();
    mountDom("chrome-extension://test/popup.html#pane-table");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("derives initial tab from location.hash", async () => {
    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp />);
      await flush(dom.window);
    });

    expect(dom.window.location.hash).toBe("#pane-table");
    expect(
      dom.window.document.querySelector('[data-pane="pane-table"]')
    ).not.toBeNull();
    expect(
      dom.window.document.querySelector('[data-pane="pane-actions"]')
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("falls back to the surface default when the hash names a pane of the other surface", async () => {
    vi.unstubAllGlobals();
    mountDom("chrome-extension://test/popup.html#pane-settings");

    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp />);
      await flush(dom.window);
    });

    expect(dom.window.location.hash).toBe("#pane-actions");
    expect(
      dom.window.document.querySelector('[data-pane="pane-settings"]')
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("opens the manage panes on the options surface", async () => {
    vi.unstubAllGlobals();
    mountDom("chrome-extension://test/options.html#pane-settings");

    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp surface="options" />);
      await flush(dom.window);
    });

    expect(dom.window.location.hash).toBe("#pane-settings");
    expect(
      dom.window.document.querySelector('[data-pane="pane-settings"]')
    ).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("lists every pane on the options rail with a group break", async () => {
    vi.unstubAllGlobals();
    mountDom("chrome-extension://test/options.html#pane-settings");

    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp surface="options" />);
      await flush(dom.window);
    });

    const railTabs = dom.window.document.querySelectorAll(
      'aside.sidebar [role="tab"]'
    );
    expect(railTabs.length).toBe(navigationItems.length);
    expect(
      dom.window.document.querySelector(
        'aside.sidebar [role="tab"][data-value="pane-actions"]'
      )
    ).not.toBeNull();
    expect(
      dom.window.document.querySelectorAll("aside.sidebar .nav-group-separator")
        .length
    ).toBe(1);

    act(() => {
      root.unmount();
    });
  });

  it("moves the rail focus across the daily/manage group break", async () => {
    vi.unstubAllGlobals();
    mountDom("chrome-extension://test/options.html#pane-table");

    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp surface="options" />);
      await flush(dom.window);
    });

    const tableTab = dom.window.document.querySelector<HTMLElement>(
      'aside.sidebar [role="tab"][data-value="pane-table"]'
    );
    await act(async () => {
      tableTab?.focus();
      tableTab?.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowRight",
        })
      );
      await flush(dom.window);
    });

    expect(dom.window.document.activeElement?.getAttribute("data-value")).toBe(
      "pane-search-engines"
    );

    act(() => {
      root.unmount();
    });
  });

  it("keeps the popup rail limited to the daily panes", async () => {
    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp />);
      await flush(dom.window);
    });

    const railTabs = dom.window.document.querySelectorAll(
      'aside.sidebar [role="tab"]'
    );
    expect(railTabs.length).toBe(getNavigationItems("popup").length);
    expect(
      dom.window.document.querySelector(
        'aside.sidebar [role="tab"][data-value="pane-settings"]'
      )
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it.each(
    (["popup", "options"] as const).flatMap((surface) =>
      getNavigationItems(surface).map((item) => ({
        page: surface === "popup" ? "popup.html" : "options.html",
        paneId: item.id,
        surface,
      }))
    )
  )(
    "renders the $paneId pane for its rail item on the $surface surface",
    async ({ page, paneId, surface }) => {
      vi.unstubAllGlobals();
      mountDom(`chrome-extension://test/${page}#${paneId}`);

      const rootEl = dom.window.document.getElementById("root");
      if (!rootEl) {
        throw new Error("missing #root");
      }

      const root = createRoot(rootEl);
      await act(async () => {
        root.render(<PopupApp surface={surface} />);
        await flush(dom.window);
      });

      expect(
        dom.window.document.querySelector(
          `[role="tab"][data-value="${paneId}"]`
        )
      ).not.toBeNull();
      expect(
        dom.window.document.querySelector(`[data-pane="${paneId}"]`)
      ).not.toBeNull();

      act(() => {
        root.unmount();
      });
    }
  );

  it("keeps navigation metadata as translation keys for render-time resolution", () => {
    expect(navigationItems[0]).toMatchObject({
      ariaLabelKey: "navigation.actions",
      labelKey: "navigation.actions",
    });
    expect(navigationItems[0]).not.toHaveProperty("label");
    expect(navigationItems[0]).not.toHaveProperty("ariaLabel");
  });

  it("defines sidebar chrome labels in i18n resources", () => {
    expect(i18n.t("sidebar.menu")).toBe("メニュー");
    expect(i18n.t("common.close")).toBe("閉じる");
  });

  it("switches tabs and synchronizes hash", async () => {
    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp />);
      await flush(dom.window);
    });

    const createLinkTab = dom.window.document.querySelector<HTMLButtonElement>(
      '[role="tab"][data-value="pane-create-link"]'
    );
    await act(async () => {
      createLinkTab?.click();
      await flush(dom.window);
    });

    expect(dom.window.location.hash).toBe("#pane-create-link");
    expect(
      dom.window.document.querySelector('[data-pane="pane-create-link"]')
    ).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
