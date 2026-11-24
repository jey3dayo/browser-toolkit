import { t } from "@/i18n";
import type { LocalStorageData } from "@/storage/types";

/**
 * Chrome Storage Sync のクォータ制限
 * @see https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync-QUOTA_BYTES_PER_ITEM
 */
export const QUOTA_BYTES_PER_ITEM = 8192;

type QuotaCheckResult =
  | { ok: true }
  | { ok: false; sizeBytes: number; key: string };

export function checkStorageQuota(
  items: Record<string, unknown>
): QuotaCheckResult {
  for (const [key, value] of Object.entries(items)) {
    const jsonStr = JSON.stringify(value);
    const sizeBytes = new Blob([jsonStr]).size;

    if (sizeBytes > QUOTA_BYTES_PER_ITEM) {
      return { key, ok: false, sizeBytes };
    }
  }
  return { ok: true };
}

function createStorageWrapper<TArgs extends unknown[], TResult>(
  operation: (
    resolve: (value: TResult) => void,
    reject: (reason: Error) => void,
    ...args: TArgs
  ) => void
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) =>
    new Promise((resolve, reject) => {
      operation(resolve, reject, ...args);
    });
}

export const STORAGE_RESERVED_KEYS = {
  BACKUP_PREFIX: "backup_",
  FALLBACK_KEYS_MARKER: "__storage_fallback_keys__",
  MIGRATION_LOG: "migrationLog",
  SCHEMA_VERSION: "schemaVersion",
} as const;

function clearFallbackStateForKeys(
  keys: string[],
  resolve: () => void,
  reject: (reason: Error) => void
): void {
  withFallbackKeys(reject, (fallbackKeys, markerKey) => {
    const fallbackKeySet = new Set(fallbackKeys);
    const keysToClear = keys.filter((key) => fallbackKeySet.has(key));

    if (keysToClear.length === 0) {
      resolve();
      return;
    }

    const keysToClearSet = new Set(keysToClear);
    const newFallbackKeys = fallbackKeys.filter(
      (key) => !keysToClearSet.has(key)
    );

    chrome.storage.local.remove(keysToClear, () => {
      const removeErr = chrome.runtime.lastError;
      if (removeErr) {
        reject(new Error(removeErr.message));
        return;
      }

      if (newFallbackKeys.length === 0) {
        chrome.storage.local.remove(markerKey, () => {
          const markerRemoveErr = chrome.runtime.lastError;
          if (markerRemoveErr) {
            reject(new Error(markerRemoveErr.message));
            return;
          }
          resolve();
        });
        return;
      }

      chrome.storage.local.set(
        {
          [markerKey]: newFallbackKeys,
        },
        () => {
          const setErr = chrome.runtime.lastError;
          if (setErr) {
            reject(new Error(setErr.message));
            return;
          }
          resolve();
        }
      );
    });
  });
}

function persistFallbackItems(
  items: Record<string, unknown>,
  resolve: () => void,
  reject: (reason: Error) => void
): void {
  withFallbackKeys(reject, (fallbackKeys, markerKey) => {
    const newFallbackKeys = [
      ...new Set([...fallbackKeys, ...Object.keys(items)]),
    ];

    chrome.storage.local.set(
      {
        ...items,
        [markerKey]: newFallbackKeys,
      },
      () => {
        const localErr = chrome.runtime.lastError;
        if (localErr) {
          reject(new Error(localErr.message));
          return;
        }
        resolve();
      }
    );
  });
}

function withFallbackKeys(
  reject: (reason: Error) => void,
  onSuccess: (fallbackKeys: string[], markerKey: string) => void
): void {
  const markerKey = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;

  chrome.storage.local.get([markerKey], (markerData) => {
    const markerErr = chrome.runtime.lastError;
    if (markerErr) {
      reject(new Error(markerErr.message));
      return;
    }

    const fallbackKeys = (markerData[markerKey] as string[] | undefined) ?? [];
    onSuccess(fallbackKeys, markerKey);
  });
}

export const storageSyncGet = createStorageWrapper<[string[] | null], unknown>(
  (resolve, reject, keys) => {
    chrome.storage.sync.get(keys, (syncItems) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      const markerKey = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;
      chrome.storage.local.get([markerKey], (markerData) => {
        const markerErr = chrome.runtime.lastError;
        if (markerErr) {
          console.error(
            "[storageSyncGet] Failed to load fallback marker:",
            markerErr
          );
          resolve(syncItems);
          return;
        }

        const fallbackKeys =
          (markerData[markerKey] as string[] | undefined) ?? [];
        const fallbackKeySet = new Set(fallbackKeys);
        const keysInLocal =
          keys === null
            ? fallbackKeys
            : keys.filter((key) => fallbackKeySet.has(key));

        if (keysInLocal.length === 0) {
          resolve(syncItems);
          return;
        }

        chrome.storage.local.get(keysInLocal, (localItems) => {
          const localErr = chrome.runtime.lastError;
          if (localErr) {
            reject(new Error(localErr.message));
            return;
          }

          resolve({ ...syncItems, ...localItems });
        });
      });
    });
  }
);

export const storageSyncSet = createStorageWrapper<
  [Record<string, unknown>],
  void
>((resolve, reject, items) => {
  const quotaCheck = checkStorageQuota(items);
  if (!quotaCheck.ok) {
    console.warn(
      `Storage quota exceeded for key '${quotaCheck.key}' (${quotaCheck.sizeBytes} bytes). Falling back to local storage.`
    );

    chrome.notifications
      .create({
        iconUrl: chrome.runtime.getURL("images/icon48.png"),
        message: t("background.storage.quotaMessage", {
          key: quotaCheck.key,
          sizeKB: Math.round(quotaCheck.sizeBytes / 1024),
        }),
        priority: 2,
        title: t("background.storage.quotaTitle"),
        type: "basic",
      })
      .catch((err) => {
        console.error("Failed to create notification:", err);
      });

    persistFallbackItems(items, resolve, reject);
    return;
  }

  chrome.storage.sync.set(items, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      if (err.message?.includes("QUOTA")) {
        console.warn(
          `Storage quota error: ${err.message}. Falling back to local storage.`
        );

        chrome.notifications
          .create({
            iconUrl: chrome.runtime.getURL("images/icon48.png"),
            message: t("background.storage.quotaFallbackMessage"),
            priority: 2,
            title: t("background.storage.quotaTitle"),
            type: "basic",
          })
          .catch((notifErr) => {
            console.error("Failed to create notification:", notifErr);
          });

        persistFallbackItems(items, resolve, reject);
        return;
      }

      reject(new Error(err.message));
      return;
    }
    clearFallbackStateForKeys(Object.keys(items), resolve, reject);
  });
});

export const storageLocalGet = createStorageWrapper<[string[] | null], unknown>(
  (resolve, reject, keys) => {
    chrome.storage.local.get(keys, (items) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(items);
    });
  }
);

export const storageLocalSet = createStorageWrapper<
  [Record<string, unknown>],
  void
>((resolve, reject, items) => {
  chrome.storage.local.set(items, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      reject(new Error(err.message));
      return;
    }
    resolve();
  });
});

export const storageLocalRemove = createStorageWrapper<
  [string[] | string],
  void
>((resolve, reject, keys) => {
  chrome.storage.local.remove(keys, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      reject(new Error(err.message));
      return;
    }
    resolve();
  });
});

export function storageLocalGetTyped(
  keys: (keyof LocalStorageData)[]
): Promise<Partial<LocalStorageData>> {
  return storageLocalGet(keys as string[]) as Promise<
    Partial<LocalStorageData>
  >;
}
