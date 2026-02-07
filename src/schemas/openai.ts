import * as v from "valibot";

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

const OpenAiModelSchema = v.pipe(
  v.string(),
  v.trim(),
  v.transform((value) => DEPRECATED_MODEL_MAP[value] ?? value),
  v.picklist(OPENAI_MODEL_OPTIONS)
);

export function safeParseOpenAiModel(value: unknown) {
  return v.safeParse(OpenAiModelSchema, value);
}
