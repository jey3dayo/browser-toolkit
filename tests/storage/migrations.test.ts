import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BackupData,
  backupBeforeMigration,
  cleanOldBackups,
  getCurrentSchemaVersion,
  getMigrationLog,
  runMigrations,
  setSchemaVersion,
} from "@/storage/migrations";

const mockStorage = new Map<string, any>();

function setupChromeMocks() {
  global.chrome = {
    runtime: {
      lastError: undefined,
    },
    storage: {
      local: {
        get: vi.fn((keys, callback) => {
          const result: Record<string, any> = {};
          if (keys === null || keys === undefined) {
            for (const [key, value] of mockStorage.entries()) {
              result[key] = value;
            }
          } else if (Array.isArray(keys)) {
            for (const key of keys) {
              if (mockStorage.has(key)) {
                result[key] = mockStorage.get(key);
              }
            }
          }
          callback(result);
        }),
        set: vi.fn((items, callback) => {
          for (const [key, value] of Object.entries(items)) {
            if (value === undefined) {
              mockStorage.delete(key);
            } else {
              mockStorage.set(key, value);
            }
          }
          if (callback) {
            callback();
          }
        }),
      },
      sync: {
        get: vi.fn((keys, callback) => {
          const result: Record<string, any> = {};
          if (keys === null || keys === undefined) {
            for (const [key, value] of mockStorage.entries()) {
              if (
                !key.startsWith("backup_") &&
                key !== "schemaVersion" &&
                key !== "migrationLog"
              ) {
                result[key] = value;
              }
            }
          } else if (Array.isArray(keys)) {
            for (const key of keys) {
              if (mockStorage.has(key)) {
                result[key] = mockStorage.get(key);
              }
            }
          }
          callback(result);
        }),
        set: vi.fn((items, callback) => {
          for (const [key, value] of Object.entries(items)) {
            if (value === undefined) {
              mockStorage.delete(key);
            } else {
              mockStorage.set(key, value);
            }
          }
          if (callback) {
            callback();
          }
        }),
      },
    },
  } as any;
}

function listStoredBackups(): BackupData[] {
  return [...mockStorage.entries()]
    .filter(([key]) => key.startsWith("backup_"))
    .map(([, value]) => value as BackupData)
    .sort((a, b) => b.timestamp - a.timestamp);
}

