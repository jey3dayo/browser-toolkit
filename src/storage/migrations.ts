import {
  STORAGE_RESERVED_KEYS,
  storageLocalGet,
  storageLocalSet,
  storageSyncGet,
  storageSyncSet,
} from "@/background/storage";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  normalizeSearchEngineGroups,
  SEARCH_ENGINE_GROUP_IDS,
  type SearchEngineGroup,
} from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";
import {
  BUILTIN_SEARCH_ENGINE_IDS,
  DEFAULT_SEARCH_ENGINES,
  MAX_SEARCH_ENGINES,
  normalizeSearchEngines,
  YANDEX_SEARCH_ENGINE,
} from "@/search_engines";
import type { LocalStorageData } from "@/storage/types";
import { runSequentially } from "@/utils/async";

interface Migration {
  description: string;
  migrate: () => Promise<void>;
  version: number;
}

const SOUNDHOUSE_SEARCH_ENGINE_V2: SearchEngine = {
  enabled: true,
  id: BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE,
  name: "サウンドハウス",
  urlTemplate:
    "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all={query}",
};

function appendSoundHouseSearchEngine(
  searchEngines: SearchEngine[]
): SearchEngine[] {
  if (
    searchEngines.some(
      (engine) => engine.id === BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE
    )
  ) {
    return searchEngines;
  }
  return [...searchEngines, { ...SOUNDHOUSE_SEARCH_ENGINE_V2 }];
}

function appendYandexSearchEngine(
  searchEngines: SearchEngine[]
): SearchEngine[] {
  if (
    searchEngines.some(
      (engine) => engine.id === BUILTIN_SEARCH_ENGINE_IDS.YANDEX
    )
  ) {
    return searchEngines;
  }
  return [...searchEngines, { ...YANDEX_SEARCH_ENGINE }];
}

function appendSoundHouseToShoppingGroup(
  searchEngineGroups: SearchEngineGroup[]
): SearchEngineGroup[] {
  return searchEngineGroups.map((group) => {
    if (
      group.id !== SEARCH_ENGINE_GROUP_IDS.SHOPPING ||
      group.engineIds.includes(BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE)
    ) {
      return group;
    }
    return {
      ...group,
      engineIds: [...group.engineIds, BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE],
    };
  });
}

const SEARCH_ENGINE_IDS_ADDED_IN_V4: string[] = [
  BUILTIN_SEARCH_ENGINE_IDS.GITHUB,
  BUILTIN_SEARCH_ENGINE_IDS.GOOGLE_MAPS,
  BUILTIN_SEARCH_ENGINE_IDS.KAKAKU,
  BUILTIN_SEARCH_ENGINE_IDS.YAHOO_AUCTIONS,
  BUILTIN_SEARCH_ENGINE_IDS.RAKUMA,
  BUILTIN_SEARCH_ENGINE_IDS.PAYPAY_FLEAMARKET,
];

const SEARCH_ENGINES_ADDED_IN_V4: SearchEngine[] =
  DEFAULT_SEARCH_ENGINES.filter((engine) =>
    SEARCH_ENGINE_IDS_ADDED_IN_V4.includes(engine.id)
  );

function appendSearchEnginesAddedInV4(
  searchEngines: SearchEngine[]
): SearchEngine[] {
  const existingIds = new Set(searchEngines.map((engine) => engine.id));
  const missing = SEARCH_ENGINES_ADDED_IN_V4.filter(
    (engine) => !existingIds.has(engine.id)
  );
  const capacity = MAX_SEARCH_ENGINES - searchEngines.length;
  if (missing.length === 0 || capacity <= 0) {
    return searchEngines;
  }
  return [...searchEngines, ...missing.slice(0, capacity)];
}

const DEFAULT_SHOPPING_GROUP_ENGINE_IDS: string[] = [
  BUILTIN_SEARCH_ENGINE_IDS.AMAZON_JP,
  BUILTIN_SEARCH_ENGINE_IDS.RAKUTEN,
  BUILTIN_SEARCH_ENGINE_IDS.KAKAKU,
  BUILTIN_SEARCH_ENGINE_IDS.BICCAMERA,
  BUILTIN_SEARCH_ENGINE_IDS.YODOBASHI,
  BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE,
  BUILTIN_SEARCH_ENGINE_IDS.MERCARI,
];

