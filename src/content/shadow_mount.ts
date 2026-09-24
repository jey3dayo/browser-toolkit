import { ensureShadowHost } from "@/ui/shadow-host";
import { ensureShadowUiBaseStyles } from "@/ui/styles";
import { applyTheme, type Theme } from "@/ui/theme";

export type ShadowMount = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  rootEl: HTMLDivElement;
};

type ShadowMountParams = {
  hostId: string;
  rootId: string;
  theme: Theme;
};

export function ensureShadowMount(params: ShadowMountParams): ShadowMount {
  const { host, shadow } = ensureShadowHost(params.hostId);
  ensureShadowUiBaseStyles(shadow);
  applyTheme(params.theme, shadow);

  const existingRoot = shadow.getElementById(params.rootId);
  const rootEl =
    existingRoot instanceof window.HTMLDivElement
      ? existingRoot
      : document.createElement("div");
  if (rootEl !== existingRoot) {
    rootEl.id = params.rootId;
    shadow.appendChild(rootEl);
  }

  return { host, rootEl, shadow };
}
