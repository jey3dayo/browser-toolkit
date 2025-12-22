import componentsCss from "@/styles/tokens/components.css?raw";
import primitivesCss from "@/styles/tokens/primitives.css?raw";
import semanticCss from "@/styles/tokens/semantic.css?raw";

const TOKEN_PRIMITIVES_ID = "mbu-ui-token-primitives";
const TOKEN_SEMANTIC_ID = "mbu-ui-token-semantic";
const STYLE_ID = "mbu-ui-base-styles";

const TOKEN_PRIMITIVES_PATH = "src/styles/tokens/primitives.css";
const TOKEN_SEMANTIC_PATH = "src/styles/tokens/semantic.css";
const TOKEN_COMPONENTS_PATH = "src/styles/tokens/components.css";
const POPUP_BASE_ID = "mbu-style-base";
const POPUP_LAYOUT_ID = "mbu-style-layout";
const POPUP_UTILITIES_ID = "mbu-style-utilities";

const POPUP_BASE_PATH = "src/styles/base.css";
const POPUP_LAYOUT_PATH = "src/styles/layout.css";
const POPUP_UTILITIES_PATH = "src/styles/utilities.css";

function resolveStyleHref(path: string): string {
  try {
    const runtime = (
      chrome as unknown as { runtime?: { getURL?: (input: string) => string } }
    ).runtime;
    if (runtime?.getURL) {
      return runtime.getURL(path);
    }
  } catch {
    // non-extension contexts (tests/storybook)
  }
  return path;
}

type ConstructableSheets = {
  primitives: CSSStyleSheet;
  semantic: CSSStyleSheet;
  components: CSSStyleSheet;
};

function createConstructableSheets(): ConstructableSheets | null {
  if (typeof CSSStyleSheet === "undefined") {
    return null;
  }
  if (!("replaceSync" in CSSStyleSheet.prototype)) {
    return null;
  }
  try {
    const primitives = new CSSStyleSheet();
    primitives.replaceSync(primitivesCss);
    const semantic = new CSSStyleSheet();
    semantic.replaceSync(semanticCss);
    const components = new CSSStyleSheet();
    components.replaceSync(componentsCss);
    return { primitives, semantic, components };
  } catch {
    return null;
  }
}

const shadowConstructedSheets = createConstructableSheets();

function ensureDocumentStylesheet(
  doc: Document,
  id: string,
  path: string
): void {
  if (doc.getElementById(id)) {
    return;
  }
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = resolveStyleHref(path);
  (doc.head ?? doc.documentElement).appendChild(link);
}

function ensureShadowStyleText(
  shadowRoot: ShadowRoot,
  id: string,
  cssText: string
): void {
  if (shadowRoot.querySelector(`#${id}`)) {
    return;
  }
  const style = shadowRoot.ownerDocument.createElement("style");
  style.id = id;
  style.textContent = cssText;
  shadowRoot.appendChild(style);
}

export function ensurePopupUiBaseStyles(doc: Document): void {
  ensureDocumentStylesheet(doc, TOKEN_PRIMITIVES_ID, TOKEN_PRIMITIVES_PATH);
  ensureDocumentStylesheet(doc, TOKEN_SEMANTIC_ID, TOKEN_SEMANTIC_PATH);
  ensureDocumentStylesheet(doc, POPUP_BASE_ID, POPUP_BASE_PATH);
  ensureDocumentStylesheet(doc, POPUP_LAYOUT_ID, POPUP_LAYOUT_PATH);
  ensureDocumentStylesheet(doc, POPUP_UTILITIES_ID, POPUP_UTILITIES_PATH);
  ensureDocumentStylesheet(doc, STYLE_ID, TOKEN_COMPONENTS_PATH);
}

export function ensureShadowUiBaseStyles(shadowRoot: ShadowRoot): void {
  if (
    shadowConstructedSheets &&
    "adoptedStyleSheets" in shadowRoot &&
    Array.isArray(shadowRoot.adoptedStyleSheets)
  ) {
    const existing = shadowRoot.adoptedStyleSheets;
    const next = [...existing];
    let changed = false;
    for (const sheet of [
      shadowConstructedSheets.primitives,
      shadowConstructedSheets.semantic,
      shadowConstructedSheets.components,
    ]) {
      if (!existing.includes(sheet)) {
        next.push(sheet);
        changed = true;
      }
    }
    if (changed) {
      shadowRoot.adoptedStyleSheets = next;
    }
    return;
  }

  ensureShadowStyleText(shadowRoot, TOKEN_PRIMITIVES_ID, primitivesCss);
  ensureShadowStyleText(shadowRoot, TOKEN_SEMANTIC_ID, semanticCss);
  ensureShadowStyleText(shadowRoot, STYLE_ID, componentsCss);
}
