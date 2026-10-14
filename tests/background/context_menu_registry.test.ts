import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("context_menu_registry queue recovery", () => {
  let chromeStub: {
    contextMenus: {
      removeAll: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    storage: {
      sync: {
        get: ReturnType<typeof vi.fn>;
      };
    };
    runtime: {
      lastError: null | { message: string };
    };
    i18n: {
      getMessage: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    chromeStub = {
      contextMenus: {
        create: vi.fn(),
        removeAll: vi.fn(),
      },
      i18n: {
        getMessage: vi.fn((key: string) => key),
      },
      runtime: {
        lastError: null,
      },
      storage: {
        sync: {
          get: vi.fn(),
        },
      },
    };

    globalThis.chrome = chromeStub as unknown as typeof chrome;

    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recovers from queue failures and allows subsequent refreshes", async () => {
    chromeStub.storage.sync.get.mockImplementation(
      (_keys: unknown, callback?: (items: unknown) => void) => {
        chromeStub.runtime.lastError = null;
        callback?.({});
      }
    );

    let callCount = 0;

    // First call throws error
    chromeStub.contextMenus.removeAll
      .mockImplementationOnce(() => {
        callCount += 1;
        throw new Error("First refresh failed");
      })
      .mockImplementation((callback?: () => void) => {
        callCount += 1;
        chromeStub.runtime.lastError = null;
        callback?.();
      });

    chromeStub.contextMenus.create.mockImplementation(
      (_createProperties: unknown, callback?: () => void) => {
        chromeStub.runtime.lastError = null;
        callback?.();
      }
    );

    const { scheduleRefreshContextMenus } = await import(
      "@/background/context_menu_registry"
    );

    // First refresh throws and rejects, but error is absorbed by ignoreRejection
    await scheduleRefreshContextMenus();
    const countAfterFirst = callCount;

    // Second refresh should succeed despite previous failure (queue recovered)
    await scheduleRefreshContextMenus();

    // Verify that the second call actually ran (queue didn't stay poisoned)
    expect(callCount).toBeGreaterThan(countAfterFirst);
  });
});
