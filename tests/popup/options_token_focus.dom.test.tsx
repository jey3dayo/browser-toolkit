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

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("options surface token focus", () => {
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

  const renderOptions = async (): Promise<ReturnType<typeof createRoot>> => {
    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }
    const root = createRoot(rootEl);
    await act(async () => {
      root.render(<PopupApp surface="options" />);
      await flush(dom.window);
    });
    await act(async () => {
      await flush(dom.window);
    });
    return root;
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("focuses the token input when the hash requests it", async () => {
    mountDom("chrome-extension://test/options.html#pane-settings?focus=token");
    const root = await renderOptions();

    const tokenInput = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="ai-token"]'
    );
    expect(tokenInput).not.toBeNull();
    expect(dom.window.document.activeElement).toBe(tokenInput);

    act(() => {
      root.unmount();
    });
  });

  it("leaves focus alone without the focus parameter", async () => {
    mountDom("chrome-extension://test/options.html#pane-settings");
    const root = await renderOptions();

    const tokenInput = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="ai-token"]'
    );
    expect(tokenInput).not.toBeNull();
    expect(dom.window.document.activeElement).not.toBe(tokenInput);

    act(() => {
      root.unmount();
    });
  });
});
