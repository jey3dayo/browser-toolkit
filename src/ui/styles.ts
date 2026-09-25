import componentAccordionCss from "@/styles/tokens/components/accordion.css?raw";
import componentBaseCss from "@/styles/tokens/components/base-ui.css?raw";
import componentButtonCss from "@/styles/tokens/components/button.css?raw";
import componentOverlayChatCss from "@/styles/tokens/components/overlay-chat.css?raw";
import componentOverlayContentCss from "@/styles/tokens/components/overlay-content.css?raw";
import componentOverlayShellCss from "@/styles/tokens/components/overlay-shell.css?raw";
import componentPopupCss from "@/styles/tokens/components/popup.css?raw";
import componentPopupControlsCss from "@/styles/tokens/components/popup-controls.css?raw";
import componentPopupLayoutCss from "@/styles/tokens/components/popup-layout.css?raw";
import componentPopupMiscCss from "@/styles/tokens/components/popup-misc.css?raw";
import componentToastCss from "@/styles/tokens/components/toast.css?raw";
import componentTokensCss from "@/styles/tokens/components/tokens.css?raw";
import primitivesCss from "@/styles/tokens/primitives.css?raw";
import semanticCss from "@/styles/tokens/semantic.css?raw";
import {
  ensureShadowFallbackTokens,
  ensureShadowStyleText,
  primitiveSemanticSheets,
  shadowHasTokens,
  TOKEN_PRIMITIVES_ID,
  TOKEN_SEMANTIC_ID,
} from "@/ui/styles-tokens";

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

const POPUP_STYLE_LINKS = [
  { id: TOKEN_PRIMITIVES_ID, path: TOKEN_PRIMITIVES_PATH },
  { id: TOKEN_SEMANTIC_ID, path: TOKEN_SEMANTIC_PATH },
  { id: POPUP_BASE_ID, path: POPUP_BASE_PATH },
  { id: POPUP_LAYOUT_ID, path: POPUP_LAYOUT_PATH },
  { id: POPUP_UTILITIES_ID, path: POPUP_UTILITIES_PATH },
  { id: STYLE_ID, path: TOKEN_COMPONENTS_PATH },
] as const;

const componentsCss = [
  componentTokensCss,
  componentBaseCss,
  componentToastCss,
  componentOverlayShellCss,
  componentOverlayChatCss,
  componentOverlayContentCss,
  componentPopupCss,
  componentAccordionCss,
  componentPopupLayoutCss,
  componentButtonCss,
  componentPopupControlsCss,
  componentPopupMiscCss,
].join("\n");

function resolveStyleHref(path: string): string {
  try {
    const { runtime } = chrome as unknown as {
      runtime?: { getURL?: (input: string) => string };
    };
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

type ConstructableSheets = {
  primitives: CSSStyleSheet;
  semantic: CSSStyleSheet;
  components: CSSStyleSheet;
};

function createConstructableSheets(): ConstructableSheets | null {
  if (!primitiveSemanticSheets) {
    return null;
  }
  try {
    const components = new CSSStyleSheet();
    components.replaceSync(componentsCss);
    return { components, ...primitiveSemanticSheets };
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

export function ensurePopupUiBaseStyles(doc: Document): void {
  for (const entry of POPUP_STYLE_LINKS) {
    ensureDocumentStylesheet(
      doc,
      entry.id,
      resolvePopupStylePath(doc, entry.path)
    );
  }
}

export function ensureShadowUiBaseStyles(shadowRoot: ShadowRoot): void {
  if (
    shadowConstructedSheets &&
    "adoptedStyleSheets" in shadowRoot &&
    Array.isArray(shadowRoot.adoptedStyleSheets)
  ) {
    const existing = shadowRoot.adoptedStyleSheets;
    const existingSheets = new Set(existing);
    const next = [...existing];
    let changed = false;
    for (const sheet of [
      shadowConstructedSheets.primitives,
      shadowConstructedSheets.semantic,
      shadowConstructedSheets.components,
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
  ensureShadowStyleText(shadowRoot, STYLE_ID, componentsCss);

  ensureShadowFallbackTokens(shadowRoot);
}
