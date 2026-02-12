import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  backupBeforeMigration,
  cleanOldBackups,
  getCurrentSchemaVersion,
  getMigrationLog,
  listBackups,
  restoreFromBackup,
  runMigrations,
  setSchemaVersion,
  type BackupData,
} from "@/storage/migrations";

// Chrome API のモック
const mockStorage = new Map<string, any>();

function setupChromeMocks() {
  global.chrome = {
    runtime: {
      lastError: undefined,
    },
    storage: {
      sync: {
        get: vi.fn((keys, callback) => {
          const result: Record<string, any> = {};
          if (
            Array.isArray(keys) &&
            (keys.length === 0 || keys[0] === null || keys[0] === undefined)
          ) {
            // Get all items
            for (const [key, value] of mockStorage.entries()) {
              if (!key.startsWith("backup_") && key !== "schemaVersion" && key !== "migrationLog") {
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
          if (callback) callback();
        }),
      },
      local: {
        get: vi.fn((keys, callback) => {
          const result: Record<string, any> = {};
          if (
            !Array.isArray(keys) ||
            keys.length === 0 ||
            keys[0] === null ||
            keys[0] === undefined
          ) {
            // Get all items
            for (const [key, value] of mockStorage.entries()) {
              result[key] = value;
            }
          } else {
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
          if (callback) callback();
        }),
      },
    },
  } as any;
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

      const backups = await listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(1);
      expect(backups[0].version).toBe(3);
    });
  });

  describe("cleanOldBackups", () => {
    it("should keep only last 3 backups", async () => {
      // Create 5 backups with different timestamps
      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const backup: BackupData = {
          timestamp: baseTime + i * 1000,
          version: i,
          syncData: {},
          localData: {},
        };
        mockStorage.set(`backup_${i}_${backup.timestamp}`, backup);
      }

      await cleanOldBackups();

      const backups = await listBackups();
      expect(backups.length).toBeLessThanOrEqual(3);
    });
  });

  describe("listBackups", () => {
    it("should list all backups sorted by timestamp", async () => {
      const backup1: BackupData = {
        timestamp: 1000,
        version: 1,
        syncData: {},
        localData: {},
      };
      const backup2: BackupData = {
        timestamp: 2000,
        version: 2,
        syncData: {},
        localData: {},
      };

      mockStorage.set("backup_1_1000", backup1);
      mockStorage.set("backup_2_2000", backup2);

      const backups = await listBackups();
      expect(backups).toHaveLength(2);
      expect(backups[0].timestamp).toBe(2000); // newest first
      expect(backups[1].timestamp).toBe(1000);
    });
  });

  describe("restoreFromBackup", () => {
    it("should restore data from backup", async () => {
      const backup: BackupData = {
        timestamp: 1000,
        version: 1,
        syncData: { syncKey: "syncValue" },
        localData: { localKey: "localValue" },
      };

      mockStorage.set("backup_1_1000", backup);

      await restoreFromBackup(1000);

      const version = await getCurrentSchemaVersion();
      expect(version).toBe(1);
      
      // Check if data was restored
      expect(mockStorage.get("syncKey")).toBe("syncValue");
      expect(mockStorage.get("localKey")).toBe("localValue");
    });

    it("should throw error for non-existent backup", async () => {
      await expect(restoreFromBackup(9999)).rejects.toThrow(
        "Backup not found: 9999"
      );
    });
  });

  describe("runMigrations", () => {
    it("should do nothing when no migrations defined", async () => {
      // migrations array is empty by default
      await expect(runMigrations()).resolves.not.toThrow();
    });

    it("should skip completed migrations", async () => {
      // Set current version to 5
      await setSchemaVersion(5);

      await runMigrations();

      // Should complete without error (no migrations to run)
      const version = await getCurrentSchemaVersion();
      expect(version).toBe(5);
    });
  });
});
