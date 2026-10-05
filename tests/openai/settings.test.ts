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
    expect(normalizeOpenAiModel("gpt-custom")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(OPENAI_MODELS.GPT_5_6_TERRA)).toBe(
      OPENAI_MODELS.GPT_5_6_TERRA
    );
    expect(normalizeOpenAiModel(`  ${OPENAI_MODELS.GPT_5_6_LUNA}  `)).toBe(
      OPENAI_MODELS.GPT_5_6_LUNA
    );
  });

  it("falls back to the common default for unsupported model IDs", () => {
    expect(normalizeOpenAiModel("gpt-5.4-2026-03-05")).toBe(
      DEFAULT_OPENAI_MODEL
    );
    expect(normalizeOpenAiModel("gpt-5.4")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-5.2")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-5.2-chat-latest")).toBe(
      DEFAULT_OPENAI_MODEL
    );
    expect(normalizeOpenAiModel("gpt-5.1")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-4o")).toBe(DEFAULT_OPENAI_MODEL);
  });
});
