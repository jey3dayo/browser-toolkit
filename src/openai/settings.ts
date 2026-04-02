import { OPENAI_MODELS } from "@/constants/models";
import {
  type OpenAiModelOption as OpenAiModelOptionSchema,
  safeParseOpenAiModel,
} from "@/schemas/openai";

export const DEFAULT_OPENAI_MODEL = OPENAI_MODELS.GPT_5_4;
type OpenAiModelOption = OpenAiModelOptionSchema;

export function normalizeOpenAiModel(value: unknown): OpenAiModelOption {
  const parsed = safeParseOpenAiModel(value);
  return parsed.success ? parsed.output : DEFAULT_OPENAI_MODEL;
}
