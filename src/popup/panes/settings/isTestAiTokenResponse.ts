import type { TestAiTokenResponse } from "@/popup/runtime";
import { isTestAiTokenResponse as isTestAiTokenResponseSchema } from "@/schemas/test-ai-token-response";

export function isTestAiTokenResponse(
  value: unknown
): value is TestAiTokenResponse {
  return isTestAiTokenResponseSchema(value);
}
