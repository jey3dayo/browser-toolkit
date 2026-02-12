import {
  isReservedStorageKey,
  STORAGE_RESERVED_KEYS,
  storageLocalGet,
  storageLocalSet,
  storageSyncGet,
  storageSyncSet,
} from "@/background/storage";
import type { LocalStorageData } from "@/storage/types";

/**
 * Migration function interface
 */
export interface Migration {
  version: number;
  description: string;
  migrate: () => Promise<void>;
}

/**
 * All migrations in order
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: "Migrate legacy OpenAI settings to unified AI settings",
    migrate: async () => {
      const data = (await storageLocalGet([
        "aiProvider",
        "aiModel",
        "aiCustomPrompt",
        "openaiApiToken",
        "openaiModel",
        "openaiCustomPrompt",
      ])) as Record<string, unknown>;

      const updates: Partial<LocalStorageData> = {};

      // Migrate openaiModel to aiModel (if aiModel doesn't exist)
      if (typeof data.openaiModel === "string" && !data.aiModel) {
        updates.aiModel = data.openaiModel;
      }

      // Migrate openaiCustomPrompt to aiCustomPrompt (if aiCustomPrompt doesn't exist)
      if (typeof data.openaiCustomPrompt === "string" && !data.aiCustomPrompt) {
        updates.aiCustomPrompt = data.openaiCustomPrompt;
      }

      // Set aiProvider to "openai" if openaiApiToken exists and aiProvider doesn't exist
      if (typeof data.openaiApiToken === "string" && !data.aiProvider) {
        updates.aiProvider = "openai";
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await storageLocalSet(updates);
        console.log("[migration v1] AI settings migrated:", updates);
      }
    },
  },
];

/**
 * Migration log entry
 */
export interface MigrationLogEntry {
  version: number;
  timestamp: number;
  description: string;
  success: boolean;
  error?: string;
}

/**
 * Backup data structure
 */
export interface BackupData {
  timestamp: number;
  version: number;
  syncData: Record<string, unknown>;
  localData: Record<string, unknown>;
}

const SCHEMA_VERSION_KEY = STORAGE_RESERVED_KEYS.SCHEMA_VERSION;
const MIGRATION_LOG_KEY = STORAGE_RESERVED_KEYS.MIGRATION_LOG;
const BACKUP_KEY_PREFIX = STORAGE_RESERVED_KEYS.BACKUP_PREFIX;

/**
 * Get current schema version
 */
export async function getCurrentSchemaVersion(): Promise<number> {
  const data = (await storageLocalGet([SCHEMA_VERSION_KEY])) as Record<
    string,
    unknown
  >;
  return (data[SCHEMA_VERSION_KEY] as number) ?? 0;
}

/**
 * Set schema version
 */
export async function setSchemaVersion(version: number): Promise<void> {
  await storageLocalSet({ [SCHEMA_VERSION_KEY]: version });
}

/**
 * Log migration execution
 */
export async function logMigration(entry: MigrationLogEntry): Promise<void> {
  const data = (await storageLocalGet([MIGRATION_LOG_KEY])) as Record<
    string,
    unknown
  >;
  const log = (data[MIGRATION_LOG_KEY] as MigrationLogEntry[]) ?? [];
  log.push(entry);
  await storageLocalSet({ [MIGRATION_LOG_KEY]: log });
}

/**
 * Get migration log
 */
export async function getMigrationLog(): Promise<MigrationLogEntry[]> {
  const data = (await storageLocalGet([MIGRATION_LOG_KEY])) as Record<
    string,
    unknown
  >;
  return (data[MIGRATION_LOG_KEY] as MigrationLogEntry[]) ?? [];
}

/**
 * Backup storage data before migration
 */
