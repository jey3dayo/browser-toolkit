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
  title: string(),
  start: string(),
  end: optional(string()),
  allDay: optional(boolean()),
  location: optional(string()),
  description: optional(string()),
}) satisfies BaseSchema<unknown, ExtractedEvent, BaseIssue<unknown>>;
