import { DEFAULT_OPENAI_MODEL } from "@/constants/models";
import {
  type OpenAiModelOption as OpenAiModelOptionSchema,
  safeParseOpenAiModel,
} from "@/schemas/openai";

type OpenAiModelOption = OpenAiModelOptionSchema;

export function normalizeOpenAiModel(value: unknown): OpenAiModelOption {
  const parsed = safeParseOpenAiModel(value);
  return parsed.success ? parsed.output : DEFAULT_OPENAI_MODEL;
}
