import { isRecord } from "@/utils/guards";
import { normalizeOptionalText } from "@/utils/text";

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

function coerceUrlTemplate(value: unknown): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  return isValidUrlTemplate(normalized) ? normalized : null;
}

type SearchEngineParts = {
  id: string | undefined;
  name: string | undefined;
  urlTemplate: string | null;
  enabled: boolean;
};

function buildSearchEngine(parts: SearchEngineParts): SearchEngine | null {
  if (!parts.id || !parts.name || !parts.urlTemplate) {
    return null;
  }
    return null;
  }
  return {
    id: parts.id,
    name: parts.name,
    urlTemplate: parts.urlTemplate,
    enabled: parts.enabled,
  };
}

/**
 * Type guard for SearchEngine
 */
function coerceSearchEngine(value: unknown): SearchEngine | null {
  if (!isRecord(value)) {
    return null;
  }
  const raw = value as Partial<SearchEngine>;
  return buildSearchEngine({
    id: normalizeOptionalText(raw.id),
    name: normalizeOptionalText(raw.name),
    urlTemplate: coerceUrlTemplate(raw.urlTemplate),
    enabled: raw.enabled !== false,
  });
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
