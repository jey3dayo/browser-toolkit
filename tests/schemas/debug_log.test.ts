import { safeParse } from "valibot";
import { describe, expect, it } from "vitest";
import {
  DebugLogStatsResponseSchema,
  DebugLogsResponseSchema,
} from "@/schemas/debug_log";

describe("debug_log response schemas", () => {
  it("accepts background success responses", () => {
    expect(
      safeParse(DebugLogStatsResponseSchema, {
        entryCount: 1,
        ok: true,
        sizeBytes: 10,
        sizeKB: "0.01",
      }).success
    ).toBe(true);
    expect(
      safeParse(DebugLogsResponseSchema, {
        logs: [{ context: "c", level: "warn", message: "m", timestamp: "t" }],
        ok: true,
      }).success
    ).toBe(true);
  });

  it("rejects ok:false and malformed responses", () => {
    expect(
      safeParse(DebugLogStatsResponseSchema, { error: "x", ok: false }).success
    ).toBe(false);
    expect(
      safeParse(DebugLogsResponseSchema, { logs: [{ nonsense: 1 }], ok: true })
        .success
    ).toBe(false);
    expect(
      safeParse(DebugLogsResponseSchema, {
        logs: [{ context: "c", level: "fatal", message: "m", timestamp: "t" }],
        ok: true,
      }).success
    ).toBe(false);
  });
});
