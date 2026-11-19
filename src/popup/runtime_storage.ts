import { Result } from "@praha/byethrow";
import type { PopupRuntime } from "@/popup/runtime";
import { hasChromeApi, wrapChromeApi } from "@/popup/runtime_chrome";
import type { LocalStorageData, SyncStorageData } from "@/storage/types";

const FALLBACK_STORAGE_PREFIX = "mbu:popup:";
type StorageAreaName = "sync" | "local";
type StorageHandlerParams = {
  area: StorageAreaName;
  isExtensionPage: boolean;
  errorMessage: string;
};

function fallbackStorageGet(
  scope: StorageAreaName,
  keys: string[]
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(
        `${FALLBACK_STORAGE_PREFIX}${scope}:${key}`
      );
    } catch {
      raw = null;
    }
    if (raw === null) {
      continue;
    }
    try {
      data[key] = JSON.parse(raw) as unknown;
    } catch {
      // Keep parity with Chrome Storage: ignore invalid JSON payloads.
    }
  }
  return data;
}

function fallbackStorageSet(
  scope: StorageAreaName,
  items: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(items)) {
    try {
      window.localStorage.setItem(
        `${FALLBACK_STORAGE_PREFIX}${scope}:${key}`,
        JSON.stringify(value)
      );
    } catch {
      // Best-effort fallback: quota/disabled storage can make this throw.
    }
  }
}

function fallbackStorageRemove(
  scope: StorageAreaName,
  keys: string[] | string
): void {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    try {
      window.localStorage.removeItem(
        `${FALLBACK_STORAGE_PREFIX}${scope}:${key}`
      );
    } catch {
      // Best-effort fallback: quota/disabled storage can make this throw.
    }
  }
}
function getStorageArea(area: StorageAreaName): chrome.storage.StorageArea {
  return chrome.storage[area];
}

function createStorageGetter<TData>(
  params: StorageHandlerParams
): (keys: string[]) => Promise<Result.Result<Partial<TData>, string>> {
  return async (keys) => {
    if (!hasChromeApi(params.isExtensionPage, "storage")) {
      return Result.succeed(
        fallbackStorageGet(params.area, keys.map(String)) as Partial<TData>
      ) as Result.Result<Partial<TData>, string>;
    }

    return await wrapChromeApi<Partial<TData>>((resolve, reject) => {
      getStorageArea(params.area).get(keys, (items) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(items as Partial<TData>);
      });
    }, params.errorMessage);
  };
}

function createStorageSetter<TData>(
  params: StorageHandlerParams
): (items: Partial<TData>) => Promise<Result.Result<void, string>> {
  return async (items) => {
    if (!hasChromeApi(params.isExtensionPage, "storage")) {
      fallbackStorageSet(params.area, items as Record<string, unknown>);
      return Result.succeed();
    }

    return await wrapChromeApi<void>((resolve, reject) => {
      getStorageArea(params.area).set(items as Record<string, unknown>, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    }, params.errorMessage);
  };
}

function createStorageRemover(
  params: StorageHandlerParams
): (keys: string[] | string) => Promise<Result.Result<void, string>> {
  return async (keys) => {
    if (!hasChromeApi(params.isExtensionPage, "storage")) {
      fallbackStorageRemove(params.area, keys);
      return Result.succeed();
    }

    return await wrapChromeApi<void>((resolve, reject) => {
      getStorageArea(params.area).remove(keys, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    }, params.errorMessage);
  };
}

export type PopupStorageRuntime = Pick<
  PopupRuntime,
  | "storageSyncGet"
  | "storageSyncSet"
  | "storageLocalGet"
  | "storageLocalSet"
  | "storageLocalRemove"
>;

export function createPopupStorage(
  isExtensionPage: boolean
): PopupStorageRuntime {
  return {
    storageLocalGet: createStorageGetter<LocalStorageData>({
      area: "local",
      errorMessage: "ローカルストレージの読み込みに失敗しました",
      isExtensionPage,
    }),
    storageLocalRemove: createStorageRemover({
      area: "local",
      errorMessage: "ローカルストレージの削除に失敗しました",
      isExtensionPage,
    }),
    storageLocalSet: createStorageSetter<LocalStorageData>({
      area: "local",
      errorMessage: "ローカルストレージの保存に失敗しました",
      isExtensionPage,
    }),
    storageSyncGet: createStorageGetter<SyncStorageData>({
      area: "sync",
      errorMessage: "同期ストレージの読み込みに失敗しました",
      isExtensionPage,
    }),
    storageSyncSet: createStorageSetter<SyncStorageData>({
      area: "sync",
      errorMessage: "同期ストレージの保存に失敗しました",
      isExtensionPage,
    }),
  };
}
