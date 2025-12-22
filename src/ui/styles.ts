const TOKEN_PRIMITIVES_ID = "mbu-ui-token-primitives";
const TOKEN_SEMANTIC_ID = "mbu-ui-token-semantic";
const STYLE_ID = "mbu-ui-base-styles";

const TOKEN_PRIMITIVES_PATH = "tokens/primitives.css";
const TOKEN_SEMANTIC_PATH = "tokens/semantic.css";
const TOKEN_COMPONENTS_PATH = "tokens/components.css";
const POPUP_BASE_ID = "mbu-style-base";
const POPUP_LAYOUT_ID = "mbu-style-layout";
const POPUP_UTILITIES_ID = "mbu-style-utilities";

const POPUP_BASE_PATH = "base.css";
const POPUP_LAYOUT_PATH = "layout.css";
const POPUP_UTILITIES_PATH = "utilities.css";
const POPUP_STYLE_ROOT_DEV = "src/styles";
const POPUP_STYLE_ROOT_DIST = "dist/styles";

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

function getPopupStyleRoot(doc: Document): string {
  try {
    if (doc.location?.protocol === "chrome-extension:") {
      return POPUP_STYLE_ROOT_DIST;
    }
  } catch {
    // ignore non-browser contexts
  }
  return POPUP_STYLE_ROOT_DEV;
}

function resolvePopupStylePath(doc: Document, relativePath: string): string {
  return `${getPopupStyleRoot(doc)}/${relativePath}`;
}

function getShadowStyleRoot(): string {
  try {
    const runtime = (
      chrome as unknown as { runtime?: { getURL?: (input: string) => string } }
    ).runtime;
    if (runtime?.getURL) {
      return POPUP_STYLE_ROOT_DIST;
    }
  } catch {
    // non-extension contexts (tests/storybook)
  }
  return POPUP_STYLE_ROOT_DEV;
}

function resolveShadowStylePath(relativePath: string): string {
  return `${getShadowStyleRoot()}/${relativePath}`;
}

function ensureDocumentStylesheet(
  doc: Document,
  id: string,
  path: string
): void {
  const href = resolveStyleHref(path);
  const existing = doc.getElementById(id);
  if (existing) {
    if (
      existing instanceof HTMLLinkElement &&
      existing.getAttribute("href") !== href
    ) {
      existing.setAttribute("href", href);
    }
    return;
  }
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  (doc.head ?? doc.documentElement).appendChild(link);
}

function ensureShadowStylesheet(
  shadowRoot: ShadowRoot,
  id: string,
  path: string
): void {
  const href = resolveStyleHref(path);
  const existing = shadowRoot.querySelector(`#${id}`);
  if (existing) {
    if (
      existing instanceof HTMLLinkElement &&
      existing.getAttribute("href") !== href
    ) {
      existing.setAttribute("href", href);
    }
    return;
  }
  const link = shadowRoot.ownerDocument.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  shadowRoot.appendChild(link);
}

export function ensurePopupUiBaseStyles(doc: Document): void {
  ensureDocumentStylesheet(
    doc,
    TOKEN_PRIMITIVES_ID,
    resolvePopupStylePath(doc, TOKEN_PRIMITIVES_PATH)
  );
  ensureDocumentStylesheet(
    doc,
    TOKEN_SEMANTIC_ID,
    resolvePopupStylePath(doc, TOKEN_SEMANTIC_PATH)
  );
  ensureDocumentStylesheet(
    doc,
    POPUP_BASE_ID,
    resolvePopupStylePath(doc, POPUP_BASE_PATH)
  );
  ensureDocumentStylesheet(
    doc,
    POPUP_LAYOUT_ID,
    resolvePopupStylePath(doc, POPUP_LAYOUT_PATH)
  );
  ensureDocumentStylesheet(
    doc,
    POPUP_UTILITIES_ID,
    resolvePopupStylePath(doc, POPUP_UTILITIES_PATH)
  );
  ensureDocumentStylesheet(
    doc,
    STYLE_ID,
    resolvePopupStylePath(doc, TOKEN_COMPONENTS_PATH)
  );
}

export function ensureShadowUiBaseStyles(shadowRoot: ShadowRoot): void {
  ensureShadowStylesheet(
    shadowRoot,
    TOKEN_PRIMITIVES_ID,
    resolveShadowStylePath(TOKEN_PRIMITIVES_PATH)
  );
  ensureShadowStylesheet(
    shadowRoot,
    TOKEN_SEMANTIC_ID,
    resolveShadowStylePath(TOKEN_SEMANTIC_PATH)
  );
  ensureShadowStylesheet(
    shadowRoot,
    STYLE_ID,
    resolveShadowStylePath(TOKEN_COMPONENTS_PATH)
  );
}
