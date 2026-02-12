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

export const storageSyncGet = createStorageWrapper<[string[]], unknown>(
  (resolve, reject, keys) => {
    chrome.storage.sync.get(keys, (items) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(items);
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
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
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

        chrome.storage.local.set(items, () => {
          const localErr = chrome.runtime.lastError;
          if (localErr) {
            reject(new Error(localErr.message));
            return;
          }
          resolve();
        });
        return;
      }

      reject(new Error(err.message));
      return;
    }
    resolve();
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
