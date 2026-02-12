import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageSyncGet, storageSyncSet } from "@/background/storage";

const FALLBACK_KEYS_MARKER = "__storage_fallback_keys__";
const syncStorage = new Map<string, unknown>();
const localStorage = new Map<string, unknown>();

function readStorage(
  storage: Map<string, unknown>,
  keys: string | string[] | null | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (keys == null || (Array.isArray(keys) && keys.length === 0)) {
    for (const [key, value] of storage.entries()) {
      result[key] = value;
    }
    return result;
  }

  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    if (storage.has(key)) {
      result[key] = storage.get(key);
    }
  }
  return result;
}

function writeStorage(
  storage: Map<string, unknown>,
  items: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(items)) {
    if (value === undefined) {
      storage.delete(key);
      continue;
    }
    storage.set(key, value);
  }
}

function removeStorageKeys(
  storage: Map<string, unknown>,
  keys: string | string[]
): void {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    storage.delete(key);
  }
}

function setupChromeMocks() {
  global.chrome = {
    runtime: {
      lastError: undefined,
      getURL: vi.fn((path: string) => path),
    },
    notifications: {
      create: vi.fn().mockResolvedValue("mock-notification-id"),
    },
    storage: {
      sync: {
        get: vi.fn((keys, callback) => {
          chrome.runtime.lastError = undefined;
          callback(readStorage(syncStorage, keys));
        }),
        set: vi.fn((items, callback) => {
          chrome.runtime.lastError = undefined;
          writeStorage(syncStorage, items);
          callback?.();
        }),
      },
      local: {
        get: vi.fn((keys, callback) => {
          chrome.runtime.lastError = undefined;
          callback(readStorage(localStorage, keys));
        }),
        set: vi.fn((items, callback) => {
          chrome.runtime.lastError = undefined;
          writeStorage(localStorage, items);
          callback?.();
        }),
        remove: vi.fn((keys, callback) => {
          chrome.runtime.lastError = undefined;
          removeStorageKeys(localStorage, keys);
          callback?.();
        }),
      },
    },
  } as any;
}

describe("storage fallback cleanup", () => {
  beforeEach(() => {
    syncStorage.clear();
    localStorage.clear();
    setupChromeMocks();
    vi.clearAllMocks();
  });

  it("should stop shadowing sync values after fallback key is synced again", async () => {
    localStorage.set(FALLBACK_KEYS_MARKER, ["linkFormat"]);
    localStorage.set("linkFormat", "stale-local");
    syncStorage.set("linkFormat", "old-sync");

    await storageSyncSet({ linkFormat: "new-sync" });

    const marker = localStorage.get(FALLBACK_KEYS_MARKER) as
      | string[]
      | undefined;
    expect(marker ?? []).not.toContain("linkFormat");
    expect(localStorage.has("linkFormat")).toBe(false);

    const result = (await storageSyncGet(["linkFormat"])) as Record<
      string,
      unknown
    >;
    expect(result.linkFormat).toBe("new-sync");
  });

  it("should only clear synced keys from fallback marker", async () => {
    localStorage.set(FALLBACK_KEYS_MARKER, ["linkFormat", "calendarTargets"]);
    localStorage.set("linkFormat", "local-link");
    localStorage.set("calendarTargets", [{ name: "fallback-only" }]);

    await storageSyncSet({ linkFormat: "sync-link" });

    expect(localStorage.get(FALLBACK_KEYS_MARKER)).toEqual(["calendarTargets"]);
    expect(localStorage.has("linkFormat")).toBe(false);
    expect(localStorage.get("calendarTargets")).toEqual([
      { name: "fallback-only" },
    ]);
    expect(syncStorage.get("linkFormat")).toBe("sync-link");
  });
});
