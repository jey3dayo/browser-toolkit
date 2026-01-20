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
  const existing = document.getElementById(
    params.hostId
  ) as HTMLDivElement | null;
  const host = existing || document.createElement("div");
  host.id = params.hostId;

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  if (!host.isConnected) {
    (document.documentElement ?? document.body ?? document).appendChild(host);
  }
  ensureShadowUiBaseStyles(shadow);
  applyTheme(params.theme, shadow);

  let rootEl = shadow.getElementById(params.rootId) as HTMLDivElement | null;
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = params.rootId;
    shadow.appendChild(rootEl);
  }

  return { host, shadow, rootEl };
}
