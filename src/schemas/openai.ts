import { picklist, pipe, safeParse, string, transform, trim } from "valibot";
import { LEGACY_OPENAI_MODEL_MAP, OPENAI_MODEL_LIST } from "@/constants/models";

export const OPENAI_MODEL_OPTIONS = OPENAI_MODEL_LIST;

export type OpenAiModelOption = (typeof OPENAI_MODEL_OPTIONS)[number];

const OpenAiModelSchema = pipe(
  string(),
  trim(),
  transform((value) => LEGACY_OPENAI_MODEL_MAP[value] ?? value),
  picklist(OPENAI_MODEL_OPTIONS)
);

export function safeParseOpenAiModel(value: unknown) {
  return safeParse(OpenAiModelSchema, value);
}
