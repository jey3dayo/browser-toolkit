import { Result } from "@praha/byethrow";
import type { ContextActionKind } from "@/context_actions";
import type { RunContextActionResponse } from "@/popup/runtime";
import { coerceSummarySourceLabel } from "@/popup/utils/summary_source_label";
import { isRecord } from "@/utils/guards";

export type OutputState =
  | { status: "idle" }
  | { status: "running"; title: string }
  | {
      status: "ready";
      title: string;
      text: string;
      sourceLabel: string;
    }
  | { status: "error"; title: string; message: string };

export function isRunContextActionResponse(
  value: unknown
): value is RunContextActionResponse {
  // Result type is opaque, so we can't check its structure directly
  // We assume the value is a RunContextActionResponse if it's an object
  return isRecord(value);
}

export function coerceKind(value: unknown): ContextActionKind | null {
  if (value === "event") {
    return "event";
  }
  if (value === "text") {
    return "text";
  }
  return null;
}

type ParseRunContextActionResponseError = string;

export function parseRunContextActionResponseToOutput(params: {
  actionTitle: string;
  responseUnknown: unknown;
}): Result.Result<OutputState, ParseRunContextActionResponseError> {
  if (!isRunContextActionResponse(params.responseUnknown)) {
    return Result.fail("バックグラウンドの応答が不正です");
  }

  const response = params.responseUnknown;
  if (Result.isFailure(response)) {
    return Result.fail(response.error);
  }

  const payload = response.value;
  const sourceLabel = coerceSummarySourceLabel(payload.source);

  if (payload.resultType === "event") {
    return Result.succeed({
      status: "ready",
      title: params.actionTitle,
      text: payload.eventText,
      sourceLabel,
    });
  }

  if (payload.resultType === "text") {
    return Result.succeed({
      status: "ready",
      title: params.actionTitle,
      text: payload.text,
      sourceLabel,
    });
  }

  return Result.fail("結果の形式が不正です");
}
