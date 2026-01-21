import type { LocalStorageData } from "@/storage/types";

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
  chrome.storage.sync.set(items, () => {
    const err = chrome.runtime.lastError;
    if (err) {
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
