// Storage helper functions with Result type for error handling

import { Result } from "@praha/byethrow";

export type StorageError =
  | { type: "unavailable" }
  | { type: "runtime-error"; message: string };

/**
 * chrome.storage.syncから値を取得
 * @param keys - 取得するキーの配列
 * @returns Result型でラップされた取得結果
 */
export function storageSyncGet<T = unknown>(
  keys: string[]
): Promise<Result.Result<T, StorageError>> {
  return new Promise((resolve) => {
    if (!chrome.storage?.sync) {
      resolve(Result.succeed({} as T));
      return;
    }

    chrome.storage.sync.get(keys, (items) => {
      const err = chrome.runtime.lastError;
      if (err) {
        resolve(
          Result.fail({
            type: "runtime-error",
            message: err.message ?? "Unknown error",
          })
        );
        return;
      }
      resolve(Result.succeed(items as T));
    });
  });
}

/**
 * chrome.storage.localから値を取得
 * @param keys - 取得するキーの配列
 * @returns Result型でラップされた取得結果
 */
export function storageLocalGet<T = unknown>(
  keys: string[]
): Promise<Result.Result<T, StorageError>> {
  return new Promise((resolve) => {
    if (!chrome.storage?.local) {
      resolve(Result.succeed({} as T));
      return;
    }

    chrome.storage.local.get(keys, (items) => {
      const err = chrome.runtime.lastError;
      if (err) {
        resolve(
          Result.fail({
            type: "runtime-error",
            message: err.message ?? "Unknown error",
          })
        );
        return;
      }
      resolve(Result.succeed(items as T));
    });
  });
}

/**
 * chrome.storage.localに値を保存
 * @param items - 保存する値のオブジェクト
 * @returns Result型でラップされた保存結果
 */
export function storageLocalSet(
  items: Record<string, unknown>
): Promise<Result.Result<void, StorageError>> {
  return new Promise((resolve) => {
    if (!chrome.storage?.local) {
      resolve(Result.succeed(undefined));
      return;
    }

    chrome.storage.local.set(items, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        resolve(
          Result.fail({
            type: "runtime-error",
            message: err.message ?? "Unknown error",
          })
        );
        return;
      }
      resolve(Result.succeed(undefined));
    });
  });
}
