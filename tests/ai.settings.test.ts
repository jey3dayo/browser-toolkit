import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import { loadAiSettings, migrateToAiSettings } from "@/ai/settings";
import type { LocalStorageData } from "@/storage/types";

describe("ai/settings", () => {
  describe("loadAiSettings", () => {
    it("loads settings from new keys", () => {
      const storage: LocalStorageData = {
        aiProvider: "anthropic",
        aiApiToken: "sk-test-token",
        aiModel: "claude-sonnet-4-5-20250929",
        aiCustomPrompt: "test prompt",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.provider).toBe("anthropic");
        expect(result.value.token).toBe("sk-test-token");
        expect(result.value.model).toBe("claude-sonnet-4-5-20250929");
        expect(result.value.customPrompt).toBe("test prompt");
        expect(result.value.baseUrl).toBe("https://api.anthropic.com/v1");
      }
    });

    it("falls back to old keys when new keys are missing", () => {
      const storage: LocalStorageData = {
        openaiApiToken: "sk-old-token",
        openaiModel: "gpt-4o-mini",
        openaiCustomPrompt: "old prompt",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.provider).toBe("openai");
        expect(result.value.token).toBe("sk-old-token");
        expect(result.value.model).toBe("gpt-4o-mini");
        expect(result.value.customPrompt).toBe("old prompt");
        expect(result.value.baseUrl).toBe("https://api.openai.com/v1");
      }
    });

    it("prefers new keys over old keys", () => {
      const storage: LocalStorageData = {
        aiApiToken: "sk-new-token",
        openaiApiToken: "sk-old-token",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.token).toBe("sk-new-token");
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

    it("normalizes invalid provider to openai", () => {
      const storage: LocalStorageData = {
        aiProvider: "invalid-provider",
        aiApiToken: "sk-test-token",
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
        aiApiToken: "sk-test-token",
        aiModel: "invalid-model",
      };

      const result = loadAiSettings(storage);
      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        expect(result.value.model).toBe("claude-sonnet-4-5-20250929");
      }
    });
  });

  describe("migrateToAiSettings", () => {
    it("migrates old keys to new keys", async () => {
      const mockStorage = {
        get: async (_keys: string[]) => ({
          openaiApiToken: "sk-old-token",
          openaiModel: "gpt-4o-mini",
          openaiCustomPrompt: "old prompt",
        }),
        set: (items: Record<string, unknown>) => {
          expect(items.aiProvider).toBe("openai");
          expect(items.aiApiToken).toBe("sk-old-token");
          expect(items.aiModel).toBe("gpt-4o-mini");
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
          aiApiToken: "sk-new-token",
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
