import { ensureShadowHost, type ShadowHost } from "@/ui/shadow-host";
import { ensureShadowTokenStyles } from "@/ui/styles-tokens";
import { applyTheme, type Theme } from "@/ui/theme";

export type ViewerShadowMount = ShadowHost;

type ViewerShadowMountParams = {
  hostId: string;
  theme: Theme;
  extraCssId: string;
  extraCss: string;
};

export function ensureViewerShadowMount(
  params: ViewerShadowMountParams
): ViewerShadowMount {
  const { host, shadow } = ensureShadowHost(params.hostId);
  ensureShadowTokenStyles(shadow, params.extraCssId, params.extraCss);
  applyTheme(params.theme, shadow);

  return { host, shadow };
}