export async function backupBeforeMigration(version: number): Promise<void> {
  try {
    // Get all sync and local storage data
    const syncData = await storageSyncGet([]);
    const localData = await storageLocalGet([]);

    const backup: BackupData = {
      timestamp: Date.now(),
      version,
      syncData: syncData as Record<string, unknown>,
      localData: localData as Record<string, unknown>,
    };

    const backupKey = `${BACKUP_KEY_PREFIX}${version}_${backup.timestamp}`;
    await storageLocalSet({ [backupKey]: backup });

    // Clean old backups (keep only last 3)
    await cleanOldBackups();
  } catch (error) {
    console.error("[migrations] Backup failed:", error);
    throw new Error(
      `Backup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clean old backups (keep only last 3)
 */
export async function cleanOldBackups(): Promise<void> {
  const allData = await storageLocalGet([]);
  const backupKeys = Object.keys(allData as Record<string, unknown>)
    .filter((key) => key.startsWith(BACKUP_KEY_PREFIX))
    .sort()
    .reverse();

  // Keep only last 3 backups
  const keysToRemove = backupKeys.slice(3);
  if (keysToRemove.length > 0) {
    const removeObj = Object.fromEntries(
      keysToRemove.map((key) => [key, undefined])
    );
    await storageLocalSet(removeObj);
  }
}

/**
 * List all backups
 */
export async function listBackups(): Promise<BackupData[]> {
  const allData = await storageLocalGet([]);
  const backupEntries = Object.entries(allData as Record<string, unknown>)
    .filter(([key]) => key.startsWith(BACKUP_KEY_PREFIX))
    .map(([, value]) => value as BackupData)
    .sort((a, b) => b.timestamp - a.timestamp);

  return backupEntries;
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(timestamp: number): Promise<void> {
  const backups = await listBackups();
  const backup = backups.find((b) => b.timestamp === timestamp);

  if (!backup) {
    throw new Error(`Backup not found: ${timestamp}`);
  }

  try {
    // Get current data to identify keys to remove
    const currentSyncData = (await storageSyncGet([])) as Record<
      string,
      unknown
    >;
    const currentLocalData = (await storageLocalGet([])) as Record<
      string,
      unknown
    >;

    // Clear keys that don't exist in backup (except reserved keys)
    const syncKeysToRemove = Object.keys(currentSyncData).filter(
      (key) => !(key in backup.syncData)
    );
    const localKeysToRemove = Object.keys(currentLocalData).filter(
      (key) => !(key in backup.localData || isReservedStorageKey(key))
    );

    // Remove keys not in backup
    if (syncKeysToRemove.length > 0) {
      const removeSync = Object.fromEntries(
        syncKeysToRemove.map((key) => [key, undefined])
      );
      await storageSyncSet(removeSync);
    }

    if (localKeysToRemove.length > 0) {
      const removeLocal = Object.fromEntries(
        localKeysToRemove.map((key) => [key, undefined])
      );
      await storageLocalSet(removeLocal);
    }

    // Restore sync data
    if (backup.syncData && Object.keys(backup.syncData).length > 0) {
      await storageSyncSet(backup.syncData);
    }

    // Restore local data (excluding reserved keys)
    const localDataToRestore = Object.fromEntries(
      Object.entries(backup.localData).filter(
        ([key]) => !isReservedStorageKey(key)
      )
    );

    if (Object.keys(localDataToRestore).length > 0) {
      await storageLocalSet(localDataToRestore);
    }

    // Update schema version to backup version
    await setSchemaVersion(backup.version);

    console.log(`[migrations] Restored from backup: ${timestamp}`);
  } catch (error) {
    console.error("[migrations] Restore failed:", error);
    throw new Error(
      `Restore failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  if (migrations.length === 0) {
    console.log("[migrations] No migrations defined");
    return;
  }

  const currentVersion = await getCurrentSchemaVersion();
  const targetVersion = migrations.at(-1)?.version ?? 0;

  if (currentVersion >= targetVersion) {
    console.log(`[migrations] Already at latest version: ${currentVersion}`);
    return;
  }

  console.log(
    `[migrations] Running migrations from v${currentVersion} to v${targetVersion}`
  );

  // Backup before migration
  await backupBeforeMigration(currentVersion);

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    console.log(
      `[migrations] Running migration v${migration.version}: ${migration.description}`
    );

    const entry: MigrationLogEntry = {
      version: migration.version,
      timestamp: Date.now(),
      description: migration.description,
      success: false,
    };

    try {
      await migration.migrate();
      await setSchemaVersion(migration.version);
      entry.success = true;
      console.log(`[migrations] Migration v${migration.version} completed`);
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      console.error(
        `[migrations] Migration v${migration.version} failed:`,
        error
      );
      await logMigration(entry);
      throw new Error(`Migration v${migration.version} failed: ${entry.error}`);
    }

    await logMigration(entry);
  }

  console.log(
    `[migrations] All migrations completed. Current version: ${targetVersion}`
  );
}
