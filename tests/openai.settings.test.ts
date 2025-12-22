import { describe, expect, it } from "vitest";

import { DEFAULT_OPENAI_MODEL, normalizeOpenAiModel } from "@/openai/settings";

describe("openai/settings", () => {
  it("normalizes the model value from storage", () => {
    expect(normalizeOpenAiModel(undefined)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(null)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("  ")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-custom")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-4o")).toBe("gpt-4o");
    expect(normalizeOpenAiModel("  gpt-4o-mini  ")).toBe("gpt-4o-mini");
  });
});
