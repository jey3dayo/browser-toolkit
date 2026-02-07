import Encoding from "encoding-japanese";
import { isRecord } from "@/utils/guards";
import { normalizeOptionalText } from "@/utils/text";

export const SEARCH_ENGINE_ENCODINGS = ["utf-8", "shift_jis"] as const;
export type SearchEngineEncoding = (typeof SEARCH_ENGINE_ENCODINGS)[number];

export const ENCODING_LABELS: Record<SearchEngineEncoding, string> = {
  "utf-8": "UTF-8",
  shift_jis: "Shift_JIS",
};

export type SearchEngine = {
  id: string;
  name: string;
  urlTemplate: string;
  enabled: boolean;
  encoding?: SearchEngineEncoding;
};

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  {
    id: "builtin:google",
    name: "Google",
    urlTemplate: "https://www.google.com/search?q={query}",
    enabled: true,
  },
  {
    id: "builtin:x-twitter",
    name: "X（日本語）",
    urlTemplate:
      "https://x.com/search?q={query}%20lang%3Aja&f=live&src=typed_query",
    enabled: true,
  },
  {
    id: "builtin:youtube",
    name: "YouTube",
    urlTemplate: "https://www.youtube.com/results?search_query={query}",
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
  {
    id: "builtin:yodobashi",
    name: "ヨドバシ",
    urlTemplate: "https://www.yodobashi.com/?word={query}",
    enabled: true,
  },
  {
    id: "builtin:biccamera",
    name: "ビックカメラ",
    urlTemplate: "https://www.biccamera.com/bc/category/?q={query}&sg=",
    enabled: true,
    encoding: "shift_jis",
  },
  {
    id: "builtin:mercari",
    name: "メルカリ",
    urlTemplate: "https://jp.mercari.com/search?keyword={query}",
    enabled: true,
    encoding: "utf-8",
  },
];

export const MAX_SEARCH_ENGINES = 10;

/**
 * Validates URL template contains {query} placeholder
 */
export function isValidUrlTemplate(urlTemplate: string): boolean {
  return urlTemplate.includes("{query}");
}

function encodeShiftJis(query: string): string {
  const sjisBytes = Encoding.convert(Encoding.stringToCode(query), {
    to: "SJIS",
    from: "UNICODE",
  });
  return sjisBytes
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`)
    .join("");
}

/**
 * Replaces {query} placeholder with encoded search text
 */
export function buildSearchUrl(
  urlTemplate: string,
  query: string,
  encoding?: SearchEngineEncoding
): string {
  const encoded =
    encoding === "shift_jis"
      ? encodeShiftJis(query)
      : encodeURIComponent(query);
  return urlTemplate.replace("{query}", encoded);
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

function isSearchEngineEncoding(value: unknown): value is SearchEngineEncoding {
  return SEARCH_ENGINE_ENCODINGS.includes(value as SearchEngineEncoding);
}

function coerceEncoding(value: unknown): SearchEngineEncoding | undefined {
  return isSearchEngineEncoding(value) ? value : undefined;
}

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
    encoding: coerceEncoding(raw.encoding),
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
