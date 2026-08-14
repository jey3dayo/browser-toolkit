export const SEARCH_ENGINE_ENCODINGS = ["utf-8", "shift_jis"] as const;
export type SearchEngineEncoding = (typeof SEARCH_ENGINE_ENCODINGS)[number];

export const ENCODING_LABELS: Record<SearchEngineEncoding, string> = {
  shift_jis: "Shift_JIS",
  "utf-8": "UTF-8",
};

export type SearchEngine = {
  id: string;
  name: string;
  urlTemplate: string;
  enabled: boolean;
  encoding?: SearchEngineEncoding;
};
