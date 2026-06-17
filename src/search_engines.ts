import { normalizeSearchEngineEncoding } from "@/schemas/search_engine_encoding";
import type { SearchEngine, SearchEngineEncoding } from "@/search_engine_types";
import { encodeShiftJisQuery } from "@/utils/encoding";
import { isRecord } from "@/utils/guards";
import { normalizeOptionalText } from "@/utils/text";

export const BUILTIN_SEARCH_ENGINE_ID_PREFIX = "builtin:";

export const BUILTIN_SEARCH_ENGINE_IDS = {
  GOOGLE: "builtin:google",
  DUCKDUCKGO: "builtin:duckduckgo",
  X_TWITTER: "builtin:x-twitter",
  X_TWITTER_EXACT: "builtin:x-twitter-exact",
  YOUTUBE: "builtin:youtube",
  AMAZON_JP: "builtin:amazon-jp",
  RAKUTEN: "builtin:rakuten",
  YAHOO_SHOPPING: "builtin:yahoo-shopping",
  YODOBASHI: "builtin:yodobashi",
  BICCAMERA: "builtin:biccamera",
  SOUNDHOUSE: "builtin:soundhouse",
  MERCARI: "builtin:mercari",
} as const;

export const SOUNDHOUSE_SEARCH_ENGINE: SearchEngine = {
  id: BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE,
  name: "サウンドハウス",
  urlTemplate:
    "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all={query}",
  enabled: true,
};

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.GOOGLE,
    name: "Google",
    urlTemplate: "https://www.google.com/search?q={query}",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.DUCKDUCKGO,
    name: "DuckDuckGo",
    urlTemplate: "https://duckduckgo.com/?q={query}",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.X_TWITTER,
    name: "X（日本語）",
    urlTemplate:
      "https://x.com/search?q={query}%20lang%3Aja&f=live&src=typed_query",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.X_TWITTER_EXACT,
    name: "X（完全一致・日本語）",
    urlTemplate:
      "https://x.com/search?q=%2522{query}%2522%20lang%3Aja&f=live&src=typed_query",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.YOUTUBE,
    name: "YouTube",
    urlTemplate: "https://www.youtube.com/results?search_query={query}",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.AMAZON_JP,
    name: "Amazon",
    urlTemplate: "https://www.amazon.co.jp/s?k={query}",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.RAKUTEN,
    name: "楽天",
    urlTemplate:
      "https://search.rakuten.co.jp/search/mall/{query}/?filter=fs-fsl",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.YAHOO_SHOPPING,
    name: "Yahoo!ショッピング",
    urlTemplate: "https://shopping.yahoo.co.jp/search?p={query}",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.YODOBASHI,
    name: "ヨドバシ",
    urlTemplate: "https://www.yodobashi.com/?word={query}",
    enabled: true,
  },
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.BICCAMERA,
    name: "ビックカメラ",
    urlTemplate: "https://www.biccamera.com/bc/category/?q={query}&sg=",
    enabled: true,
    encoding: "shift_jis",
  },
  SOUNDHOUSE_SEARCH_ENGINE,
  {
    id: BUILTIN_SEARCH_ENGINE_IDS.MERCARI,
    name: "メルカリ",
    urlTemplate: "https://jp.mercari.com/search?keyword={query}",
    enabled: true,
  },
];

export const MAX_SEARCH_ENGINES = 20;

export type SearchUrlTemplateValues = {
  query: string;
  title?: string | undefined;
  url?: string | undefined;
};

/**
 * Validates URL template contains {query} placeholder
 */
export function isValidUrlTemplate(urlTemplate: string): boolean {
  return urlTemplate.includes("{query}");
}

/**
 * Replaces {query} placeholder with encoded search text
 */
export function buildSearchUrl(
  urlTemplate: string,
  queryOrValues: string | SearchUrlTemplateValues,
  encoding?: SearchEngineEncoding
): string {
  const values =
    typeof queryOrValues === "string"
      ? { query: queryOrValues }
      : queryOrValues;
  const encoded =
    encoding === "shift_jis"
      ? encodeShiftJisQuery(values.query)
      : encodeURIComponent(values.query);
  return urlTemplate
    .replaceAll("{query}", encoded)
    .replaceAll("{title}", encodeURIComponent(values.title ?? ""))
    .replaceAll("{url}", encodeURIComponent(values.url ?? ""));
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
  encoding?: SearchEngineEncoding;
};

function buildSearchEngine(parts: SearchEngineParts): SearchEngine | null {
  if (!(parts.id && parts.name && parts.urlTemplate)) {
    return null;
  }
  const engine: SearchEngine = {
    id: parts.id,
    name: parts.name,
    urlTemplate: parts.urlTemplate,
    enabled: parts.enabled,
  };
  if (parts.encoding) {
    engine.encoding = parts.encoding;
  }
  return engine;
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
    encoding: normalizeSearchEngineEncoding(raw.encoding),
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
