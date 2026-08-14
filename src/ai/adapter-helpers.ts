/**
 * AIアダプター共通ヘルパー
 */

export function extractApiErrorMessage(json: unknown): string | null {
  if (typeof json !== "object" || json === null || !("error" in json)) {
    return null;
  }

  const { error } = json as { error?: unknown };
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const { message } = error as { message?: unknown };
  return typeof message === "string" ? message : null;
}
