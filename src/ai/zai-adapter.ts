/** z.ai は Chat Completions wire 形式を使い、送信パラメータはそのまま渡す。 */
import { PROVIDER_CONFIGS } from "@/schemas/provider";
import { createOpenAiCompatibleAdapter } from "./openai-compatible-adapter";

export const zaiAdapter = createOpenAiCompatibleAdapter({
  baseUrl: PROVIDER_CONFIGS.zai.baseUrl,
  label: PROVIDER_CONFIGS.zai.label,
  prepareBody: (body) => body,
});
