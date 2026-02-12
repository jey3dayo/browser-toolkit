import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import { loadAiSettings, migrateToAiSettings } from "@/ai/settings";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "@/constants/models";
import type { LocalStorageData } from "@/storage/types";

describe("ai/settings", () => {
  describe("loadAiSettings", () => {
    it("loads settings from new keys", () => {
      const storage: LocalStorageData = {
        aiProvider: "anthropic",
        anthropicApiToken: "sk-test-token",
        aiModel: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
        aiCustomPrompt: "test prompt",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.provider).toBe("anthropic");
        expect(result.value.token).toBe("sk-test-token");
        expect(result.value.model).toBe(ANTHROPIC_MODELS.CLAUDE_SONNET_4_5);
        expect(result.value.customPrompt).toBe("test prompt");
        expect(result.value.baseUrl).toBe("https://api.anthropic.com/v1");
      }
    });

    it("falls back to old keys when new keys are missing", () => {
      const storage: LocalStorageData = {
        openaiApiToken: "sk-old-token",
        openaiModel: OPENAI_MODELS.GPT_4O_MINI,
        openaiCustomPrompt: "old prompt",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.provider).toBe("openai");
        expect(result.value.token).toBe("sk-old-token");
        expect(result.value.model).toBe(OPENAI_MODELS.GPT_4O_MINI);
        expect(result.value.customPrompt).toBe("old prompt");
        expect(result.value.baseUrl).toBe("https://api.openai.com/v1");
      }
    });

    it("uses provider-specific token key", () => {
      const storage: LocalStorageData = {
        aiProvider: "openai",
        openaiApiToken: "sk-openai-token",
        anthropicApiToken: "sk-anthropic-token",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.token).toBe("sk-openai-token");
      }
    });

    it("fails when no token is provided", () => {
      const storage: LocalStorageData = {};

      const result = loadAiSettings(storage);
      expect(Result.isFailure(result)).toBe(true);

      if (Result.isFailure(result)) {
        expect(result.error).toBe("APIトークンが設定されていません");
      }
    });

    it("trims token before returning settings", () => {
      const storage: LocalStorageData = {
        aiProvider: "openai",
        openaiApiToken: "  sk-test-token\n",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.token).toBe("sk-test-token");
      }
    });

    it("fails when token is whitespace only", () => {
      const storage: LocalStorageData = {
        aiProvider: "openai",
        openaiApiToken: "   \n\t",
      };

      const result = loadAiSettings(storage);
      expect(Result.isFailure(result)).toBe(true);

      if (Result.isFailure(result)) {
        expect(result.error).toBe("APIトークンが設定されていません");
      }
    });

    it("normalizes invalid provider to openai", () => {
      const storage: LocalStorageData = {
        aiProvider: "invalid-provider",
        openaiApiToken: "sk-test-token",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.provider).toBe("openai");
      }
    });

    it("normalizes invalid model to provider default", () => {
      const storage: LocalStorageData = {
        aiProvider: "anthropic",
        anthropicApiToken: "sk-test-token",
        aiModel: "invalid-model",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.model).toBe(ANTHROPIC_MODELS.CLAUDE_SONNET_4_5);
      }
    });
  });

  describe("migrateToAiSettings", () => {
    it("migrates old keys to new keys", async () => {
      const mockStorage = {
        get: async (_keys: string[]) => ({
          openaiApiToken: "sk-old-token",
          openaiModel: OPENAI_MODELS.GPT_4O_MINI,
          openaiCustomPrompt: "old prompt",
        }),
        set: (items: Record<string, unknown>) => {
          expect(items.aiProvider).toBe("openai");
          // openaiApiTokenはそのまま維持（プロバイダー別キー）
          expect(items.aiModel).toBe(OPENAI_MODELS.GPT_4O_MINI);
          expect(items.aiCustomPrompt).toBe("old prompt");
          return Promise.resolve();
        },
      } as chrome.storage.LocalStorageArea;

      await migrateToAiSettings(mockStorage);
    });

    it("does not migrate if new keys already exist", async () => {
      let setCalled = false;
      const mockStorage = {
        get: async (_keys: string[]) => ({
          aiProvider: "anthropic",
          anthropicApiToken: "sk-new-token",
          openaiApiToken: "sk-old-token",
        }),
        set: (_items: Record<string, unknown>) => {
          setCalled = true;
          return Promise.resolve();
        },
      } as chrome.storage.LocalStorageArea;

      await migrateToAiSettings(mockStorage);
      expect(setCalled).toBe(false);
    });

    it("does not migrate if no old keys exist", async () => {
      let setCalled = false;
      const mockStorage = {
        get: async (_keys: string[]) => ({}),
        set: (_items: Record<string, unknown>) => {
          setCalled = true;
          return Promise.resolve();
        },
      } as chrome.storage.LocalStorageArea;

      await migrateToAiSettings(mockStorage);
      expect(setCalled).toBe(false);
    });
  });
});
