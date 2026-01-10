import { isRecord } from "@/utils/guards";

export type SearchEngine = {
  id: string;
  name: string;
  urlTemplate: string;
  enabled: boolean;
};

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  {
    id: "builtin:google",
    name: "Google",
    urlTemplate: "https://www.google.com/search?q={query}",
    enabled: true,
  },
  {
    id: "builtin:amazon-jp",
    name: "Amazon",
    urlTemplate: "https://www.amazon.co.jp/s?k={query}",
    enabled: true,
  },
  {
    id: "builtin:rakuten",
    name: "楽天",
    urlTemplate: "https://search.rakuten.co.jp/search/mall/{query}/",
    enabled: true,
  },
  {
    id: "builtin:yahoo-shopping",
    name: "Yahoo!ショッピング",
    urlTemplate: "https://shopping.yahoo.co.jp/search?p={query}",
    enabled: true,
  },
];

export const MAX_SEARCH_ENGINES = 10;

/**
 * Validates URL template contains {query} placeholder
 */
export function isValidUrlTemplate(urlTemplate: string): boolean {
  return urlTemplate.includes("{query}");
}

/**
 * Replaces {query} placeholder with encoded search text
 */
export function buildSearchUrl(urlTemplate: string, query: string): string {
  return urlTemplate.replace("{query}", encodeURIComponent(query));
}

/**
 * Type guard for SearchEngine
 */
function coerceSearchEngine(value: unknown): SearchEngine | null {
  if (!isRecord(value)) {
    return null;
  }
  const raw = value as Partial<SearchEngine>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const urlTemplate =
    typeof raw.urlTemplate === "string" ? raw.urlTemplate : "";
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : true;

  if (!(id && name && urlTemplate && isValidUrlTemplate(urlTemplate))) {
    return null;
  }

  return { id, name, urlTemplate, enabled };
}

/**
 * Normalizes search engines array from storage
 */
export function normalizeSearchEngines(value: unknown): SearchEngine[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const engines: SearchEngine[] = [];
  for (const item of value) {
    const engine = coerceSearchEngine(item);
    if (engine) {
      engines.push(engine);
    }
  }
  return engines.slice(0, MAX_SEARCH_ENGINES);
}
