import { describe, expect, it } from "vitest";
import { ExtractedEventSchema } from "@/schemas/extracted_event";
import { safeParseJsonObject } from "@/schemas/json";

describe("safeParseJsonObject", () => {
  it("parses JSON object", () => {
    const result = safeParseJsonObject(
      ExtractedEventSchema,
      '{"title":"会議","start":"2026-05-25T10:00:00+09:00"}'
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toEqual({
        title: "会議",
        start: "2026-05-25T10:00:00+09:00",
      });
    }
  });

  it("parses JSON object with surrounding text", () => {
    const result = safeParseJsonObject(
      ExtractedEventSchema,
      'prefix {"title":"出張","start":"2026-05-26","allDay":true} suffix'
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toEqual({
        title: "出張",
        start: "2026-05-26",
        allDay: true,
      });
    }
  });

  it("fails when JSON object is not found", () => {
    const result = safeParseJsonObject(ExtractedEventSchema, "not a json");
    expect(result.success).toBe(false);
  });
});
