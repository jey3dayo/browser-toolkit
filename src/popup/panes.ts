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
  return LEGACY_PANE_IDS[value] ?? null;
}

export function coercePaneId(value: unknown): PaneId {
  if (typeof value !== "string") {
    return "pane-actions";
  }
  return resolvePaneId(value) ?? "pane-actions";
}

export function getPaneIdFromHash(hash: string): PaneId | null {
  return resolvePaneId(hash.replace(HASH_PREFIX_REGEX, ""));
}
