import type { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { PopupApp } from "@/popup/App";
import { getNavigationItems, navigationItems } from "@/popup/navigation-items";
import { flush } from "./helpers/async";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "./helpers/popupChromeStub";
import { createPopupDom } from "./helpers/popupDom";

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

  it("splits navigation into the daily and manage groups", () => {
    const groups = navigationItems.map((item) => item.group);
    const firstManageIndex = groups.indexOf("manage");

    expect(groups.slice(0, firstManageIndex).every((g) => g === "daily")).toBe(
      true
    );
    expect(groups.slice(firstManageIndex).every((g) => g === "manage")).toBe(
      true
    );
    expect(getNavigationItems("popup").map((item) => item.group)).toEqual(
      groups.filter((group) => group === "daily")
    );
    expect(getNavigationItems("options").map((item) => item.group)).toEqual(
      groups.filter((group) => group === "manage")
    );
  });

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
