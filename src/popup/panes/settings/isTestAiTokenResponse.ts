import type { TestAiTokenResponse } from "@/popup/runtime";
import { isRecord } from "@/utils/guards";

export function isTestAiTokenResponse(
  value: unknown
): value is TestAiTokenResponse {
  // Result type is opaque, so we can't check its structure directly
  // We assume the value is a TestAiTokenResponse if it's an object
  return isRecord(value);
}
