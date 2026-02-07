import { picklist, pipe, safeParse, string, transform, trim } from "valibot";
import {
  SEARCH_ENGINE_ENCODINGS,
  type SearchEngineEncoding,
} from "@/search_engine_types";

const SEARCH_ENGINE_ENCODING_ALIASES: Record<string, SearchEngineEncoding> = {
  "utf-8": "utf-8",
  utf8: "utf-8",
  utf_8: "utf-8",
  sjis: "shift_jis",
  "shift-jis": "shift_jis",
  shiftjis: "shift_jis",
  shift_jis: "shift_jis",
};

const SearchEngineEncodingSchema = pipe(
  string(),
  trim(),
  transform((value) => {
    const normalized = value.toLowerCase();
    return SEARCH_ENGINE_ENCODING_ALIASES[normalized] ?? normalized;
  }),
  picklist(SEARCH_ENGINE_ENCODINGS)
);

export function safeParseSearchEngineEncoding(value: unknown) {
  return safeParse(SearchEngineEncodingSchema, value);
}

export function isSearchEngineEncoding(
  value: unknown
): value is SearchEngineEncoding {
  return safeParseSearchEngineEncoding(value).success;
}

export function normalizeSearchEngineEncoding(
  value: unknown
): SearchEngineEncoding | undefined {
  const parsed = safeParseSearchEngineEncoding(value);
  return parsed.success ? parsed.output : undefined;
}
