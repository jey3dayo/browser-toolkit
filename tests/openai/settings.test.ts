import { describe, expect, it } from "vitest";
import { DEFAULT_OPENAI_MODEL, OPENAI_MODELS } from "@/constants/models";
import { normalizeOpenAiModel } from "@/openai/settings";

describe("openai/settings", () => {
  it("defaults to GPT-6 Luna", () => {
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-6-luna");
  });
  it("normalizes the model value from storage", () => {
    expect(normalizeOpenAiModel(undefined)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(null)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("  ")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("unsupported-model")).toBe(
      DEFAULT_OPENAI_MODEL
    );
    expect(normalizeOpenAiModel(OPENAI_MODELS.GPT_6_1_SOL)).toBe(
      OPENAI_MODELS.GPT_6_1_SOL
    );
    expect(normalizeOpenAiModel(`  ${OPENAI_MODELS.GPT_6_LUNA}  `)).toBe(
      OPENAI_MODELS.GPT_6_LUNA
    );
  });
});