function reworkDefaultShoppingGroup(
  searchEngineGroups: SearchEngineGroup[]
): SearchEngineGroup[] {
  const index = searchEngineGroups.findIndex(
    (group) => group.id === SEARCH_ENGINE_GROUP_IDS.SHOPPING
  );
  const shoppingGroup = searchEngineGroups[index];
  if (!shoppingGroup) {
    return searchEngineGroups;
  }

  const isDefaultMembership =
    shoppingGroup.engineIds.length ===
      DEFAULT_SHOPPING_GROUP_ENGINE_IDS.length &&
    DEFAULT_SHOPPING_GROUP_ENGINE_IDS.every((id) =>
      shoppingGroup.engineIds.includes(id)
    );
  if (!isDefaultMembership) {
    return searchEngineGroups;
  }

  const replacements = DEFAULT_SEARCH_ENGINE_GROUPS.filter(
    (group) =>
      group.id === SEARCH_ENGINE_GROUP_IDS.DAILY_NEEDS ||
      group.id === SEARCH_ENGINE_GROUP_IDS.DEEP_COMPARISON
  ).map((group) => ({ ...group, enabled: shoppingGroup.enabled }));

  return [
    ...searchEngineGroups.slice(0, index),
    ...replacements,
    ...searchEngineGroups.slice(index + 1),
  ];
}

const migrations: Migration[] = [
  {
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

      if (typeof data.openaiModel === "string" && !data.aiModel) {
        updates.aiModel = data.openaiModel;
      }

      if (typeof data.openaiCustomPrompt === "string" && !data.aiCustomPrompt) {
        updates.aiCustomPrompt = data.openaiCustomPrompt;
      }

      if (typeof data.openaiApiToken === "string" && !data.aiProvider) {
        updates.aiProvider = "openai";
      }

      if (Object.keys(updates).length > 0) {
        await storageLocalSet(updates);
        console.log("[migration v1] AI settings migrated:", updates);
      }
    },
    version: 1,
  },
  {
    description: "Add SoundHouse to default search settings",
    migrate: async () => {
      const data = (await storageSyncGet([
        "searchEngines",
        "searchEngineGroups",
      ])) as Record<string, unknown>;

      const updates: {
        searchEngineGroups?: SearchEngineGroup[];
        searchEngines?: SearchEngine[];
      } = {};

      if (Array.isArray(data.searchEngines)) {
        const searchEngines = normalizeSearchEngines(data.searchEngines);
        const nextSearchEngines = appendSoundHouseSearchEngine(searchEngines);
        if (nextSearchEngines.length !== searchEngines.length) {
          updates.searchEngines = nextSearchEngines;
        }
      }

      if (Array.isArray(data.searchEngineGroups)) {
        const searchEngineGroups = normalizeSearchEngineGroups(
          data.searchEngineGroups
        );
        const shoppingGroup = searchEngineGroups.find(
          (group) => group.id === SEARCH_ENGINE_GROUP_IDS.SHOPPING
        );
        if (
          shoppingGroup &&
          !shoppingGroup.engineIds.includes(
            BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE
          )
        ) {
          updates.searchEngineGroups =
            appendSoundHouseToShoppingGroup(searchEngineGroups);
        }
      }

      if (Object.keys(updates).length > 0) {
        await storageSyncSet(updates);
        console.log("[migration v2] SoundHouse search settings migrated");
      }
    },
    version: 2,
  },
  {
    description: "Add Yandex to default search settings",
    migrate: async () => {
      const data = (await storageSyncGet(["searchEngines"])) as Record<
        string,
        unknown
      >;

      if (Array.isArray(data.searchEngines)) {
        const searchEngines = normalizeSearchEngines(data.searchEngines);
        const nextSearchEngines = appendYandexSearchEngine(searchEngines);
        if (nextSearchEngines.length !== searchEngines.length) {
          await storageSyncSet({ searchEngines: nextSearchEngines });
          console.log("[migration v3] Yandex search settings migrated");
        }
      }
    },
    version: 3,
  },
  {
    description:
      "Add flea-market search engines and split the default shopping group",
    migrate: async () => {
      const data = (await storageSyncGet([
        "searchEngines",
        "searchEngineGroups",
      ])) as Record<string, unknown>;

      const updates: {
        searchEngineGroups?: SearchEngineGroup[];
        searchEngines?: SearchEngine[];
      } = {};

      if (Array.isArray(data.searchEngines)) {
        const searchEngines = normalizeSearchEngines(data.searchEngines);
        const nextSearchEngines = appendSearchEnginesAddedInV4(searchEngines);
        if (nextSearchEngines.length !== searchEngines.length) {
          updates.searchEngines = nextSearchEngines;
        }
      }

      if (Array.isArray(data.searchEngineGroups)) {
        const searchEngineGroups = normalizeSearchEngineGroups(
          data.searchEngineGroups
        );
        const nextSearchEngineGroups =
          reworkDefaultShoppingGroup(searchEngineGroups);
        if (nextSearchEngineGroups !== searchEngineGroups) {
          updates.searchEngineGroups = nextSearchEngineGroups;
        }
      }

      if (Object.keys(updates).length > 0) {
        await storageSyncSet(updates);
        console.log("[migration v4] Search settings migrated");
      }
    },
    version: 4,
  },
];

