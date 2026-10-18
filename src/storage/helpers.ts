import { Result } from "@praha/byethrow";

export type StorageError =
  | { type: "unavailable" }
  | { type: "runtime-error"; message: string };

export function storageSyncGet<T = unknown>(
  keys: string[]
): Promise<Result.Result<T, StorageError>> {
  return new Promise((resolve) => {
    if (!chrome.storage?.sync) {
      resolve(Result.succeed({} as T));
      return;
    }

    chrome.storage.sync.get(keys, (items) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        resolve(
          Result.fail({
            message: err.message ?? "Unknown error",
            type: "runtime-error",
          })
        );
        return;
      }
      resolve(Result.succeed(items as T));
    });
  });
}

export function storageLocalGet<T = unknown>(
  keys: string[]
): Promise<Result.Result<T, StorageError>> {
  return new Promise((resolve) => {
    if (!chrome.storage?.local) {
      resolve(Result.succeed({} as T));
      return;
    }

    chrome.storage.local.get(keys, (items) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        resolve(
          Result.fail({
            message: err.message ?? "Unknown error",
            type: "runtime-error",
          })
        );
        return;
      }
      resolve(Result.succeed(items as T));
    });
  });
}

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
            message: err.message ?? "Unknown error",
            type: "runtime-error",
          })
        );
        return;
      }
      resolve(Result.succeed(undefined));
    });
  });
}
