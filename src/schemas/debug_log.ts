import {
  array,
  type BaseIssue,
  type BaseSchema,
  literal,
  number,
  object,
  optional,
  picklist,
  string,
  unknown,
} from "valibot";
import type { DebugLogEntry } from "@/utils/debug_log";

const DebugLogEntrySchema = object({
  context: string(),
  data: optional(unknown()),
  level: picklist(["debug", "info", "warn", "error"]),
  message: string(),
  timestamp: string(),
}) satisfies BaseSchema<unknown, DebugLogEntry, BaseIssue<unknown>>;

/** background の getDebugLogStats 成功応答。ok:false など他の形は検証失敗になる。 */
export const DebugLogStatsResponseSchema = object({
  entryCount: number(),
  ok: literal(true),
  sizeBytes: number(),
  sizeKB: string(),
});

/** background の getDebugLogs 成功応答。ok:false など他の形は検証失敗になる。 */
export const DebugLogsResponseSchema = object({
  logs: array(DebugLogEntrySchema),
  ok: literal(true),
});
