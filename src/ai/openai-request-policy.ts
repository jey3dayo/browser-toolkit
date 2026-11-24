import { OPENAI_MODELS } from "@/constants/models";
import type { ChatRequestBody } from "./adapter";

const OMIT_TEMPERATURE_MODELS: ReadonlySet<string> = new Set([
  OPENAI_MODELS.GPT_6_LUNA,
  OPENAI_MODELS.GPT_6_1_SOL,
]);

export function prepareOpenAiRequestBody(
  body: ChatRequestBody
): ChatRequestBody {
  if (
    !(OMIT_TEMPERATURE_MODELS.has(body.model) || body.model.startsWith("gpt-5"))
  ) {
    return body;
  }
  const { temperature: _temperature, ...rest } = body;
  return rest;
}
