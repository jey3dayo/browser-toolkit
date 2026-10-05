/** OpenAI の API 設定とリクエスト制約を共通 wire adapter に渡す。 */
import { PROVIDER_CONFIGS } from "@/schemas/provider";
import { createOpenAiCompatibleAdapter } from "./openai-compatible-adapter";
import { prepareOpenAiRequestBody } from "./openai-request-policy";

export const openaiAdapter = createOpenAiCompatibleAdapter({
  baseUrl: PROVIDER_CONFIGS.openai.baseUrl,
  label: PROVIDER_CONFIGS.openai.label,
  prepareBody: prepareOpenAiRequestBody,
});
