import type { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionTargetAccordion } from "@/popup/panes/actions/ActionTargetAccordion";
import { createPopupDom } from "../helpers/popupDom";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ActionTargetAccordion", () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = createPopupDom();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the accordion when whitespace-only text becomes non-empty", () => {
    const rootEl = dom.window.document.getElementById("root");
    if (!rootEl) {
      throw new Error("missing #root");
    }
    const root = createRoot(rootEl);

    act(() => {
      root.render(
        <ActionTargetAccordion
          sourceLabel="selection"
          target={{ source: "selection", text: "   " }}
        />
      );
    });
    expect(rootEl.querySelector("textarea")).toBeNull();

    act(() => {
      root.render(
        <ActionTargetAccordion
          sourceLabel="selection"
          target={{ source: "selection", text: "hello" }}
        />
      );
    });
    expect(rootEl.querySelector("textarea")?.value).toBe("hello");

    act(() => {
      root.unmount();
    });
  });
});
