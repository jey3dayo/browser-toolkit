/**
 * Storage Migration System
 *
 * ストレージスキーマのバージョン管理とマイグレーション機能を提供します。
 * 拡張機能の更新時に、既存ユーザーのデータを新しいスキーマに自動的に移行します。
 */

import { storageLocalGet, storageLocalSet } from "@/background/storage";

/**
 * マイグレーション定義
 */
export interface Migration {
  /** マイグレーションのバージョン番号（1から開始） */
  version: number;
  /** マイグレーションの説明（ログ出力用） */
  description: string;
  /** データを新しいスキーマに変換する関数 */
  up: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /** ロールバック用の変換関数（オプション） */
  down?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * マイグレーション一覧
 *
 * 新しいマイグレーションは配列の末尾に追加してください。
 * version は連番である必要があります。
 */
export const migrations: Migration[] = [
  // 将来のマイグレーションをここに追加
  // 例:
  // {
  //   version: 1,
  //   description: 'Convert pattern string to patterns array',
  //   async up(data) {
  //     if (data.pattern && typeof data.pattern === 'string') {
  //       data.patterns = [data.pattern];
  //       delete data.pattern;
  //     }
  //     return data;
  //   },
  //   async down(data) {
  //     if (data.patterns && Array.isArray(data.patterns)) {
  //       data.pattern = data.patterns[0];
  //       delete data.patterns;
  //     }
  //     return data;
  //   },
  // },
];

/**
 * マイグレーションログエントリ
 */
export interface MigrationLogEntry {
  version: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * バックアップデータ
 */
export interface BackupData {
  timestamp: number;
  version: string;
  data: Record<string, unknown>;
}

/**
 * バックアップキーのプレフィックス
 */
const BACKUP_KEY_PREFIX = "backup_";

/**
 * マイグレーション前にストレージデータをバックアップ
 * @returns バックアップのタイムスタンプ
 */
export async function backupBeforeMigration(): Promise<number> {
  try {
    // chrome.storage.sync の全データを取得
    const settings = await chrome.storage.sync.get(null);
    const timestamp = Date.now();

    const backup: BackupData = {
      timestamp,
      version: chrome.runtime.getManifest().version,
      data: settings,
    };

    // chrome.storage.local にバックアップを保存
    await storageLocalSet({
      [`${BACKUP_KEY_PREFIX}${timestamp}`]: backup,
    });

    console.log(`Backup created: ${BACKUP_KEY_PREFIX}${timestamp}`);

    // 古いバックアップを削除（最新3つのみ保持）
    await cleanOldBackups(3);

    return timestamp;
  } catch (error) {
    console.error("Failed to create backup:", error);
    throw error;
  }
}

/**
 * 古いバックアップを削除し、最新N件のみ保持
 * @param keepCount - 保持するバックアップの数
 */
export async function cleanOldBackups(keepCount: number): Promise<void> {
  try {
    const allData = await storageLocalGet([]);
    const backupKeys: string[] = [];

    // バックアップキーを抽出
    for (const key of Object.keys(allData)) {
      if (key.startsWith(BACKUP_KEY_PREFIX)) {
        backupKeys.push(key);
      }
    }

    if (backupKeys.length <= keepCount) {
      return; // 削除不要
    }

    // タイムスタンプでソート（新しい順）
    backupKeys.sort((a, b) => {
      const timestampA = Number.parseInt(a.replace(BACKUP_KEY_PREFIX, ""), 10);
      const timestampB = Number.parseInt(b.replace(BACKUP_KEY_PREFIX, ""), 10);
      return timestampB - timestampA;
    });

    // 古いバックアップを削除
    const keysToDelete = backupKeys.slice(keepCount);
    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete);
      console.log(`Cleaned up ${keysToDelete.length} old backups`);
    }
  } catch (error) {
    console.error("Failed to clean old backups:", error);
  }
}

/**
 * すべてのバックアップを取得
 * @returns バックアップデータの配列（新しい順）
 */
export async function listBackups(): Promise<BackupData[]> {
  try {
    const allData = await storageLocalGet([]);
    const backups: BackupData[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(BACKUP_KEY_PREFIX) && typeof value === "object") {
        backups.push(value as BackupData);
      }
    }

    // タイムスタンプでソート（新しい順）
    backups.sort((a, b) => b.timestamp - a.timestamp);

    return backups;
  } catch (error) {
    console.error("Failed to list backups:", error);
    return [];
  }
}

/**
 * バックアップからデータを復元
 * @param timestamp - 復元するバックアップのタイムスタンプ
 */
