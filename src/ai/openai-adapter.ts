import { PROVIDER_CONFIGS } from "@/schemas/provider";
import { createOpenAiCompatibleAdapter } from "./openai-compatible-adapter";
import { prepareOpenAiRequestBody } from "./openai-request-policy";

export const openaiAdapter = createOpenAiCompatibleAdapter({
  baseUrl: PROVIDER_CONFIGS.openai.baseUrl,
  label: PROVIDER_CONFIGS.openai.label,
  prepareBody: prepareOpenAiRequestBody,
});
