import { picklist, pipe, safeParse, string, trim } from "valibot";
import { OPENAI_MODEL_LIST } from "@/constants/models";

export const OPENAI_MODEL_OPTIONS = OPENAI_MODEL_LIST;

export type OpenAiModelOption = (typeof OPENAI_MODEL_OPTIONS)[number];

const OpenAiModelSchema = pipe(
  string(),
  trim(),
  picklist(OPENAI_MODEL_OPTIONS)
);

export function safeParseOpenAiModel(value: unknown) {
  return safeParse(OpenAiModelSchema, value);
}
