import { literal, object, string, union } from "valibot";
import type { RunContextActionResponse } from "@/background/types";
import { isResultType } from "@/schemas/result";

/**
 * Schema for SummarySource type
 */
const SummarySourceSchema = union([literal("selection"), literal("page")]);

/**
 * Schema for RunContextActionSuccessPayload - text variant
 */
const TextPayloadSchema = object({
  resultType: literal("text"),
  source: SummarySourceSchema,
  text: string(),
});

/**
 * Schema for RunContextActionSuccessPayload - event variant
 */
const EventPayloadSchema = object({
  eventText: string(),
  resultType: literal("event"),
  source: SummarySourceSchema,
});

/**
 * Combined schema for RunContextActionSuccessPayload
 */
const RunContextActionSuccessPayloadSchema = union([
  TextPayloadSchema,
  EventPayloadSchema,
]);

/**
 * Validates that a value conforms to RunContextActionResponse structure.
 *
 * Checks:
 * - Success case: payload has correct shape (text/eventText + source)
 * - Failure case: error is a string
 */
export function isRunContextActionResponse(
  value: unknown
): value is RunContextActionResponse {
  return isResultType(value, RunContextActionSuccessPayloadSchema, string());
}
