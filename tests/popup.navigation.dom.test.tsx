import type { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { PopupApp } from "@/popup/App";
import { navigationItems } from "@/popup/navigation-items";
import { coercePaneId, getPaneIdFromHash } from "@/popup/panes";
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

  beforeEach(() => {
    vi.resetModules();

    dom = createPopupDom("chrome-extension://test/popup.html#pane-settings");
    chromeStub = createPopupChromeStub();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);
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

    expect(dom.window.location.hash).toBe("#pane-settings");
    expect(
      dom.window.document.querySelector('[data-pane="pane-settings"]')
    ).not.toBeNull();
    expect(
      dom.window.document.querySelector('[data-pane="pane-actions"]')
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("maps the legacy debug hash onto the settings pane", () => {
    expect(getPaneIdFromHash("#pane-debug")).toBe("pane-settings");
    expect(coercePaneId("pane-debug")).toBe("pane-settings");
    expect(getPaneIdFromHash("#pane-unknown")).toBeNull();
    expect(navigationItems.some((item) => item.id === "pane-settings")).toBe(
      true
    );
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

    const tableTab = dom.window.document.querySelector<HTMLButtonElement>(
      '[role="tab"][data-value="pane-table"]'
    );
    await act(async () => {
      tableTab?.click();
      await flush(dom.window);
    });

    expect(dom.window.location.hash).toBe("#pane-table");
    expect(
      dom.window.document.querySelector('[data-pane="pane-table"]')
    ).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
