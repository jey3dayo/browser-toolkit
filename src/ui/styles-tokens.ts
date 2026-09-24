import primitivesCss from "@/styles/tokens/primitives.css?raw";
import semanticCss from "@/styles/tokens/semantic.css?raw";

export const TOKEN_PRIMITIVES_ID = "mbu-ui-token-primitives";
export const TOKEN_SEMANTIC_ID = "mbu-ui-token-semantic";
const TOKEN_EXTRA_ID = "mbu-ui-token-extra";

type PrimitiveSemanticSheets = {
  primitives: CSSStyleSheet;
  semantic: CSSStyleSheet;
};

function createConstructableStyleSheet(css: string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === "undefined") {
    return null;
  }
  if (!("replaceSync" in CSSStyleSheet.prototype)) {
    return null;
  }
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
  } catch {
    return null;
  }
}

function createPrimitiveSemanticSheets(): PrimitiveSemanticSheets | null {
  const primitives = createConstructableStyleSheet(primitivesCss);
  const semantic = createConstructableStyleSheet(semanticCss);
  if (!(primitives && semantic)) {
    return null;
  }
  return { primitives, semantic };
}

export const primitiveSemanticSheets = createPrimitiveSemanticSheets();

const tokenExtraSheetCache = new Map<string, CSSStyleSheet>();

function getTokenExtraSheet(css: string): CSSStyleSheet | null {
  const cached = tokenExtraSheetCache.get(css);
  if (cached) {
    return cached;
  }
  const sheet = createConstructableStyleSheet(css);
  if (sheet) {
    tokenExtraSheetCache.set(css, sheet);
  }
  return sheet;
}

export function ensureShadowStyleText(
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

const FALLBACK_MBU_TOKENS: Record<string, string> = {
  "--mbu-accent": "var(--color-primary, #7c8cff)",
  "--mbu-bg": "var(--color-bg, #0c0d10)",
  "--mbu-border": "var(--color-border-ui, rgba(255, 255, 255, 0.12))",
  "--mbu-danger": "var(--color-danger, #f07178)",
  "--mbu-focus-ring": "var(--focus-ring, 2px solid rgba(124, 140, 255, 0.55))",
  "--mbu-focus-ring-offset": "var(--focus-ring-offset, 2px)",
  "--mbu-radius": "var(--radius-lg, 14px)",
  "--mbu-shadow": "var(--shadow-elevation, 0 12px 40px rgba(0, 0, 0, 0.35))",
  "--mbu-surface": "var(--color-surface, #15171c)",
  "--mbu-surface-2": "var(--color-surface-2, #1c1f26)",
  "--mbu-text": "var(--color-text, #ececef)",
  "--mbu-text-muted": "var(--color-text-muted, #9aa0ac)",
  "--mbu-toast-screen-inset": "var(--toast-screen-inset, 12px 12px auto auto)",
  "--mbu-toast-surface-inset":
    "var(--toast-surface-inset, 12px 12px auto auto)",
};

export function ensureShadowFallbackTokens(shadowRoot: ShadowRoot): void {
  const { host } = shadowRoot;
  if (!(host instanceof HTMLElement)) {
    return;
  }
  const computed =
    shadowRoot.ownerDocument.defaultView?.getComputedStyle?.(host) ?? null;
  if (!computed) {
    return;
  }
  const surface = computed.getPropertyValue("--mbu-surface").trim();
  if (surface) {
    return;
  }
  for (const [name, value] of Object.entries(FALLBACK_MBU_TOKENS)) {
    if (!host.style.getPropertyValue(name)) {
      host.style.setProperty(name, value);
    }
  }
}

export function shadowHasTokens(shadowRoot: ShadowRoot): boolean {
  if (typeof getComputedStyle !== "function") {
    return true;
  }
  const { host } = shadowRoot;
  if (!(host instanceof HTMLElement)) {
    return true;
  }
  if (!host.isConnected) {
    return true;
  }
  const value = getComputedStyle(host).getPropertyValue("--mbu-surface").trim();
  return value.length > 0;
}

export function ensureShadowTokenStyles(
  shadowRoot: ShadowRoot,
  extraCss: string
): void {
  const extraSheet = getTokenExtraSheet(extraCss);
  if (
    primitiveSemanticSheets &&
    extraSheet &&
    "adoptedStyleSheets" in shadowRoot &&
    Array.isArray(shadowRoot.adoptedStyleSheets)
  ) {
    const existing = shadowRoot.adoptedStyleSheets;
    const existingSheets = new Set(existing);
    const next = [...existing];
    let changed = false;
    for (const sheet of [
      primitiveSemanticSheets.primitives,
      primitiveSemanticSheets.semantic,
      extraSheet,
    ]) {
      if (!existingSheets.has(sheet)) {
        next.push(sheet);
        changed = true;
      }
    }
    if (changed) {
      shadowRoot.adoptedStyleSheets = next;
    }
    if (shadowHasTokens(shadowRoot)) {
      return;
    }
  }

  ensureShadowStyleText(shadowRoot, TOKEN_PRIMITIVES_ID, primitivesCss);
  ensureShadowStyleText(shadowRoot, TOKEN_SEMANTIC_ID, semanticCss);
  ensureShadowStyleText(shadowRoot, TOKEN_EXTRA_ID, extraCss);

  ensureShadowFallbackTokens(shadowRoot);
}
