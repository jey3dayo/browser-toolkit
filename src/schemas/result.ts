import { Result } from "@praha/byethrow";
import type { BaseIssue, BaseSchema } from "valibot";
import { safeParse } from "valibot";

export function isResultType<T, E>(
  value: unknown,
  successSchema: BaseSchema<unknown, T, BaseIssue<unknown>>,
  errorSchema: BaseSchema<unknown, E, BaseIssue<unknown>>
): value is Result.Result<T, E> {
  try {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (record.type !== "Success" && record.type !== "Failure") {
      return false;
    }

    if (Result.isSuccess(value as Result.Result<unknown, unknown>)) {
      if (!("value" in record)) {
        return false;
      }
      const result = safeParse(successSchema, record.value);
      return result.success;
    }

    if (Result.isFailure(value as Result.Result<unknown, unknown>)) {
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
