import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureViewerShadowMount } from "@/image-zoom/mount";

const HOST_ID = "browser-toolkit-image-zoom-mount-test";
const EXTRA_CSS_ID = "mbu-image-zoom-token-extra-test";

// Read the real files from disk instead of via `?raw` imports: Vitest's CSS
// handling resolves `.css?raw` imports to an empty string in this project's
// test environment, which would make every marker check below vacuous.
function readStyleFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const EXTRA_CSS = [
  readStyleFile("src/styles/tokens/components/tokens.css"),
  readStyleFile("src/styles/tokens/components/button.css"),
].join("\n");
const TOKEN_MARKER = "--button-radius";
const BUTTON_MARKER = ".btn-primary";

function removeHost(): void {
  document.getElementById(HOST_ID)?.remove();
}

function collectAdoptedSheetCssText(shadow: ShadowRoot): string {
  return shadow.adoptedStyleSheets
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .map((rule) => rule.cssText)
    .join("\n");
}

function collectStyleTagCssText(shadow: ShadowRoot): string {
  return Array.from(shadow.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");
}

describe("image-zoom viewer shadow mount styles", () => {
  afterEach(() => {
    removeHost();
  });

  it("fallback <style> path installs both the token and button CSS", () => {
    const { shadow } = ensureViewerShadowMount({
      extraCss: EXTRA_CSS,
      extraCssId: EXTRA_CSS_ID,
      hostId: HOST_ID,
      theme: "auto",
    });

    expect("adoptedStyleSheets" in shadow).toBe(false);

    const cssText = collectStyleTagCssText(shadow);
    expect(cssText).toContain(TOKEN_MARKER);
    expect(cssText).toContain(BUTTON_MARKER);
  });

  it("constructed-stylesheet path installs both the token and button CSS", () => {
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    Object.defineProperty(shadow, "adoptedStyleSheets", {
      configurable: true,
      value: [],
      writable: true,
    });

    ensureViewerShadowMount({
      extraCss: EXTRA_CSS,
      extraCssId: EXTRA_CSS_ID,
      hostId: HOST_ID,
      theme: "auto",
    });

    expect(shadow.adoptedStyleSheets.length).toBeGreaterThan(0);

    const cssText = collectAdoptedSheetCssText(shadow);
    expect(cssText).toContain(TOKEN_MARKER);
    expect(cssText).toContain(BUTTON_MARKER);
  });
});
