import { describe, expect, it } from "vitest";
import { OPENAI_MODELS } from "@/constants/models";
import { DEFAULT_OPENAI_MODEL, normalizeOpenAiModel } from "@/openai/settings";

describe("openai/settings", () => {
  it("normalizes the model value from storage", () => {
    expect(normalizeOpenAiModel(undefined)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(null)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("  ")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-custom")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(OPENAI_MODELS.GPT_5_2)).toBe(
      OPENAI_MODELS.GPT_5_2
    );
    expect(normalizeOpenAiModel(`  ${OPENAI_MODELS.GPT_4O_MINI}  `)).toBe(
      OPENAI_MODELS.GPT_4O_MINI
    );
  });

  it("migrates deprecated models to their replacements", () => {
    expect(normalizeOpenAiModel("gpt-5.1")).toBe(OPENAI_MODELS.GPT_5_2);
    expect(normalizeOpenAiModel("gpt-4o")).toBe(OPENAI_MODELS.GPT_4O_MINI);
  });
});