interface MigrationLogEntry {
  description: string;
  error?: string;
  success: boolean;
  timestamp: number;
  version: number;
}

export interface BackupData {
  localData: Record<string, unknown>;
  syncData: Record<string, unknown>;
  timestamp: number;
  version: number;
}

const SCHEMA_VERSION_KEY = STORAGE_RESERVED_KEYS.SCHEMA_VERSION;
const MIGRATION_LOG_KEY = STORAGE_RESERVED_KEYS.MIGRATION_LOG;
const BACKUP_KEY_PREFIX = STORAGE_RESERVED_KEYS.BACKUP_PREFIX;
const MAX_BACKUPS = 3;

export async function getCurrentSchemaVersion(): Promise<number> {
  const data = (await storageLocalGet([SCHEMA_VERSION_KEY])) as Record<
    string,
    unknown
  >;
  return (data[SCHEMA_VERSION_KEY] as number | undefined) ?? 0;
}

export async function setSchemaVersion(version: number): Promise<void> {
  await storageLocalSet({ [SCHEMA_VERSION_KEY]: version });
}

async function logMigration(entry: MigrationLogEntry): Promise<void> {
  const data = (await storageLocalGet([MIGRATION_LOG_KEY])) as Record<
    string,
    unknown
  >;
  const log =
    (data[MIGRATION_LOG_KEY] as MigrationLogEntry[] | undefined) ?? [];
  log.push(entry);
  await storageLocalSet({ [MIGRATION_LOG_KEY]: log });
}

export async function getMigrationLog(): Promise<MigrationLogEntry[]> {
  const data = (await storageLocalGet([MIGRATION_LOG_KEY])) as Record<
    string,
    unknown
  >;
  return (data[MIGRATION_LOG_KEY] as MigrationLogEntry[] | undefined) ?? [];
}

export async function backupBeforeMigration(version: number): Promise<void> {
  try {
    const syncData = await storageSyncGet(null);
    const localData = await storageLocalGet(null);

    const backup: BackupData = {
      localData: localData as Record<string, unknown>,
      syncData: syncData as Record<string, unknown>,
      timestamp: Date.now(),
      version,
    };

    const backupKey = `${BACKUP_KEY_PREFIX}${version}_${backup.timestamp}`;
    await storageLocalSet({ [backupKey]: backup });

    await cleanOldBackups();
  } catch (error) {
    console.error("[migrations] Backup failed:", error);
    throw new Error(
      `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

export async function cleanOldBackups(): Promise<void> {
  const allData = await storageLocalGet(null);
  const backupKeys = Object.keys(allData as Record<string, unknown>)
    .filter((key) => key.startsWith(BACKUP_KEY_PREFIX))
    .sort()
    .reverse();

  const keysToRemove = backupKeys.slice(MAX_BACKUPS);
  if (keysToRemove.length > 0) {
    const removeObj = Object.fromEntries(
      keysToRemove.map((key) => [key, undefined])
    );
    await storageLocalSet(removeObj);
  }
}

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

  await backupBeforeMigration(currentVersion);

  const runMigration = async (migration: Migration): Promise<void> => {
    console.log(
      `[migrations] Running migration v${migration.version}: ${migration.description}`
    );

    const entry: MigrationLogEntry = {
      description: migration.description,
      success: false,
      timestamp: Date.now(),
      version: migration.version,
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
      throw new Error(
        `Migration v${migration.version} failed: ${entry.error}`,
        {
          cause: error,
        }
      );
    }

    await logMigration(entry);
  };

  await runSequentially(
    migrations.filter((migration) => migration.version > currentVersion),
    runMigration
  );

  console.log(
    `[migrations] All migrations completed. Current version: ${targetVersion}`
  );
}
