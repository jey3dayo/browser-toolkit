import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeButtonPosition,
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
