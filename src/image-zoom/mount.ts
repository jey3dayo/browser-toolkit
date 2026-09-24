import { ensureShadowTokenStyles } from "@/ui/styles-tokens";
import { applyTheme, type Theme } from "@/ui/theme";

export type ViewerShadowMount = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
};

type ViewerShadowMountParams = {
  hostId: string;
  theme: Theme;
  extraCssId: string;
  extraCss: string;
};

export function ensureViewerShadowMount(
  params: ViewerShadowMountParams
): ViewerShadowMount {
  const existing = document.getElementById(params.hostId);
  const host =
    existing instanceof window.HTMLDivElement
      ? existing
      : document.createElement("div");
  host.id = params.hostId;

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  if (!host.isConnected) {
    (document.documentElement ?? document.body ?? document).appendChild(host);
  }
  ensureShadowTokenStyles(shadow, params.extraCssId, params.extraCss);
  applyTheme(params.theme, shadow);

  return { host, shadow };
}
