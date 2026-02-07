import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { safeParseJsonObject } from "@/schemas/json";

describe("safeParseJsonObject", () => {
  it("parses JSON object", () => {
    const schema = v.object({ a: v.number() });
    const result = safeParseJsonObject(schema, '{"a":1}');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toEqual({ a: 1 });
    }
  });

  it("parses JSON object with surrounding text", () => {
    const schema = v.object({ ok: v.boolean() });
    const result = safeParseJsonObject(schema, 'prefix {"ok":true} suffix');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toEqual({ ok: true });
    }
  });

  it("fails when JSON object is not found", () => {
    const schema = v.object({ ok: v.boolean() });
    const result = safeParseJsonObject(schema, "not a json");
    expect(result.success).toBe(false);
  });
});
