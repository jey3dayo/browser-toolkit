import type { LocalStorageData } from "@/storage/types";

/**
 * Chrome Storage Sync のクォータ制限
 * @see https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync-QUOTA_BYTES_PER_ITEM
 */
export const QUOTA_BYTES_PER_ITEM = 8192; // 8KB
export const QUOTA_BYTES = 102_400; // 100KB
export const QUOTA_WARNING_THRESHOLD = 0.8; // 80%
export const QUOTA_ERROR_THRESHOLD = 0.9; // 90%

/**
 * ストレージクォータチェック結果
 */
export type QuotaCheckResult =
  | { ok: true }
  | { ok: false; sizeBytes: number; key: string };

/**
 * ストレージ使用量の情報
 */
export type StorageUsageInfo = {
  bytesInUse: number;
  quotaBytes: number;
  usagePercent: number;
  warningLevel: "safe" | "warning" | "danger";
};

/**
 * 保存前にクォータ制限をチェック
 * @param items - 保存するデータ
 * @returns チェック結果
 */
export function checkStorageQuota(
  items: Record<string, unknown>
): QuotaCheckResult {
  for (const [key, value] of Object.entries(items)) {
    const jsonStr = JSON.stringify(value);
    const sizeBytes = new Blob([jsonStr]).size;

    if (sizeBytes > QUOTA_BYTES_PER_ITEM) {
      return { ok: false, sizeBytes, key };
    }
  }
  return { ok: true };
}

/**
 * chrome.storage.sync の現在の使用量を取得
 * @param keys - 使用量を取得するキー（省略時は全体）
 * @returns 使用量情報
 */
export function getStorageSyncBytesInUse(
  keys?: string | string[]
): Promise<StorageUsageInfo> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.getBytesInUse(keys ?? null, (bytesInUse) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      const usagePercent = bytesInUse / QUOTA_BYTES;
      let warningLevel: StorageUsageInfo["warningLevel"] = "safe";
      if (usagePercent >= QUOTA_ERROR_THRESHOLD) {
        warningLevel = "danger";
      } else if (usagePercent >= QUOTA_WARNING_THRESHOLD) {
        warningLevel = "warning";
      }

      resolve({
        bytesInUse,
        quotaBytes: QUOTA_BYTES,
        usagePercent,
        warningLevel,
      });
    });
  });
}

/**
 * Generic factory to wrap Chrome Storage API operations in Promises with error handling.
 * Handles the common pattern of checking chrome.runtime.lastError and resolving/rejecting.
 */
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

/**
 * Storage reserved keys (internal use only)
 */
export const STORAGE_RESERVED_KEYS = {
  SCHEMA_VERSION: "schemaVersion",
  MIGRATION_LOG: "migrationLog",
  FALLBACK_KEYS_MARKER: "__storage_fallback_keys__",
  BACKUP_PREFIX: "backup_",
} as const;

type ReservedKey =
  (typeof STORAGE_RESERVED_KEYS)[keyof typeof STORAGE_RESERVED_KEYS];

/**
 * Check if a key is a reserved storage key
 */
export function isReservedStorageKey(key: string): key is ReservedKey {
  return (
    Object.values(STORAGE_RESERVED_KEYS).includes(key as ReservedKey) ||
    key.startsWith(STORAGE_RESERVED_KEYS.BACKUP_PREFIX)
  );
}

/**
 * Filter out reserved keys from user data
 */
export function filterReservedKeys(keys: string[]): string[] {
  return keys.filter((key) => !isReservedStorageKey(key));
}

/**
 * Fallback marker key to track which keys are stored in local storage
 * @deprecated Use STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER instead
 */
export const FALLBACK_KEYS_MARKER = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;

