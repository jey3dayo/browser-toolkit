import { object, string } from "valibot";
import type { TestAiTokenResponse } from "@/popup/runtime";
import { isResultType } from "@/schemas/result";

/**
 * Schema for TestAiTokenResponse success value (empty object)
 * The handler returns Result.succeed({}) per runtime_handlers.ts:281
 */
const TestAiTokenSuccessSchema = object({});

/**
 * Validates that a value conforms to TestAiTokenResponse structure.
 *
 * Checks:
 * - Success case: value is an empty object {} (allows extra properties)
 * - Failure case: error is a string
 */
export function isTestAiTokenResponse(
  value: unknown
): value is TestAiTokenResponse {
  return isResultType(value, TestAiTokenSuccessSchema, string());
}
