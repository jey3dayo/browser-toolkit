import * as v from "valibot";
import type { ExtractedEvent } from "@/shared_types";

export const ExtractedEventSchema = v.object({
  title: v.string(),
  start: v.string(),
  end: v.optional(v.string()),
  allDay: v.optional(v.boolean()),
  location: v.optional(v.string()),
  description: v.optional(v.string()),
}) satisfies v.BaseSchema<unknown, ExtractedEvent, v.BaseIssue<unknown>>;
