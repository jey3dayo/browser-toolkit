export type ShadowHost = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
};

export function ensureShadowHost(hostId: string): ShadowHost {
  const existing = document.getElementById(hostId);
  const host =
    existing instanceof window.HTMLDivElement
      ? existing
      : document.createElement("div");
  host.id = hostId;

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  if (!host.isConnected) {
    (document.documentElement ?? document.body ?? document).appendChild(host);
  }

  return { host, shadow };
}
