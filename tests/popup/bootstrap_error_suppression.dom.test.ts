import type { JSDOM } from "jsdom";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapSurface } from "@/popup/bootstrap";
import { flush } from "../helpers/async";
import {
  createPopupChromeStub,
  type PopupChromeStub,
} from "../helpers/popupChromeStub";
import { createPopupDom } from "../helpers/popupDom";

type SurfaceTestHooks = { unmount?: () => void };

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function dispatchWindowError(dom: JSDOM, message: string): boolean {
  const event = new dom.window.ErrorEvent("error", {
    cancelable: true,
    message,
  });
  dom.window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("popup window error suppression", () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;
  let hooks: SurfaceTestHooks;

  beforeEach(async () => {
    vi.resetModules();
    dom = createPopupDom("chrome-extension://test/popup.html#pane-actions");
    chromeStub = createPopupChromeStub();
    hooks = {};
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);
    (
      globalThis as unknown as { __MBU_TEST_HOOKS__?: SurfaceTestHooks }
    ).__MBU_TEST_HOOKS__ = hooks;

    await act(async () => {
      bootstrapSurface("popup");
      await flush(dom.window);
    });
  });

  afterEach(() => {
    hooks.unmount?.();
    (
      globalThis as unknown as { __MBU_TEST_HOOKS__?: SurfaceTestHooks }
    ).__MBU_TEST_HOOKS__ = undefined;
    vi.unstubAllGlobals();
  });

  it("suppresses the benign ResizeObserver reentry warnings", () => {
    expect(
      dispatchWindowError(
        dom,
        "ResizeObserver loop completed with undelivered notifications."
      )
    ).toBe(true);
    expect(dispatchWindowError(dom, "ResizeObserver loop limit exceeded")).toBe(
      true
    );
  });

  it("lets other ResizeObserver errors reach the console", () => {
    expect(dispatchWindowError(dom, "ResizeObserver is not defined")).toBe(
      false
    );
    expect(
      dispatchWindowError(
        dom,
        "Failed to construct 'ResizeObserver': 1 argument required"
      )
    ).toBe(false);
  });

  it("leaves unrelated errors untouched", () => {
    expect(dispatchWindowError(dom, "Something else broke")).toBe(false);
  });
});
