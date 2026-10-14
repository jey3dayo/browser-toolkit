import { Result } from "@praha/byethrow";
import type { BaseIssue, BaseSchema } from "valibot";
import { safeParse } from "valibot";

/**
 * Validates that a value conforms to Result.Result<T, E> structure.
 *
 * This validates:
 * 1. The Result discriminator (type field)
 * 2. The concrete value shape for Success
 * 3. The concrete error shape for Failure
 *
 * @param value - The value to validate
 * @param successSchema - Valibot schema for the success value
 * @param errorSchema - Valibot schema for the error value
 */
export function isResultType<T, E>(
  value: unknown,
  successSchema: BaseSchema<unknown, T, BaseIssue<unknown>>,
  errorSchema: BaseSchema<unknown, E, BaseIssue<unknown>>
): value is Result.Result<T, E> {
  try {
    // First check basic structure - must be an object with type field
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (record.type !== "Success" && record.type !== "Failure") {
      return false;
    }

    // Use Result type guards for structural check
    if (Result.isSuccess(value as Result.Result<unknown, unknown>)) {
      // Must have value field
      if (!("value" in record)) {
        return false;
      }
      const result = safeParse(successSchema, record.value);
      return result.success;
    }

    if (Result.isFailure(value as Result.Result<unknown, unknown>)) {
      // Must have error field
      if (!("error" in record)) {
        return false;
      }
      const result = safeParse(errorSchema, record.error);
      return result.success;
    }

    return false;
  } catch {
    return false;
  }
}
