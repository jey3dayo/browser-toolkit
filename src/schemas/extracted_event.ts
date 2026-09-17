import {
  type BaseIssue,
  type BaseSchema,
  boolean,
  object,
  optional,
  string,
} from "valibot";
import type { ExtractedEvent } from "@/shared_types";

export const ExtractedEventSchema = object({
  allDay: optional(boolean()),
  description: optional(string()),
  end: optional(string()),
  location: optional(string()),
  start: string(),
  title: string(),
}) satisfies BaseSchema<unknown, ExtractedEvent, BaseIssue<unknown>>;

/**
 * Anthropic の output_config.format へ渡す JSON Schema。
 * ExtractedEventSchema と同じ形を保つこと。
 */
export const EXTRACTED_EVENT_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    allDay: { type: "boolean" },
    description: { type: "string" },
    end: { type: "string" },
    location: { type: "string" },
    start: { type: "string" },
    title: { type: "string" },
  },
  required: ["title", "start"],
  type: "object",
};
