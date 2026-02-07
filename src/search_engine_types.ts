export const SEARCH_ENGINE_ENCODINGS = ["utf-8", "shift_jis"] as const;
export type SearchEngineEncoding = (typeof SEARCH_ENGINE_ENCODINGS)[number];

const SEARCH_ENGINE_ENCODING_SET = new Set(SEARCH_ENGINE_ENCODINGS);
const SEARCH_ENGINE_ENCODING_ALIASES: Record<string, SearchEngineEncoding> = {
  "utf-8": "utf-8",
  utf8: "utf-8",
  utf_8: "utf-8",
  sjis: "shift_jis",
  "shift-jis": "shift_jis",
  shiftjis: "shift_jis",
  shift_jis: "shift_jis",
};

export const ENCODING_LABELS: Record<SearchEngineEncoding, string> = {
  "utf-8": "UTF-8",
  shift_jis: "Shift_JIS",
};

export function isSearchEngineEncoding(
  value: unknown
): value is SearchEngineEncoding {
  return (
    typeof value === "string" &&
    SEARCH_ENGINE_ENCODING_SET.has(value as SearchEngineEncoding)
  );
}

export function normalizeSearchEngineEncoding(
  value: unknown
): SearchEngineEncoding | undefined {
  if (isSearchEngineEncoding(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return SEARCH_ENGINE_ENCODING_ALIASES[normalized];
}

export type SearchEngine = {
  id: string;
  name: string;
  urlTemplate: string;
  enabled: boolean;
  encoding?: SearchEngineEncoding;
};
