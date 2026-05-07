import { describe, expect, it } from "vitest";
import { OPENAI_MODELS } from "@/constants/models";
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_REQUEST_MODEL,
  normalizeOpenAiModel,
  resolveOpenAiRequestModel,
} from "@/openai/settings";

describe("openai/settings", () => {
  it("normalizes the model value from storage", () => {
    expect(normalizeOpenAiModel(undefined)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(null)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("  ")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel("gpt-custom")).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(OPENAI_MODELS.GPT_5_5)).toBe(
      OPENAI_MODELS.GPT_5_5
    );
    expect(normalizeOpenAiModel(`  ${OPENAI_MODELS.GPT_4O_MINI}  `)).toBe(
      OPENAI_MODELS.GPT_4O_MINI
    );
  });

  it("migrates deprecated models to their replacements", () => {
    expect(normalizeOpenAiModel("gpt-5.4-2026-03-05")).toBe(
      OPENAI_MODELS.DEFAULT
    );
    expect(normalizeOpenAiModel("gpt-5.4")).toBe(OPENAI_MODELS.DEFAULT);
    expect(normalizeOpenAiModel("gpt-5.2")).toBe(OPENAI_MODELS.DEFAULT);
    expect(normalizeOpenAiModel("gpt-5.2-chat-latest")).toBe(
      OPENAI_MODELS.DEFAULT
    );
    expect(normalizeOpenAiModel("gpt-5.1")).toBe(OPENAI_MODELS.DEFAULT);
    expect(normalizeOpenAiModel("gpt-4o")).toBe(OPENAI_MODELS.GPT_4O_MINI);
  });

  it("resolves default to a concrete API request model", () => {
    expect(resolveOpenAiRequestModel(OPENAI_MODELS.DEFAULT)).toBe(
      DEFAULT_OPENAI_REQUEST_MODEL
    );
    expect(resolveOpenAiRequestModel(OPENAI_MODELS.GPT_5_5)).toBe(
      OPENAI_MODELS.GPT_5_5
    );
  });
});
