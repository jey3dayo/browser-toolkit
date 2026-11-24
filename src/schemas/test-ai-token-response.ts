import { object, string } from "valibot";
import type { TestAiTokenResponse } from "@/popup/runtime";
import { isResultType } from "@/schemas/result";

const TestAiTokenSuccessSchema = object({});

export function isTestAiTokenResponse(
  value: unknown
): value is TestAiTokenResponse {
  return isResultType(value, TestAiTokenSuccessSchema, string());
}
