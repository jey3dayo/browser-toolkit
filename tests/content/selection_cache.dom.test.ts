import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheCurrentSelection,
  setupSelectionCache,
} from "@/content/selection-cache";
import { createChromeStub } from "../helpers/chromeStub";

describe("selection cache write path", () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "https://attacker.example/page",
    });
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("chrome", createChromeStub());
  });

  afterEach(() => {
    dom.window.close();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function selectText(node: Text): void {
    const range = dom.window.document.createRange();
    range.selectNodeContents(node);
    dom.window.getSelection()?.removeAllRanges();
    dom.window.getSelection()?.addRange(range);
  }

  it("records selectedText with page origin on a real write path", () => {
    const text = dom.window.document.body.appendChild(
      dom.window.document.createTextNode("selected content")
    );
    selectText(text);

    cacheCurrentSelection();

    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    const payload = chrome.storage.local.set.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload.selectedText).toBe("selected content");
    expect(payload.selectedTextOrigin).toBe("https://attacker.example");
    expect(typeof payload.selectedTextUpdatedAt).toBe("number");
  });

  it("does not write from a synthetic mouseup (isTrusted=false)", () => {
    setupSelectionCache();
    const text = dom.window.document.body.appendChild(
      dom.window.document.createTextNode("selected content")
    );
    selectText(text);

    dom.window.document.dispatchEvent(
      new dom.window.MouseEvent("mouseup", { bubbles: true })
    );

    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("does not write when no text is selected", () => {
    cacheCurrentSelection();

    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});
