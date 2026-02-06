import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname =
  typeof import.meta.dirname !== "undefined"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(dirname, "..");

type WebAccessibleEntry = { resources?: string[] };
type Manifest = { web_accessible_resources?: WebAccessibleEntry[] };

const SHADOW_UI_STYLESHEETS = [
  "dist/styles/tokens/primitives.css",
  "dist/styles/tokens/semantic.css",
  "dist/styles/tokens/components.css",
] as const;

const SHADOW_UI_SOURCE_STYLESHEETS = [
  "src/styles/tokens/primitives.css",
  "src/styles/tokens/semantic.css",
  "src/styles/tokens/components.css",
] as const;

const POPUP_UI_STYLESHEETS = [
  "dist/styles/base.css",
  "dist/styles/layout.css",
  "dist/styles/utilities.css",
] as const;

const POPUP_UI_SOURCE_STYLESHEETS = [
  "src/styles/base.css",
  "src/styles/layout.css",
  "src/styles/utilities.css",
] as const;

describe("UI styles wiring", () => {
  it("lists ShadowRoot styles as web_accessible_resources", () => {
    const manifestPath = path.join(projectRoot, "manifest.json");
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf8")
    ) as Manifest;

    const resources = new Set(
      (manifest.web_accessible_resources ?? []).flatMap(
        (entry) => entry.resources ?? []
      )
    );

    for (const cssPath of SHADOW_UI_STYLESHEETS) {
      expect(resources).toContain(cssPath);
    }
  });

  it("keeps stylesheet assets present on disk", () => {
    for (const cssPath of [
      ...SHADOW_UI_SOURCE_STYLESHEETS,
      ...POPUP_UI_SOURCE_STYLESHEETS,
    ]) {
      expect(fs.existsSync(path.join(projectRoot, cssPath))).toBe(true);
    }

    const distStylesRoot = path.join(projectRoot, "dist/styles");
    if (!fs.existsSync(distStylesRoot)) {
      return;
    }
    for (const cssPath of [...SHADOW_UI_STYLESHEETS, ...POPUP_UI_STYLESHEETS]) {
      expect(fs.existsSync(path.join(projectRoot, cssPath))).toBe(true);
    }
  });
});
