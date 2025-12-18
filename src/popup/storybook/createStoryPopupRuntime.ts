import type { LocalStorageData } from '../../storage/types';
import type { PopupRuntime, RunContextActionRequest, SyncStorageData, TestOpenAiTokenRequest } from '../runtime';

type Options = {
  sync?: Partial<SyncStorageData>;
  local?: Partial<LocalStorageData>;
  activeTabId?: number | null;
  background?: {
    testOpenAiToken?: (message: TestOpenAiTokenRequest) => unknown | Promise<unknown>;
    runContextAction?: (message: RunContextActionRequest) => unknown | Promise<unknown>;
  };
};

export function createStoryPopupRuntime(options: Options = {}): PopupRuntime {
  const syncStorage = new Map<string, unknown>(Object.entries(options.sync ?? {}));
  const localStorage = new Map<string, unknown>(Object.entries(options.local ?? {}));
  const activeTabId = options.activeTabId ?? 123;

  const storageSyncGet: PopupRuntime['storageSyncGet'] = async keys => {
    const result: Partial<SyncStorageData> = {};
    keys.forEach(key => {
      if (syncStorage.has(String(key))) {
        (result as Record<string, unknown>)[key] = syncStorage.get(String(key));
      }
    });
    return result;
  };

  const storageSyncSet: PopupRuntime['storageSyncSet'] = async items => {
    Object.entries(items).forEach(([key, value]) => {
      if (typeof value === 'undefined') return;
      syncStorage.set(key, value);
    });
  };

  const storageLocalGet: PopupRuntime['storageLocalGet'] = async keys => {
    const result: Partial<LocalStorageData> = {};
    keys.forEach(key => {
      if (localStorage.has(String(key))) {
        (result as Record<string, unknown>)[key] = localStorage.get(String(key));
      }
    });
    return result;
  };

  const storageLocalSet: PopupRuntime['storageLocalSet'] = async items => {
    Object.entries(items).forEach(([key, value]) => {
      if (typeof value === 'undefined') return;
      localStorage.set(key, value);
    });
  };

  const storageLocalRemove: PopupRuntime['storageLocalRemove'] = async keys => {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach(key => {
      localStorage.delete(String(key));
    });
  };

  return {
    isExtensionPage: false,
    storageSyncGet,
    storageSyncSet,
    storageLocalGet,
    storageLocalSet,
    storageLocalRemove,
    getActiveTabId: async () => activeTabId,
    sendMessageToBackground: async message => {
      const action = typeof message === 'object' && message !== null ? (message as { action?: unknown }).action : null;

      if (action === 'testOpenAiToken') {
        if (options.background?.testOpenAiToken) {
          return (await options.background.testOpenAiToken(message as TestOpenAiTokenRequest)) as never;
        }
        return { ok: true } as never;
      }

      if (action === 'runContextAction') {
        if (options.background?.runContextAction) {
          return (await options.background.runContextAction(message as RunContextActionRequest)) as never;
        }
        return { ok: false, error: 'storybook runtime: not implemented' } as never;
      }

      return {} as never;
    },
    sendMessageToTab: async () => ({ success: true }) as never,
    openUrl: url => {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        // no-op
      }
    },
  };
}
