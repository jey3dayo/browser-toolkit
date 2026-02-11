import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  normalizeAiModel,
  PROVIDER_CONFIGS,
  safeParseAiProvider,
} from "@/schemas/provider";

describe("schemas/provider", () => {
  describe("safeParseAiProvider", () => {
    it("parses valid provider strings", () => {
      expect(safeParseAiProvider("openai")).toBe("openai");
      expect(safeParseAiProvider("anthropic")).toBe("anthropic");
      expect(safeParseAiProvider("zai")).toBe("zai");
    });

    it("returns null for invalid provider strings", () => {
      expect(safeParseAiProvider("invalid")).toBeNull();
      expect(safeParseAiProvider("")).toBeNull();
      expect(safeParseAiProvider("OPENAI")).toBeNull();
    });

    it("returns null for non-string values", () => {
      expect(safeParseAiProvider(null)).toBeNull();
      expect(safeParseAiProvider(undefined)).toBeNull();
      expect(safeParseAiProvider(123)).toBeNull();
      expect(safeParseAiProvider({})).toBeNull();
    });
  });

  describe("normalizeAiModel", () => {
    it("returns the value if it is a valid model for the provider", () => {
      expect(normalizeAiModel("openai", "gpt-5.2")).toBe("gpt-5.2");
      expect(normalizeAiModel("openai", "gpt-4o-mini")).toBe("gpt-4o-mini");
      expect(normalizeAiModel("anthropic", "claude-sonnet-4-5-20250929")).toBe(
        "claude-sonnet-4-5-20250929"
      );
      expect(normalizeAiModel("zai", "glm-4.7")).toBe("glm-4.7");
    });

    it("returns the default model if value is undefined", () => {
      expect(normalizeAiModel("openai", undefined)).toBe("gpt-5.2");
      expect(normalizeAiModel("anthropic", undefined)).toBe(
        "claude-sonnet-4-5-20250929"
      );
      expect(normalizeAiModel("zai", undefined)).toBe("glm-4.7");
    });

    it("returns the default model if value is invalid for the provider", () => {
      expect(normalizeAiModel("openai", "invalid-model")).toBe("gpt-5.2");
      expect(normalizeAiModel("anthropic", "gpt-4")).toBe(
        "claude-sonnet-4-5-20250929"
      );
      expect(normalizeAiModel("zai", "gpt-4")).toBe("glm-4.7");
    });
  });

  describe("PROVIDER_CONFIGS", () => {
    it("contains all providers", () => {
      for (const provider of AI_PROVIDERS) {
        expect(PROVIDER_CONFIGS[provider]).toBeDefined();
      }
    });

    it("has valid structure for each provider", () => {
      for (const provider of AI_PROVIDERS) {
        const config = PROVIDER_CONFIGS[provider];
        expect(config.label).toBeTruthy();
        expect(config.defaultModel).toBeTruthy();
        expect(config.models.length).toBeGreaterThan(0);
        expect(config.baseUrl).toBeTruthy();
        expect(config.models).toContain(config.defaultModel);
      }
    });
  });
});
