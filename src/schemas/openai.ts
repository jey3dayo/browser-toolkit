import { picklist, pipe, safeParse, string, transform, trim } from "valibot";

export const OPENAI_MODEL_OPTIONS = [
  "gpt-5.2",
  "gpt-5-mini",
  "gpt-4o-mini",
] as const;

export type OpenAiModelOption = (typeof OPENAI_MODEL_OPTIONS)[number];

const DEPRECATED_MODEL_MAP: Record<string, OpenAiModelOption> = {
  "gpt-5.1": "gpt-5.2",
  "gpt-4o": "gpt-4o-mini",
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
