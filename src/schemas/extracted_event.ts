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
