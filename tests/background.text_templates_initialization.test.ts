import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncStorageData } from "@/background/types";

describe("background: text templates initialization", () => {
  let mockStorage: Partial<SyncStorageData>;

  beforeEach(() => {
    mockStorage = {};
    // @ts-expect-error - mock chrome API
    globalThis.chrome = {
      storage: {
        sync: {
          get: vi.fn((keys, callback) => {
            const result: Partial<SyncStorageData> = {};
            for (const key of keys as Array<keyof SyncStorageData>) {
              if (key in mockStorage) {
                result[key] = mockStorage[key];
              }
            }
            callback(result);
          }),
          set: vi.fn((items, callback) => {
            Object.assign(mockStorage, items);
            callback?.();
          }),
        },
      },
      contextMenus: {
        removeAll: vi.fn((callback) => callback?.()),
        create: vi.fn((_, callback) => callback?.()),
      },
      runtime: {
        lastError: undefined,
      },
    };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("initializes default templates when textTemplates is undefined", async () => {
    // Arrange: textTemplates is undefined (first time)
    mockStorage = {};

    // Act: Import and trigger initialization
    const { refreshContextMenus } = await import(
      "@/background/context_menu_registry"
    );
    await refreshContextMenus();

    // Assert: Default templates should be saved
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        textTemplates: expect.arrayContaining([
          expect.objectContaining({ id: "template:lgtm-0023a134" }),
          expect.objectContaining({ id: "template:greptile-review-34fe3f8c" }),
          expect.objectContaining({
            id: "template:coderabbit-review-0f6905e9",
          }),
        ]),
      }),
      expect.any(Function)
    );
  });

  it("preserves empty array when user deleted all templates", async () => {
    // Arrange: textTemplates is explicitly empty array
    mockStorage = { textTemplates: [] };

    // Act: Import and trigger initialization
    const { refreshContextMenus } = await import(
      "@/background/context_menu_registry"
    );
    await refreshContextMenus();

    // Assert: Should NOT overwrite with defaults
    // The set call count should be 0 or only for other items
    const setCalls = (chrome.storage.sync.set as any).mock.calls;
    const templateSets = setCalls.filter((call: any) =>
      Object.hasOwn(call[0], "textTemplates")
    );

    // Should not set textTemplates (empty array should be preserved)
    expect(templateSets.length).toBe(0);
  });

  it("returns existing templates when they exist", async () => {
    // Arrange: textTemplates has existing items
    const existingTemplates = [
      {
        id: "template:custom",
        title: "Custom Template",
        content: "Custom content",
        hidden: false,
      },
    ];
    mockStorage = { textTemplates: existingTemplates };

    // Act: Import and trigger initialization
    const { refreshContextMenus } = await import(
      "@/background/context_menu_registry"
    );
    await refreshContextMenus();

    // Assert: Should use existing templates
    const setCalls = (chrome.storage.sync.set as any).mock.calls;
    const templateSets = setCalls.filter((call: any) =>
      Object.hasOwn(call[0], "textTemplates")
    );

    // Should not overwrite existing templates
    expect(templateSets.length).toBe(0);
  });
});
