import type { TestAiTokenResponse } from "@/popup/runtime";
import { isResultType } from "@/schemas/result";

export function isTestAiTokenResponse(
  value: unknown
): value is TestAiTokenResponse {
  return isResultType(value);
}
