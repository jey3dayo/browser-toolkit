import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export function ignoreRejection<T>(
  promise: Promise<T>,
  scope: string
): Promise<void> {
  return promise.then(
    () => {
      // success: no-op
    },
    async (error: unknown) => {
      try {
        await debugLog(
          "ignore-rejection",
          scope,
          formatErrorLog(scope, {}, error)
        );
        // biome-ignore lint/suspicious/noEmptyBlockStatements: intentionally swallow debugLog failure
      } catch {}
    }
  );
}

// biome-ignore lint/suspicious/noEmptyBlockStatements: intentionally empty for stories
export const NOOP = (): void => {};

export function debugLogSilently(
  context: string,
  message: string,
  data?: Record<string, unknown>,
  level?: "debug" | "info" | "warn" | "error"
): void {
  // biome-ignore lint/suspicious/noEmptyBlockStatements: intentionally swallow debugLog failure
  debugLog(context, message, data, level).catch(() => {});
}
