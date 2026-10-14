import { Result } from "@praha/byethrow";

/**
 * Validates that a value conforms to Result.Result<T, E> structure by checking
 * if it's recognized by Result.isSuccess or Result.isFailure.
 * Since Result type is opaque, we use runtime checks instead of schema validation.
 */
export function isResultType(
  value: unknown
): value is Result.Result<unknown, unknown> {
  try {
    return (
      Result.isSuccess(value as Result.Result<unknown, unknown>) ||
      Result.isFailure(value as Result.Result<unknown, unknown>)
    );
  } catch {
    return false;
  }
}
