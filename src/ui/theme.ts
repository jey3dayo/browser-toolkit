export type Theme = "auto" | "dark" | "light";

export function isTheme(value: unknown): value is Theme {
  return value === "auto" || value === "dark" || value === "light";
}

function isStyleableElement(value: Element): value is HTMLElement {
  return value.nodeType === 1 && "style" in value;
}

export function applyTheme(theme: Theme, target: Document | ShadowRoot): void {
  const root =
    "documentElement" in target ? target.documentElement : target.host;
  if (!isStyleableElement(root)) {
    return;
  }
  if (theme === "auto") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}
