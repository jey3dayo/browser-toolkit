import * as v from "valibot";

type SafeParseResult<T> =
  | { success: true; output: T }
  | { success: false; issues: v.BaseIssue<unknown>[] };

function parseJsonObject(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // noop
  }

  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export function safeParseJsonObject<TOutput>(
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>,
  text: string
): SafeParseResult<TOutput> {
  const parsed = parseJsonObject(text);
  if (parsed === null) {
    return v.safeParse(schema, undefined) as SafeParseResult<TOutput>;
  }
  return v.safeParse(schema, parsed) as SafeParseResult<TOutput>;
}
