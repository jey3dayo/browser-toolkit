import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeButtonPosition,
  computeDialogPosition,
  findEntryForNode,
  splitPatternLines,
  suggestPatternFromUrl,
} from "@/content/search-blocklist-ui/dom";
import type { BlocklistEntry } from "@/search-blocklist/types";

function makeEntry(
  container: HTMLElement,
  overrides: Partial<BlocklistEntry> = {}
): BlocklistEntry {
  return {
    blocked: false,
    container,
    matchedRuleIds: [],
    title: "title",
    url: "https://example.com/",
    ...overrides,
  };
}

describe("search-blocklist-ui/dom", () => {
  describe("findEntryForNode", () => {
    it("finds the entry whose container is an ancestor of the hovered node", () => {
      const container = document.createElement("div");
      const heading = document.createElement("h3");
      container.appendChild(heading);
      document.body.appendChild(container);

      const entry = makeEntry(container);
      expect(findEntryForNode(heading, [entry])).toBe(entry);
    });

    it("returns null when no entry contains the node", () => {
      const container = document.createElement("div");
      const unrelated = document.createElement("span");
      document.body.appendChild(container);
      document.body.appendChild(unrelated);

      const entry = makeEntry(container);
      expect(findEntryForNode(unrelated, [entry])).toBeNull();
    });

    it("returns null for a null node", () => {
      expect(findEntryForNode(null, [])).toBeNull();
    });
  });

  describe("computeButtonPosition", () => {
    it("anchors to the top-right corner of the container rect", () => {
      const rect = { right: 500, top: 120 } as DOMRect;
      expect(computeButtonPosition(rect)).toEqual({ left: 472, top: 120 });
    });

    it("clamps negative coordinates to zero", () => {
      const rect = { right: 10, top: -50 } as DOMRect;
      const position = computeButtonPosition(rect);
      expect(position.top).toBe(0);
    });
  });

  describe("computeDialogPosition", () => {
    const viewport = { height: 800, width: 1000 };
    const popupSize = { height: 300, width: 360 };

    it("places the popup below the trigger, right-aligned to its right edge", () => {
      const triggerRect = { bottom: 220, right: 500, top: 200 };
      const position = computeDialogPosition(triggerRect, popupSize, viewport);
      expect(position).toEqual({ left: 140, placement: "below", top: 228 });
    });

    it("clamps the left edge so the popup stays inside the right viewport bound", () => {
      const triggerRect = { bottom: 220, right: 995, top: 200 };
      const position = computeDialogPosition(triggerRect, popupSize, viewport);
      expect(position.left).toBe(1000 - 360 - 16);
    });

    it("flips above the trigger when there is not enough room below", () => {
      const triggerRect = { bottom: 750, right: 500, top: 730 };
      const position = computeDialogPosition(triggerRect, popupSize, viewport);
      expect(position.placement).toBe("above");
      expect(position.top).toBe(730 - 8 - 300);
    });

    it("clamps the top edge when flipping above still overflows the viewport", () => {
      const triggerRect = { bottom: 40, right: 500, top: 20 };
      const tallPopup = { height: 780, width: 360 };
      const position = computeDialogPosition(triggerRect, tallPopup, viewport);
      expect(position.placement).toBe("above");
      expect(position.top).toBe(16);
    });

    it("clamps both edges when the viewport is narrower than the popup plus margins", () => {
      const narrowViewport = { height: 800, width: 340 };
      const narrowPopup = { height: 300, width: narrowViewport.width - 32 };
      const triggerRect = { bottom: 100, right: 320, top: 80 };
      const position = computeDialogPosition(
        triggerRect,
        narrowPopup,
        narrowViewport
      );
      expect(position.left).toBe(16);
    });
  });

  describe("suggestPatternFromUrl", () => {
    it("extracts the hostname from a valid URL", () => {
      expect(suggestPatternFromUrl("https://sub.example.com/path?q=1")).toBe(
        "sub.example.com"
      );
    });

    it("returns an empty string for an invalid URL", () => {
      expect(suggestPatternFromUrl("not-a-url")).toBe("");
    });
  });

  describe("splitPatternLines", () => {
    it("trims and drops empty lines", () => {
      expect(splitPatternLines(" example.com \n\n *.foo.com \n")).toEqual([
        "example.com",
        "*.foo.com",
      ]);
    });

    it("returns an empty array for blank input", () => {
      expect(splitPatternLines("   \n  ")).toEqual([]);
    });
  });
});

describe("search-blocklist-ui/diagnostics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a diagnostics response from a snapshot", async () => {
    const { buildDiagnosticsResponse } = await import(
      "@/content/search-blocklist-ui/diagnostics"
    );
    const response = buildDiagnosticsResponse({
      blockedCount: 2,
      engineId: "google",
      entries: [],
      ruleRevision: 5,
    });
    expect(response).toEqual({
      available: true,
      blockedCount: 2,
      detectedCount: 0,
      engineId: "google",
      ruleRevision: 5,
    });
  });

  it("counts detectedCount from the snapshot entries length", async () => {
    const { buildDiagnosticsResponse } = await import(
      "@/content/search-blocklist-ui/diagnostics"
    );
    const container = document.createElement("div");
    const response = buildDiagnosticsResponse({
      blockedCount: 1,
      engineId: "google",
      entries: [makeEntry(container), makeEntry(container, { blocked: true })],
      ruleRevision: 1,
    });
    expect(response).toEqual({
      available: true,
      blockedCount: 1,
      detectedCount: 2,
      engineId: "google",
      ruleRevision: 1,
    });
  });

  it("reports unavailable for a null snapshot (no search-results page)", async () => {
    const { buildDiagnosticsResponse } = await import(
      "@/content/search-blocklist-ui/diagnostics"
    );
    expect(buildDiagnosticsResponse(null)).toEqual({ available: false });
  });
});