describe("Storage Migrations", () => {
  beforeEach(() => {
    mockStorage.clear();
    setupChromeMocks();
    vi.clearAllMocks();
  });

  describe("getCurrentSchemaVersion / setSchemaVersion", () => {
    it("should return 0 for initial version", async () => {
      const version = await getCurrentSchemaVersion();
      expect(version).toBe(0);
    });

    it("should store and retrieve schema version", async () => {
      await setSchemaVersion(5);
      const version = await getCurrentSchemaVersion();
      expect(version).toBe(5);
    });
  });

  describe("getMigrationLog", () => {
    it("should return empty array initially", async () => {
      const log = await getMigrationLog();
      expect(log).toEqual([]);
    });
  });

  describe("backupBeforeMigration", () => {
    it("should create backup with current data", async () => {
      mockStorage.set("testKey", "testValue");
      await setSchemaVersion(3);

      await backupBeforeMigration(3);

      const backups = listStoredBackups();
      expect(backups.length).toBeGreaterThanOrEqual(1);
      expect(backups[0].version).toBe(3);
      expect(backups[0].localData).toMatchObject({ testKey: "testValue" });
    });

    it("should not create an empty snapshot when sync/local data exists", async () => {
      mockStorage.set("searchEngines", [{ id: "builtin:amazon-jp" }]);
      mockStorage.set("openaiApiToken", "sk-test123");

      await backupBeforeMigration(3);

      const backups = listStoredBackups();
      const [backup] = backups;
      expect(backup.localData.searchEngines).toEqual([
        { id: "builtin:amazon-jp" },
      ]);
      expect(backup.localData.openaiApiToken).toBe("sk-test123");
    });
  });

  describe("cleanOldBackups", () => {
    it("should keep only last 3 backups", async () => {
      const baseTime = Date.now();
      for (let i = 0; i < 5; i += 1) {
        const backup: BackupData = {
          localData: {},
          syncData: {},
          timestamp: baseTime + i * 1000,
          version: i,
        };
        mockStorage.set(`backup_${i}_${backup.timestamp}`, backup);
      }

      await cleanOldBackups();

      const backups = listStoredBackups();
      expect(backups).toHaveLength(3);
      expect(backups.map((backup) => backup.version)).toEqual([4, 3, 2]);
    });
  });

  describe("runMigrations", () => {
    it("should complete without error on empty storage", async () => {
      await expect(runMigrations()).resolves.not.toThrow();

      expect(await getCurrentSchemaVersion()).toBeGreaterThan(0);
    });

    it("should skip completed migrations", async () => {
      await setSchemaVersion(5);
      mockStorage.set("openaiModel", "gpt-4");

      await runMigrations();

      const version = await getCurrentSchemaVersion();
      expect(version).toBe(5);
      expect(mockStorage.has("aiModel")).toBe(false);
    });
  });

  describe("Migration v1: AI Settings", () => {
    it("should migrate openaiModel to aiModel", async () => {
      mockStorage.set("openaiModel", "gpt-4");

      await runMigrations();

      expect(mockStorage.get("aiModel")).toBe("gpt-4");
      const version = await getCurrentSchemaVersion();
      expect(version).toBe(4);
    });

    it("should migrate openaiCustomPrompt to aiCustomPrompt", async () => {
      mockStorage.set("openaiCustomPrompt", "Custom prompt");

      await runMigrations();

      expect(mockStorage.get("aiCustomPrompt")).toBe("Custom prompt");
      const version = await getCurrentSchemaVersion();
      expect(version).toBe(4);
    });

    it("should set aiProvider to openai when openaiApiToken exists", async () => {
      mockStorage.set("openaiApiToken", "sk-test123");

      await runMigrations();

      expect(mockStorage.get("aiProvider")).toBe("openai");
      const version = await getCurrentSchemaVersion();
      expect(version).toBe(4);
    });

    it("should not overwrite existing aiModel", async () => {
      mockStorage.set("openaiModel", "gpt-4");
      mockStorage.set("aiModel", "gpt-3.5-turbo");

      await runMigrations();

      expect(mockStorage.get("aiModel")).toBe("gpt-3.5-turbo");
    });

    it("should not overwrite existing aiProvider", async () => {
      mockStorage.set("openaiApiToken", "sk-test123");
      mockStorage.set("aiProvider", "anthropic");

      await runMigrations();

      expect(mockStorage.get("aiProvider")).toBe("anthropic");
    });

    it("should be idempotent (multiple runs produce same result)", async () => {
      mockStorage.set("openaiModel", "gpt-4");
      mockStorage.set("openaiCustomPrompt", "Custom");

      await runMigrations();
      const aiModelAfterFirst = mockStorage.get("aiModel");
      const aiCustomPromptAfterFirst = mockStorage.get("aiCustomPrompt");

      await runMigrations();
      const aiModelAfterSecond = mockStorage.get("aiModel");
      const aiCustomPromptAfterSecond = mockStorage.get("aiCustomPrompt");

      expect(aiModelAfterFirst).toBe(aiModelAfterSecond);
      expect(aiCustomPromptAfterFirst).toBe(aiCustomPromptAfterSecond);
    });

    it("should handle missing old keys gracefully", async () => {
      await expect(runMigrations()).resolves.not.toThrow();

      const version = await getCurrentSchemaVersion();
      expect(version).toBe(4);
    });
  });

  describe("Migration v2: SoundHouse search engine", () => {
    it("adds SoundHouse to existing search engines and shopping group", async () => {
      mockStorage.set("schemaVersion", 1);
      mockStorage.set("searchEngines", [
        {
          enabled: true,
          id: "builtin:amazon-jp",
          name: "Amazon",
          urlTemplate: "https://www.amazon.co.jp/s?k={query}",
        },
      ]);
      mockStorage.set("searchEngineGroups", [
        {
          enabled: true,
          engineIds: ["builtin:amazon-jp"],
          id: "group:shopping-e8c8a7d5",
          name: "お買い物",
        },
      ]);

      await runMigrations();

      expect(mockStorage.get("searchEngines")).toContainEqual({
        enabled: true,
        id: "builtin:soundhouse",
        name: "サウンドハウス",
        urlTemplate:
          "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all={query}",
      });
      expect(mockStorage.get("searchEngineGroups")).toContainEqual({
        enabled: true,
        engineIds: ["builtin:amazon-jp", "builtin:soundhouse"],
        id: "group:shopping-e8c8a7d5",
        name: "お買い物",
      });
      expect(mockStorage.get("schemaVersion")).toBe(4);
    });

    it("does not duplicate SoundHouse in existing settings", async () => {
      mockStorage.set("schemaVersion", 1);
      mockStorage.set("searchEngines", [
        {
          enabled: true,
          id: "builtin:soundhouse",
          name: "サウンドハウス",
          urlTemplate:
            "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all={query}",
        },
      ]);
      mockStorage.set("searchEngineGroups", [
        {
          enabled: true,
          engineIds: ["builtin:soundhouse"],
          id: "group:shopping-e8c8a7d5",
          name: "お買い物",
        },
      ]);

      await runMigrations();

      const engines = mockStorage.get("searchEngines") as Array<{
        id: string;
      }>;
      const groups = mockStorage.get("searchEngineGroups") as Array<{
        engineIds: string[];
        id: string;
      }>;
      const shoppingGroup = groups.find(
        (group) => group.id === "group:shopping-e8c8a7d5"
      );

      expect(
        engines.filter((engine) => engine.id === "builtin:soundhouse")
      ).toHaveLength(1);
      expect(
        shoppingGroup?.engineIds.filter((id) => id === "builtin:soundhouse")
      ).toHaveLength(1);
    });

    it("does not recreate a deleted shopping group", async () => {
      mockStorage.set("schemaVersion", 1);
      mockStorage.set("searchEngines", [
        {
          enabled: true,
          id: "builtin:amazon-jp",
          name: "Amazon",
          urlTemplate: "https://www.amazon.co.jp/s?k={query}",
        },
      ]);
      mockStorage.set("searchEngineGroups", []);

      await runMigrations();

      expect(mockStorage.get("searchEngineGroups")).toEqual([]);
    });
  });

  describe("Migration v3: Yandex search engine", () => {
    it("adds Yandex to existing search engines", async () => {
      mockStorage.set("schemaVersion", 2);
      mockStorage.set("searchEngines", [
        {
          enabled: true,
          id: "builtin:google",
          name: "Google",
          urlTemplate: "https://www.google.com/search?q={query}",
        },
      ]);

      await runMigrations();

      expect(mockStorage.get("searchEngines")).toContainEqual({
        enabled: true,
        id: "builtin:yandex",
        name: "Yandex",
        urlTemplate: "https://yandex.com/search/?text={query}",
      });
      expect(mockStorage.get("schemaVersion")).toBe(4);
    });

    it("does not duplicate Yandex in existing settings", async () => {
      mockStorage.set("schemaVersion", 2);
      mockStorage.set("searchEngines", [
        {
          enabled: true,
          id: "builtin:yandex",
          name: "Yandex",
          urlTemplate: "https://yandex.com/search/?text={query}",
        },
      ]);

      await runMigrations();

      const engines = mockStorage.get("searchEngines") as Array<{
        id: string;
      }>;

      expect(
        engines.filter((engine) => engine.id === "builtin:yandex")
      ).toHaveLength(1);
    });
  });

  describe("Migration v4: flea-market engines and group rework", () => {
    const defaultShoppingGroup = {
      enabled: true,
      engineIds: [
        "builtin:amazon-jp",
        "builtin:rakuten",
        "builtin:kakaku",
        "builtin:biccamera",
        "builtin:yodobashi",
        "builtin:soundhouse",
        "builtin:mercari",
      ],
      id: "group:shopping-e8c8a7d5",
      name: "お買い物",
    };

    it("appends new engines and splits the default shopping group", async () => {
      mockStorage.set("schemaVersion", 3);
      mockStorage.set("searchEngines", [
        {
          enabled: true,
          id: "builtin:mercari",
          name: "メルカリ",
          urlTemplate: "https://jp.mercari.com/search?keyword={query}",
        },
      ]);
      mockStorage.set("searchEngineGroups", [defaultShoppingGroup]);

      await runMigrations();

      const engines = mockStorage.get("searchEngines") as Array<{
        id: string;
      }>;
      const engineIds = engines.map((engine) => engine.id);
      expect(engineIds).toContain("builtin:yahoo-auctions");
      expect(engineIds).toContain("builtin:rakuma");
      expect(engineIds).toContain("builtin:paypay-fleamarket");
      expect(engineIds).toContain("builtin:github");

      const groups = mockStorage.get("searchEngineGroups") as Array<{
        engineIds: string[];
        id: string;
        name: string;
      }>;
      expect(groups.map((group) => group.name)).toEqual([
        "日用品系",
        "徹底比較",
      ]);
      expect(groups[0].engineIds).not.toContain("builtin:mercari");
      expect(groups[1].engineIds).toContain("builtin:rakuma");
      expect(mockStorage.get("schemaVersion")).toBe(4);
    });

    it("leaves a customized shopping group untouched", async () => {
      mockStorage.set("schemaVersion", 3);
      mockStorage.set("searchEngines", []);
      mockStorage.set("searchEngineGroups", [
        {
          ...defaultShoppingGroup,
          engineIds: ["builtin:amazon-jp"],
        },
      ]);

      await runMigrations();

      const groups = mockStorage.get("searchEngineGroups") as Array<{
        id: string;
      }>;
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe("group:shopping-e8c8a7d5");
    });
  });
});
