/**
 * AIアダプター共通ヘルパー
 */

export function extractApiErrorMessage(json: unknown): string | null {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: unknown }).error === "object" &&
    (json as { error: { message?: unknown } }).error !== null &&
    typeof (json as { error: { message?: unknown } }).error.message === "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }

  return null;
}
