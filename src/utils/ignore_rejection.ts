import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export function ignoreRejection<T>(
  promise: Promise<T>,
  scope: string
): Promise<void> {
  return promise.then(
    () => {},
    async (error: unknown) => {
      try {
        await debugLog(
          "ignore-rejection",
          scope,
          formatErrorLog(scope, {}, error)
        );
      } catch {}
    }
  );
}

export const NOOP = (): void => {};

export function debugLogSilently(
  context: string,
  message: string,
  data?: Record<string, unknown>,
  level?: "debug" | "info" | "warn" | "error"
): void {
  debugLog(context, message, data, level).catch(() => {});
}