function clearFallbackStateForKeys(
  keys: string[],
  resolve: () => void,
  reject: (reason: Error) => void
): void {
  const markerKey = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;

  chrome.storage.local.get([markerKey], (markerData) => {
    const markerErr = chrome.runtime.lastError;
    if (markerErr) {
      reject(new Error(markerErr.message));
      return;
    }

    const fallbackKeys = (markerData[markerKey] as string[]) ?? [];
    const keysToClear = keys.filter((key) => fallbackKeys.includes(key));

    if (keysToClear.length === 0) {
      resolve();
      return;
    }

    const newFallbackKeys = fallbackKeys.filter(
      (key) => !keysToClear.includes(key)
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

export const storageSyncGet = createStorageWrapper<[string[]], unknown>(
  (resolve, reject, keys) => {
    chrome.storage.sync.get(keys, (syncItems) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      // Check if any keys are marked as fallback to local storage
      const markerKey = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;
      chrome.storage.local.get([markerKey], (markerData) => {
        const markerErr = chrome.runtime.lastError;
        if (markerErr) {
          console.error(
            "[storageSyncGet] Failed to load fallback marker:",
            markerErr
          );
          // Fallback: return sync data only
          resolve(syncItems);
          return;
        }

        const fallbackKeys = (markerData[markerKey] as string[]) ?? [];
        const keysInLocal = keys.filter((key) => fallbackKeys.includes(key));

        if (keysInLocal.length === 0) {
          // No fallback keys, return sync data
          resolve(syncItems);
          return;
        }

        // Fetch fallback keys from local storage
        chrome.storage.local.get(keysInLocal, (localItems) => {
          const localErr = chrome.runtime.lastError;
          if (localErr) {
            reject(new Error(localErr.message));
            return;
          }

          // Merge sync and local data (local takes precedence)
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
  // 保存前にクォータチェック
  const quotaCheck = checkStorageQuota(items);
  if (!quotaCheck.ok) {
    // クォータ超過時はローカルストレージにフォールバック
    console.warn(
      `Storage quota exceeded for key '${quotaCheck.key}' (${quotaCheck.sizeBytes} bytes). Falling back to local storage.`
    );

    // ユーザーに通知
    chrome.notifications
      .create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("images/icon48.png"),
        title: "ストレージ制限",
        message: `設定データが大きすぎます (${quotaCheck.key}: ${Math.round(quotaCheck.sizeBytes / 1024)}KB)。同期されないローカルストレージに保存されました。`,
        priority: 2,
      })
      .catch((err) => {
        console.error("Failed to create notification:", err);
      });

    // chrome.storage.local にフォールバック（同期はされない）
    // フォールバックキーをマーカーに記録
    const markerKey = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;
    chrome.storage.local.get([markerKey], (markerData) => {
      const fallbackKeys = (markerData[markerKey] as string[]) ?? [];
      const newFallbackKeys = [
        ...new Set([...fallbackKeys, ...Object.keys(items)]),
      ];

      chrome.storage.local.set(
        {
          ...items,
          [markerKey]: newFallbackKeys,
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve();
        }
      );
    });
    return;
  }

  chrome.storage.sync.set(items, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      // QUOTA_BYTES エラーの場合もフォールバック
      if (err.message?.includes("QUOTA")) {
        console.warn(
          `Storage quota error: ${err.message}. Falling back to local storage.`
        );

        chrome.notifications
          .create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("images/icon48.png"),
            title: "ストレージ制限",
            message:
              "設定データが多すぎます。同期されないローカルストレージに保存されました。",
            priority: 2,
          })
          .catch((notifErr) => {
            console.error("Failed to create notification:", notifErr);
          });

        // フォールバックキーをマーカーに記録
        const markerKey = STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER;
        chrome.storage.local.get([markerKey], (markerData) => {
          const fallbackKeys = (markerData[markerKey] as string[]) ?? [];
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
        return;
      }

      reject(new Error(err.message));
      return;
    }
    clearFallbackStateForKeys(Object.keys(items), resolve, reject);
  });
});

export const storageLocalGet = createStorageWrapper<[string[]], unknown>(
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
