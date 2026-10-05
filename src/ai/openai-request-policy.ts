import { OPENAI_MODELS } from "@/constants/models";
import type { ChatRequestBody } from "./adapter";

// API のリクエスト制約。UI の選択肢への追加とは独立に判断する。
const OMIT_TEMPERATURE_MODELS: ReadonlySet<string> = new Set([
  OPENAI_MODELS.GPT_6_LUNA,
  OPENAI_MODELS.GPT_6_1_SOL,
]);

export function prepareOpenAiRequestBody(
  body: ChatRequestBody
): ChatRequestBody {
  // GPT-5 系の既存互換性と、任意モデル文字列の pass-through を維持する。
  if (
    !(OMIT_TEMPERATURE_MODELS.has(body.model) || body.model.startsWith("gpt-5"))
  ) {
    return body;
  }
  const { temperature: _temperature, ...rest } = body;
  return rest;
}
