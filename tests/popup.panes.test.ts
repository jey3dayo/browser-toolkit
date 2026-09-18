import { describe, expect, it } from "vitest";
import {
  coercePaneId,
  getDefaultPane,
  getPaneSurface,
  getPaneSurfacePage,
  parsePaneHash,
  resolvePaneIdForSurface,
} from "@/popup/panes";

describe("pane surfaces", () => {
  it("assigns the daily panes to the popup and the manage panes to the options page", () => {
    expect(getPaneSurface("pane-actions")).toBe("popup");
    expect(getPaneSurface("pane-calendar")).toBe("popup");
    expect(getPaneSurface("pane-create-link")).toBe("popup");
    expect(getPaneSurface("pane-search-blocklist")).toBe("popup");
    expect(getPaneSurface("pane-table")).toBe("popup");

    expect(getPaneSurface("pane-search-engines")).toBe("options");
    expect(getPaneSurface("pane-search-groups")).toBe("options");
    expect(getPaneSurface("pane-templates")).toBe("options");
    expect(getPaneSurface("pane-history")).toBe("options");
    expect(getPaneSurface("pane-settings")).toBe("options");
  });

  it("exposes the page that hosts each surface", () => {
    expect(getPaneSurfacePage("pane-actions")).toBe("popup.html");
    expect(getPaneSurfacePage("pane-settings")).toBe("options.html");
    expect(getPaneSurfacePage("pane-history")).toBe("options.html");
  });

  it("defines a default pane per surface", () => {
    expect(getDefaultPane("popup")).toBe("pane-actions");
    expect(getDefaultPane("options")).toBe("pane-settings");
  });
});

describe("pane hash parsing", () => {
  it("reads the pane id and the token focus flag", () => {
    expect(parsePaneHash("#pane-settings?focus=token")).toEqual({
      focusToken: true,
      paneId: "pane-settings",
    });
    expect(parsePaneHash("#pane-settings")).toEqual({
      focusToken: false,
      paneId: "pane-settings",
    });
    expect(parsePaneHash("#pane-settings?focus=other")).toEqual({
      focusToken: false,
      paneId: "pane-settings",
    });
  });

  it("rejects unknown panes and keeps the legacy debug hash", () => {
    expect(parsePaneHash("#pane-unknown").paneId).toBeNull();
    expect(parsePaneHash("#toString").paneId).toBeNull();
    expect(parsePaneHash("#pane-debug").paneId).toBe("pane-settings");
    expect(coercePaneId("pane-debug")).toBe("pane-settings");
  });
});

describe("pane resolution per surface", () => {
  it("keeps a pane that belongs to the surface", () => {
    expect(resolvePaneIdForSurface("pane-table", "popup")).toBe("pane-table");
    expect(resolvePaneIdForSurface("pane-history", "options")).toBe(
      "pane-history"
    );
  });

  it("falls back to the surface default for a pane of the other surface", () => {
    expect(resolvePaneIdForSurface("pane-settings", "popup")).toBe(
      "pane-actions"
    );
    expect(resolvePaneIdForSurface("pane-actions", "options")).toBe(
      "pane-settings"
    );
  });

  it("falls back to the surface default for an unresolved hash", () => {
    expect(resolvePaneIdForSurface(null, "options")).toBe("pane-settings");
    expect(resolvePaneIdForSurface(null, "popup")).toBe("pane-actions");
  });
});
