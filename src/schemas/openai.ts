import { picklist, pipe, safeParse, string, transform, trim } from "valibot";
import { OPENAI_MODEL_LIST, OPENAI_MODELS } from "@/constants/models";

export const OPENAI_MODEL_OPTIONS = OPENAI_MODEL_LIST;

export type OpenAiModelOption = (typeof OPENAI_MODEL_OPTIONS)[number];

const DEPRECATED_MODEL_MAP: Record<string, OpenAiModelOption> = {
  "gpt-5.1": OPENAI_MODELS.GPT_5_2,
  "gpt-4o": OPENAI_MODELS.GPT_4O_MINI,
};

const OpenAiModelSchema = pipe(
  string(),
  trim(),
  transform((value) => DEPRECATED_MODEL_MAP[value] ?? value),
  picklist(OPENAI_MODEL_OPTIONS)
);

export function safeParseOpenAiModel(value: unknown) {
  return safeParse(OpenAiModelSchema, value);
}
