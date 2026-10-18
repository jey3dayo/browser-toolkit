import { literal, object, string, union } from "valibot";
import type { RunContextActionResponse } from "@/background/types";
import { isResultType } from "@/schemas/result";

const SummarySourceSchema = union([literal("selection"), literal("page")]);

const TextPayloadSchema = object({
  resultType: literal("text"),
  source: SummarySourceSchema,
  text: string(),
});

const EventPayloadSchema = object({
  eventText: string(),
  resultType: literal("event"),
  source: SummarySourceSchema,
});

const RunContextActionSuccessPayloadSchema = union([
  TextPayloadSchema,
  EventPayloadSchema,
]);

export function isRunContextActionResponse(
  value: unknown
): value is RunContextActionResponse {
  return isResultType(value, RunContextActionSuccessPayloadSchema, string());
}
