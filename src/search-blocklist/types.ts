import type { Result } from "@praha/byethrow";

export const BLOCKLIST_SCAN_ATTR = "data-mbu-sbl-scan";
export const BLOCKLIST_BLOCKED_ATTR = "data-mbu-blocked";
export const BLOCKLIST_REVEALED_ATTR = "data-mbu-blocked-revealed";

export type SearchBlocklistRule = {
  id: string;
  pattern: string;
  createdAt: number;
};

export type SearchResultEntry = {
  container: HTMLElement;
  url: string;
  title: string;
};

export type BlocklistEntry = {
  container: HTMLElement;
  url: string;
  title: string;
  blocked: boolean;
  matchedRuleIds: string[];
};

export type BlocklistSnapshot = {
  ruleRevision: number;
  engineId: string;
  entries: readonly BlocklistEntry[];
  blockedCount: number;
};

export type BlocklistState = {
  ready: Promise<void>;
  getSnapshot: () => BlocklistSnapshot;
  subscribe: (listener: () => void) => () => void;
  addRule: (pattern: string) => Promise<Result.Result<void, string>>;
  removeRules: (ruleIds: string[]) => Promise<Result.Result<void, string>>;
  setRevealed: (revealed: boolean) => void;
};
