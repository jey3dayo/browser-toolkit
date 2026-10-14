import { Result } from "@praha/byethrow";
import { t } from "@/i18n";
import { coerceSummarySourceLabel } from "@/popup/utils/summary_source_label";
import { isRunContextActionResponse } from "@/schemas/context-action-response";

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

type ParseRunContextActionResponseError = string;

export function parseRunContextActionResponseToOutput(params: {
  actionTitle: string;
  responseUnknown: unknown;
}): Result.Result<OutputState, ParseRunContextActionResponseError> {
  if (!isRunContextActionResponse(params.responseUnknown)) {
    return Result.fail(t("popup.actions.invalidBackgroundResponse"));
  }

  const response = params.responseUnknown;
  if (Result.isFailure(response)) {
    return Result.fail(response.error);
  }

  const payload = response.value;
  const sourceLabel = coerceSummarySourceLabel(payload.source);

  if (payload.resultType === "event") {
    return Result.succeed({
      sourceLabel,
      status: "ready",
      text: payload.eventText,
      title: params.actionTitle,
    });
  }

  if (payload.resultType === "text") {
    return Result.succeed({
      sourceLabel,
      status: "ready",
      text: payload.text,
      title: params.actionTitle,
    });
  }

  return Result.fail(t("popup.actions.invalidResultFormat"));
}
