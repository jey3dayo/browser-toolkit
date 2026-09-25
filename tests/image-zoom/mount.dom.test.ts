import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureViewerShadowMount } from "@/image-zoom/mount";
import { TOKEN_PRIMITIVES_ID, TOKEN_SEMANTIC_ID } from "@/ui/styles-tokens";

const HOST_ID = "browser-toolkit-image-zoom-mount-test";
const EXTRA_CSS_ID = "mbu-image-zoom-token-extra-test";

// `?raw` CSS imports resolve empty under Vitest, so read the real files to
// keep the marker checks below meaningful.
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

  it("fallback <style> path installs primitives, semantic, and the extra (token+button) CSS", () => {
    const { shadow } = ensureViewerShadowMount({
      extraCss: EXTRA_CSS,
      extraCssId: EXTRA_CSS_ID,
      hostId: HOST_ID,
      theme: "auto",
    });

    expect("adoptedStyleSheets" in shadow).toBe(false);

    expect(shadow.querySelector(`#${TOKEN_PRIMITIVES_ID}`)).not.toBeNull();
    expect(shadow.querySelector(`#${TOKEN_SEMANTIC_ID}`)).not.toBeNull();
    expect(shadow.querySelector(`#${EXTRA_CSS_ID}`)).not.toBeNull();

    const cssText = collectStyleTagCssText(shadow);
    expect(cssText).toContain(TOKEN_MARKER);
    expect(cssText).toContain(BUTTON_MARKER);
  });

  it("constructed-stylesheet path adopts exactly 3 sheets (primitives, semantic, extra) with the token and button CSS", () => {
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

    expect(shadow.adoptedStyleSheets.length).toBe(3);

    const cssText = collectAdoptedSheetCssText(shadow);
    expect(cssText).toContain(TOKEN_MARKER);
    expect(cssText).toContain(BUTTON_MARKER);
  });
});
