import { describe, expect, it } from "vitest";

import {
  OPENAI_MODEL_OPTIONS,
  safeParseOpenAiModel,
} from "@/schemas/openai";

describe("schemas/openai", () => {
  it("accepts supported models", () => {
    for (const model of OPENAI_MODEL_OPTIONS) {
      const parsed = safeParseOpenAiModel(model);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.output).toBe(model);
      }
    }
  });

  it("migrates deprecated models", () => {
    const legacyModels = [
      { input: "gpt-5.1", expected: "gpt-5.2" },
      { input: "gpt-4o", expected: "gpt-4o-mini" },
    ];

    for (const { input, expected } of legacyModels) {
      const parsed = safeParseOpenAiModel(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.output).toBe(expected);
      }
    }
  });

  it("rejects invalid values", () => {
    const invalidValues = [undefined, null, "", "  ", "gpt-custom"];

    for (const value of invalidValues) {
      const parsed = safeParseOpenAiModel(value);
      expect(parsed.success).toBe(false);
    }
  });
});
