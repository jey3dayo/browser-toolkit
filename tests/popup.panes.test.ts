import { describe, expect, it } from "vitest";
import {
  canSurfaceRender,
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

describe("surface rendering scope", () => {
  it("keeps the popup limited to the daily panes", () => {
    expect(canSurfaceRender("popup", "pane-actions")).toBe(true);
    expect(canSurfaceRender("popup", "pane-table")).toBe(true);

    expect(canSurfaceRender("popup", "pane-settings")).toBe(false);
    expect(canSurfaceRender("popup", "pane-history")).toBe(false);
    expect(canSurfaceRender("popup", "pane-templates")).toBe(false);
  });

  it("lets the options page render every pane", () => {
    expect(canSurfaceRender("options", "pane-actions")).toBe(true);
    expect(canSurfaceRender("options", "pane-calendar")).toBe(true);
    expect(canSurfaceRender("options", "pane-create-link")).toBe(true);
    expect(canSurfaceRender("options", "pane-search-blocklist")).toBe(true);
    expect(canSurfaceRender("options", "pane-table")).toBe(true);
    expect(canSurfaceRender("options", "pane-settings")).toBe(true);
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
  it("keeps a pane the surface can render", () => {
    expect(resolvePaneIdForSurface("pane-table", "popup")).toBe("pane-table");
    expect(resolvePaneIdForSurface("pane-history", "options")).toBe(
      "pane-history"
    );
    expect(resolvePaneIdForSurface("pane-actions", "options")).toBe(
      "pane-actions"
    );
  });

  it("falls back to the popup default for a manage pane", () => {
    expect(resolvePaneIdForSurface("pane-settings", "popup")).toBe(
      "pane-actions"
    );
  });

  it("falls back to the surface default for an unresolved hash", () => {
    expect(resolvePaneIdForSurface(null, "options")).toBe("pane-settings");
    expect(resolvePaneIdForSurface(null, "popup")).toBe("pane-actions");
  });
});