export async function restoreFromBackup(timestamp: number): Promise<void> {
  try {
    const key = `${BACKUP_KEY_PREFIX}${timestamp}`;
    const result = await storageLocalGet([key]);
    const data = result as Record<string, BackupData>;
    const backup = data[key];

    if (!backup) {
      throw new Error(`Backup not found: ${key}`);
    }

    // chrome.storage.sync にデータを復元
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(backup.data);

    console.log(`Restored backup from ${new Date(timestamp).toISOString()}`);
  } catch (error) {
    console.error("Failed to restore backup:", error);
    throw error;
  }
}

/**
 * 現在のスキーマバージョンを取得
 * @returns 現在のバージョン番号（デフォルト: 0）
 */
export async function getCurrentSchemaVersion(): Promise<number> {
  try {
    const result = await storageLocalGet(["schemaVersion"]);
    const data = result as { schemaVersion?: number };
    return data.schemaVersion ?? 0;
  } catch (error) {
    console.error("Failed to get schema version:", error);
    return 0;
  }
}

/**
 * スキーマバージョンを更新
 * @param version - 新しいバージョン番号
 */
export async function setSchemaVersion(version: number): Promise<void> {
  try {
    await storageLocalSet({ schemaVersion: version });
  } catch (error) {
    console.error("Failed to set schema version:", error);
    throw error;
  }
}

/**
 * マイグレーションログを記録
 * @param entry - ログエントリ
 */
async function logMigration(entry: MigrationLogEntry): Promise<void> {
  try {
    const result = await storageLocalGet(["migrationLog"]);
    const data = result as { migrationLog?: MigrationLogEntry[] };
    const log = data.migrationLog ?? [];
    log.push(entry);

    // 最新100件のみ保持
    const trimmedLog = log.slice(-100);
    await storageLocalSet({ migrationLog: trimmedLog });
  } catch (error) {
    console.error("Failed to log migration:", error);
  }
}

/**
 * すべてのマイグレーションを実行
 *
 * 現在のスキーマバージョンより新しいマイグレーションを順次実行します。
 * この関数は冪等性を持ち、何度実行しても同じ結果になります。
 *
 * @returns 実行されたマイグレーションの数
 */
export async function runMigrations(): Promise<number> {
  const currentVersion = await getCurrentSchemaVersion();
  const latestVersion = migrations.length > 0 ? migrations.at(-1).version : 0;

  if (currentVersion >= latestVersion) {
    console.log(
      `Schema is up to date (v${currentVersion}). No migrations needed.`
    );
    return 0;
  }

  console.log(
    `Starting migrations: v${currentVersion} → v${latestVersion} (${latestVersion - currentVersion} migrations)`
  );

  // マイグレーション前にバックアップを作成
  try {
    await backupBeforeMigration();
  } catch (error) {
    console.error(
      "Failed to create backup before migration. Aborting migrations.",
      error
    );
    throw error;
  }

  let executedCount = 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue; // すでに適用済み
    }

    console.log(
      `Running migration v${migration.version}: ${migration.description}`
    );

    try {
      // chrome.storage.sync の全データを取得
      const syncData = await chrome.storage.sync.get(null);

      // マイグレーションを実行
      const migratedData = await migration.up(syncData);

      // マイグレーション後のデータを保存
      await chrome.storage.sync.set(migratedData);

      // バージョンを更新
      await setSchemaVersion(migration.version);

      // ログ記録
      await logMigration({
        version: migration.version,
        timestamp: Date.now(),
        success: true,
      });

      console.log(`✓ Migration v${migration.version} completed successfully`);
      executedCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`✗ Migration v${migration.version} failed:`, errorMessage);

      // エラーログ記録
      await logMigration({
        version: migration.version,
        timestamp: Date.now(),
        success: false,
        error: errorMessage,
      });

      // マイグレーション失敗時は中断
      throw new Error(
        `Migration v${migration.version} failed: ${errorMessage}`
      );
    }
  }

  console.log(`Migrations completed. Executed ${executedCount} migrations.`);
  return executedCount;
}

/**
 * マイグレーションログを取得
 * @returns マイグレーションログの配列
 */
export async function getMigrationLog(): Promise<MigrationLogEntry[]> {
  try {
    const result = await storageLocalGet(["migrationLog"]);
    const data = result as { migrationLog?: MigrationLogEntry[] };
    return data.migrationLog ?? [];
  } catch (error) {
    console.error("Failed to get migration log:", error);
    return [];
  }
}
