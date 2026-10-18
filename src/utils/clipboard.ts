import { Result } from "@praha/byethrow";

export type ClipboardError =
  | { type: "empty-text" }
  | { type: "unavailable" }
  | { type: "copy-failed" };

export async function copyToClipboard(
  text: string
): Promise<Result.Result<void, ClipboardError>> {
  const trimmed = text.trim();
  if (!trimmed) {
    return Result.fail({ type: "empty-text" });
  }

  if (!navigator.clipboard?.writeText) {
    return Result.fail({ type: "unavailable" });
  }

  try {
    await navigator.clipboard.writeText(trimmed);
    return Result.succeed(undefined);
  } catch {
    return Result.fail({ type: "copy-failed" });
  }
}
