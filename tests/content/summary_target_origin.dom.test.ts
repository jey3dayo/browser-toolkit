import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSummaryTargetText } from "@/content/summary-target";
import { createChromeStub } from "../helpers/chromeStub";

describe("cached selection origin binding", () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body>page body</body></html>", {
      url: "https://viewer.example/page",
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

  function stubCachedSelection(payload: Record<string, unknown>): void {
    chrome.storage.local.get.mockImplementation(
      (_keys: unknown, callback?: (items: unknown) => void) => {
        chrome.runtime.lastError = null;
        callback?.(payload);
      }
    );
  }

  function freshPayload(extra: Record<string, unknown> = {}): {
    selectedText: string;
    selectedTextUpdatedAt: number;
    selectedTextOrigin?: string;
  } {
    return {
      selectedText: "fresh selection",
      selectedTextUpdatedAt: Date.now(),
      ...extra,
    };
  }

  it("uses the cache when origin matches", async () => {
    stubCachedSelection(
      freshPayload({ selectedTextOrigin: "https://viewer.example" })
    );

    const target = await getSummaryTargetText();

    expect(target.source).toBe("selection");
    expect(target.text).toBe("fresh selection");
    expect(target.url).toBe("https://viewer.example/page");
  });

  it("falls back to the page body on origin mismatch", async () => {
    stubCachedSelection(
      freshPayload({ selectedTextOrigin: "https://attacker.example" })
    );

    const target = await getSummaryTargetText();

    expect(target.source).toBe("page");
    expect(target.url).toBe("https://viewer.example/page");
  });

  it("falls back to the page body when selectedTextOrigin is missing", async () => {
    stubCachedSelection(freshPayload());

    const target = await getSummaryTargetText();

    expect(target.source).toBe("page");
    expect(target.url).toBe("https://viewer.example/page");
  });

  it("falls back to the page body when cached payload is invalid", async () => {
    stubCachedSelection(
      freshPayload({
        selectedTextOrigin: "https://viewer.example",
        selectedTextUpdatedAt: "invalid",
      })
    );

    const target = await getSummaryTargetText();

    expect(target.source).toBe("page");
  });

  it("falls back to the page body on a file: URL with a cached opaque origin", async () => {
    dom.window.close();
    dom = new JSDOM("<!doctype html><html><body>page body</body></html>", {
      url: "file:///tmp/a.html",
    });
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    stubCachedSelection(freshPayload({ selectedTextOrigin: "null" }));

    const target = await getSummaryTargetText();

    expect(target.source).toBe("page");
    expect(target.url).toBe("file:///tmp/a.html");
  });
});
