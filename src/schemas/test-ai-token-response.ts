import { string, undefined as undefinedSchema } from "valibot";
import type { TestAiTokenResponse } from "@/popup/runtime";
import { isResultType } from "@/schemas/result";

/**
 * Schema for TestAiTokenResponse success value (void)
 */
const TestAiTokenSuccessSchema = undefinedSchema();

/**
 * Validates that a value conforms to TestAiTokenResponse structure.
 *
 * Checks:
 * - Success case: value is undefined
 * - Failure case: error is a string
 */
export function isTestAiTokenResponse(
  value: unknown
): value is TestAiTokenResponse {
  return isResultType(value, TestAiTokenSuccessSchema, string());
}
