import { describe, expect, it } from "vitest";
import {
  ANTHROPIC_MODELS,
  LEGACY_OPENAI_MODEL_MAP,
  OPENAI_MODELS,
  ZAI_MODELS,
} from "@/constants/models";
import { safeParseOpenAiModel } from "@/schemas/openai";
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
      expect(normalizeAiModel("openai", OPENAI_MODELS.GPT_5_6_TERRA)).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("openai", OPENAI_MODELS.GPT_5_6_LUNA)).toBe(
        OPENAI_MODELS.GPT_5_6_LUNA
      );
      expect(
        normalizeAiModel("anthropic", ANTHROPIC_MODELS.CLAUDE_SONNET_5)
      ).toBe(ANTHROPIC_MODELS.CLAUDE_SONNET_5);
      expect(normalizeAiModel("zai", ZAI_MODELS.GLM_4_7)).toBe(
        ZAI_MODELS.GLM_4_7
      );
    });

    it("returns the default model if value is undefined", () => {
      expect(normalizeAiModel("openai", undefined)).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("anthropic", undefined)).toBe(
        ANTHROPIC_MODELS.CLAUDE_SONNET_5
      );
      expect(normalizeAiModel("zai", undefined)).toBe(ZAI_MODELS.GLM_4_7);
    });

    it("returns the default model if value is invalid for the provider", () => {
      expect(normalizeAiModel("openai", "invalid-model")).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("anthropic", "gpt-4")).toBe(
        ANTHROPIC_MODELS.CLAUDE_SONNET_5
      );
      expect(normalizeAiModel("zai", "gpt-4")).toBe(ZAI_MODELS.GLM_4_7);
    });

    it("maps deprecated openai model ids to supported ones", () => {
      expect(normalizeAiModel("openai", "gpt-5.1")).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("openai", "gpt-5.4")).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("openai", "gpt-5.4-2026-03-05")).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("openai", "gpt-5.2-chat-latest")).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
      expect(normalizeAiModel("openai", "gpt-4o")).toBe(
        OPENAI_MODELS.GPT_5_6_TERRA
      );
    });
  });

  describe("legacy OpenAI model aliases", () => {
    // 読み替え表は src/constants/models.ts が単一の正本。
    // strict パース経路と fallback 経路が同じ表を参照していることを固定する。
    it("resolves every legacy alias identically through both entry points", () => {
      for (const [legacyId, expected] of Object.entries(
        LEGACY_OPENAI_MODEL_MAP
      )) {
        const parsed = safeParseOpenAiModel(legacyId);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.output).toBe(expected);
        }
        expect(normalizeAiModel("openai", legacyId)).toBe(expected);
      }
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

  describe("anthropic provider config", () => {
    // 設定画面に出る選択肢と default は利用者向けの契約なので固定する。
    // モデル世代を更新するときは、この期待値も同じ差分で更新すること。
    it("offers the current Claude generation", () => {
      expect(PROVIDER_CONFIGS.anthropic.models).toEqual([
        "claude-opus-5",
        "claude-sonnet-5",
        "claude-haiku-4-5",
      ]);
    });

    it("defaults to claude-sonnet-5", () => {
      expect(PROVIDER_CONFIGS.anthropic.defaultModel).toBe("claude-sonnet-5");
    });

    it("migrates a stored previous-generation model to the default", () => {
      expect(normalizeAiModel("anthropic", "claude-sonnet-4-5-20250929")).toBe(
        "claude-sonnet-5"
      );
      expect(normalizeAiModel("anthropic", "claude-opus-4-6")).toBe(
        "claude-sonnet-5"
      );
    });
  });
});
