import { describe, expect, it } from "vitest";
import { OPENAI_MODELS } from "@/constants/models";
import { OPENAI_MODEL_OPTIONS, safeParseOpenAiModel } from "@/schemas/openai";

describe("schemas/openai", () => {
  it("accepts supported models", () => {
    // 順序は設定ペインのモデル選択に表示される順そのもの（Luna を先頭に置く）。
    // 表示順は意図的な選択なので、集合だけでなく順序も固定する。
    expect(OPENAI_MODEL_OPTIONS).toEqual([
      OPENAI_MODELS.GPT_6_LUNA,
      OPENAI_MODELS.GPT_5_6_LUNA,
      OPENAI_MODELS.GPT_5_6_TERRA,
    ]);

    for (const model of OPENAI_MODEL_OPTIONS) {
      const parsed = safeParseOpenAiModel(model);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.output).toBe(model);
      }
    }
  });

  it.each(["default", "gpt-5-mini", "gpt-5-nano", "gpt-5.5", "gpt-4o"])(
    "rejects unsupported %s without substituting a different model",
    (model) => {
      expect(safeParseOpenAiModel(model).success).toBe(false);
    }
  );

  it("rejects invalid values", () => {
    const invalidValues = [undefined, null, "", "  ", "gpt-custom"];

    for (const value of invalidValues) {
      const parsed = safeParseOpenAiModel(value);
      expect(parsed.success).toBe(false);
    }
  });
});
