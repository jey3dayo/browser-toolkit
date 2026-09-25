import { Result } from "@praha/byethrow";
import type { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PopupApp } from "@/popup/App";
import { flush } from "../helpers/async";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "../helpers/popupChromeStub";
import { createPopupDom } from "../helpers/popupDom";

const mocks = vi.hoisted(() => ({
  openOptionsPane: vi.fn(),
}));

vi.mock("@/popup/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/popup/runtime")>();
  return {
    ...actual,
    createPopupRuntime: () => ({
      ...actual.createPopupRuntime(),
      openOptionsPane: mocks.openOptionsPane,
    }),
  };
});

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("popup cross-surface navigation", () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;

  beforeEach(() => {
    vi.resetModules();
    mocks.openOptionsPane.mockResolvedValue(Result.succeed());

    dom = createPopupDom("chrome-extension://test/popup.html#pane-actions");
    chromeStub = createPopupChromeStub();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.openOptionsPane.mockReset();
  });

  it("opens the options page and closes the popup from the settings rail item", async () => {
    const close = vi
      .spyOn(dom.window, "close")
      .mockImplementation(() => undefined);

    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp />);
      await flush(dom.window);
    });

    const settingsButton = dom.window.document.querySelector<HTMLButtonElement>(
      'aside.sidebar button[data-value="open-options"]'
    );
    expect(settingsButton).not.toBeNull();
    expect(settingsButton?.getAttribute("role")).not.toBe("tab");
    expect(settingsButton?.type).toBe("button");

    await act(async () => {
      settingsButton?.click();
      await flush(dom.window);
    });

    expect(mocks.openOptionsPane).toHaveBeenCalledWith(
      "pane-settings",
      undefined
    );
    expect(close).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it("selects a daily pane in place on the options page", async () => {
    vi.unstubAllGlobals();
    dom = createPopupDom("chrome-extension://test/options.html#pane-settings");
    chromeStub = createPopupChromeStub();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);

    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp surface="options" />);
      await flush(dom.window);
    });

    const actionsTab = dom.window.document.querySelector<HTMLButtonElement>(
      'aside.sidebar [role="tab"][data-value="pane-actions"]'
    );
    expect(actionsTab).not.toBeNull();

    await act(async () => {
      actionsTab?.click();
      await flush(dom.window);
    });

    expect(mocks.openOptionsPane).not.toHaveBeenCalled();
    expect(dom.window.location.hash).toBe("#pane-actions");
    expect(
      dom.window.document.querySelector('[data-pane="pane-actions"]')
    ).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("does not render a cross-surface rail item on the options page", async () => {
    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }

    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp surface="options" />);
      await flush(dom.window);
    });

    expect(
      dom.window.document.querySelector(
        'aside.sidebar button[data-value="open-options"]'
      )
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
