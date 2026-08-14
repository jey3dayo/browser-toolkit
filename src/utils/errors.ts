export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

type SerializedError = {
  name?: string;
  message: string;
  stack?: string;
  cause?: string;
};

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value) {
    return value;
  }
}

function extractCause(cause: unknown): string | undefined {
  if (cause instanceof Error) {
    return cause.message;
  }
  return readString(cause);
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      cause: extractCause(error.cause),
      message: error.message || "Unknown error",
      name: error.name,
      stack: error.stack,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (error && typeof error === "object") {
    const record = error as {
      name?: unknown;
      message?: unknown;
      stack?: unknown;
      cause?: unknown;
    };
    return {
      cause: extractCause(record.cause),
      message: readString(record.message) ?? "Unknown error",
      name: readString(record.name),
      stack: readString(record.stack),
    };
  }
  return { message: "Unknown error" };
}

function safeJsonStringify(value: unknown): {
  json: string;
  parseError?: string;
} {
  try {
    return { json: JSON.stringify(value) };
  } catch (error) {
    const parseError =
      error instanceof Error && error.message
        ? error.message
        : "Failed to stringify";
    return { json: JSON.stringify({ parseError }), parseError };
  }
}

export function formatErrorLog(
  label: string,
  context: Record<string, unknown>,
  error?: unknown
): string {
  const payload: Record<string, unknown> = { ...context };
  if (error !== undefined) {
    payload.error = serializeError(error);
  }
  const { json, parseError } = safeJsonStringify(payload);
  return parseError
    ? `${label}: ${json} (parseError: ${parseError})`
    : `${label}: ${json}`;
}
