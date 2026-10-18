import { Result } from "@praha/byethrow";
import { vi } from "vitest";
import type { PopupRuntime } from "@/popup/runtime";
import type { SyncStorageData } from "@/storage/types";
import type { Notifier } from "@/ui/toast";

export type StorageChange = { newValue: unknown; oldValue: unknown };

export type SyncStorageChangeListener = (
  changes: Record<string, StorageChange>,
  areaName: string
) => void;

export type PopupSyncStorageStub = {
  get: PopupRuntime["storageSyncGet"];
  set: PopupRuntime["storageSyncSet"];
  store: Partial<SyncStorageData>;
  onChanged: {
    addListener: (listener: SyncStorageChangeListener) => void;
    removeListener: (listener: SyncStorageChangeListener) => void;
  };
};

export type SyncStorageStubOptions = {
  holdFirstSetUntilNextSet?: boolean;
};

export function createSyncStorageStub(
  initial: Partial<SyncStorageData>,
  options?: SyncStorageStubOptions
): PopupSyncStorageStub {
  const store: Partial<SyncStorageData> = { ...initial };
  const listeners: SyncStorageChangeListener[] = [];
  let holdRemaining = options?.holdFirstSetUntilNextSet === true ? 1 : 0;
  let heldRelease: (() => void) | null = null;

  const get: PopupRuntime["storageSyncGet"] = (keys) => {
    const items: Partial<SyncStorageData> = {};
    for (const key of keys) {
      if (key in store) {
        items[key] = store[key];
      }
    }
    return Promise.resolve(Result.succeed(items));
  };

  const set: PopupRuntime["storageSyncSet"] = async (items) => {
    const release = heldRelease;
    heldRelease = null;
    release?.();

    if (holdRemaining > 0) {
      holdRemaining -= 1;
      await new Promise<void>((resolve) => {
        heldRelease = resolve;
      });
    }

    const writes = Object.entries(items).map(([key, value]) => ({
      key,
      newValue: value,
      oldValue: store[key],
    }));
    Object.assign(store, items);
    const changes: Record<string, StorageChange> = {};
    for (const write of writes) {
      changes[write.key] = {
        newValue: write.newValue,
        oldValue: write.oldValue,
      };
    }
    for (const listener of [...listeners]) {
      listener(changes, "sync");
    }
    return Result.succeed();
  };

  return {
    get,
    onChanged: {
      addListener: (listener) => {
        listeners.push(listener);
      },
      removeListener: (listener) => {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      },
    },
    set,
    store,
  };
}

export function createPopupRuntimeStub(params: {
  storageSyncGet: PopupRuntime["storageSyncGet"];
  storageSyncSet: PopupRuntime["storageSyncSet"];
  storageLocalGet?: PopupRuntime["storageLocalGet"];
}): PopupRuntime {
  return {
    diagnoseFocusOverride: async () =>
      Result.succeed({
        hasFocus: true,
        hidden: false,
        markerPresent: false,
        visibilityState: "visible",
      }),
    getActiveTab: async () => Result.succeed(null),
    getActiveTabId: async () => Result.succeed(null),
    getSearchResultTabId: async () => Result.succeed(null),
    isExtensionPage: true,
    matchesFocusOverridePatterns: () => false,
    openUrl: () => {
      // no-op
    },
    reloadTab: async () => Result.succeed(),
    sendMessageToBackground: async () => Result.succeed({}),
    sendMessageToTab: async () => Result.succeed({}),
    storageLocalGet: params.storageLocalGet ?? (async () => Result.succeed({})),
    storageLocalRemove: async () => Result.succeed(),
    storageLocalSet: async () => Result.succeed(),
    storageSyncGet: params.storageSyncGet,
    storageSyncSet: params.storageSyncSet,
  };
}

export function createNotifierStub(): Notifier & {
  error: ReturnType<typeof vi.fn<Notifier["error"]>>;
  info: ReturnType<typeof vi.fn<Notifier["info"]>>;
  success: ReturnType<typeof vi.fn<Notifier["success"]>>;
} {
  const error = vi.fn<Notifier["error"]>();
  const info = vi.fn<Notifier["info"]>();
  const success = vi.fn<Notifier["success"]>();
  return { error, info, success };
}
