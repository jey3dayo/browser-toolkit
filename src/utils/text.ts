export function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
