const PANE_IDS = [
  "pane-actions",
  "pane-calendar",
  "pane-table",
  "pane-create-link",
  "pane-search-engines",
  "pane-search-groups",
  "pane-search-blocklist",
  "pane-templates",
  "pane-history",
  "pane-settings",
] as const;
export type PaneId = (typeof PANE_IDS)[number];

export type PaneSurface = "popup" | "options";

export type PaneNavigateOptions = {
  focus?: "token";
};

export type PaneNavigator = (
  paneId: PaneId,
  options?: PaneNavigateOptions
) => void;

const PANE_SURFACES: Record<PaneId, PaneSurface> = {
  "pane-actions": "popup",
  "pane-calendar": "popup",
  "pane-create-link": "popup",
  "pane-history": "options",
  "pane-search-blocklist": "popup",
  "pane-search-engines": "options",
  "pane-search-groups": "options",
  "pane-settings": "options",
  "pane-table": "popup",
  "pane-templates": "options",
};

const DEFAULT_PANE_BY_SURFACE: Record<PaneSurface, PaneId> = {
  options: "pane-settings",
  popup: "pane-actions",
};

/** Debug moved into the Settings pane; keep old hash links working. */
const LEGACY_PANE_IDS: Record<string, PaneId> = {
  "pane-debug": "pane-settings",
};

const HASH_PREFIX_REGEX = /^#/;

function resolvePaneId(value: string): PaneId | null {
  const known = PANE_IDS.find((paneId) => paneId === value);
  if (known) {
    return known;
  }
  return Object.hasOwn(LEGACY_PANE_IDS, value) ? LEGACY_PANE_IDS[value] : null;
}

/** Home surface: where a pane opens from the popup or the background. */
export function getPaneSurface(paneId: PaneId): PaneSurface {
  return PANE_SURFACES[paneId];
}

/** The options page is the full console, so it renders every pane. */
export function canSurfaceRender(
  surface: PaneSurface,
  paneId: PaneId
): boolean {
  return surface === "options" || getPaneSurface(paneId) === surface;
}

const SURFACE_PAGES: Record<PaneSurface, string> = {
  options: "options.html",
  popup: "popup.html",
};

export function getPaneSurfacePage(paneId: PaneId): string {
  return SURFACE_PAGES[getPaneSurface(paneId)];
}

export function getDefaultPane(surface: PaneSurface): PaneId {
  return DEFAULT_PANE_BY_SURFACE[surface];
}

export function coercePaneId(value: unknown): PaneId {
  if (typeof value !== "string") {
    return "pane-actions";
  }
  return resolvePaneId(value) ?? "pane-actions";
}

export type PaneHash = {
  paneId: PaneId | null;
  focusToken: boolean;
};

export function parsePaneHash(hash: string): PaneHash {
  const raw = hash.replace(HASH_PREFIX_REGEX, "");
  const separatorIndex = raw.indexOf("?");
  const paneValue = separatorIndex === -1 ? raw : raw.slice(0, separatorIndex);
  const query = separatorIndex === -1 ? "" : raw.slice(separatorIndex + 1);

  return {
    focusToken: new URLSearchParams(query).get("focus") === "token",
    paneId: resolvePaneId(paneValue),
  };
}

export function resolvePaneIdForSurface(
  paneId: PaneId | null,
  surface: PaneSurface
): PaneId {
  if (paneId && canSurfaceRender(surface, paneId)) {
    return paneId;
  }
  return getDefaultPane(surface);
}
