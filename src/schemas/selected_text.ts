import {
  type BaseIssue,
  type BaseSchema,
  number,
  object,
  optional,
  string,
} from "valibot";

export type SelectedTextCache = {
  selectedText?: string;
  selectedTextOrigin?: string;
  selectedTextUpdatedAt?: number;
};

export const SelectedTextCacheSchema = object({
  selectedText: optional(string()),
  selectedTextOrigin: optional(string()),
  selectedTextUpdatedAt: optional(number()),
}) satisfies BaseSchema<unknown, SelectedTextCache, BaseIssue<unknown>>;
