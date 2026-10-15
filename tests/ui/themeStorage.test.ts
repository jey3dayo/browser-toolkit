import { describe, expect, it, vi } from "vitest";
import type { Theme } from "@/ui/theme";
import {
  loadStoredTheme,
  normalizeTheme,
  persistTheme,
} from "@/ui/themeStorage";

vi.mock("@/storage/helpers", () => ({
  storageLocalGet: vi.fn(),
}));

describe("normalizeTheme", () => {
  it("returns valid theme values as-is", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("auto")).toBe("auto");
  });

  it("returns auto for invalid values", () => {
    expect(normalizeTheme("invalid")).toBe("auto");
    expect(normalizeTheme(null)).toBe("auto");
    expect(normalizeTheme(undefined)).toBe("auto");
    expect(normalizeTheme(123)).toBe("auto");
  });
});

describe("loadStoredTheme", () => {
  it("loads stored dark theme correctly", async () => {
    const mockGet = vi.fn((_, callback) => callback({ theme: "dark" }));
    globalThis.chrome = {
      storage: {
        local: {
          get: mockGet,
        },
      },
    } as any;

    const { storageLocalGet } = await import("@/storage/helpers");
    const { Result } = await import("@praha/byethrow");

    vi.mocked(storageLocalGet).mockResolvedValue(
      Result.succeed({ theme: "dark" })
    );

    const theme = await loadStoredTheme("auto");
    expect(theme).toBe("dark");
    expect(storageLocalGet).toHaveBeenCalledWith(["theme"]);
  });

  it("loads stored light theme correctly", async () => {
    const mockGet = vi.fn((_, callback) => callback({ theme: "light" }));
    globalThis.chrome = {
      storage: {
        local: {
          get: mockGet,
        },
      },
    } as any;

    const { storageLocalGet } = await import("@/storage/helpers");
    const { Result } = await import("@praha/byethrow");

    vi.mocked(storageLocalGet).mockResolvedValue(
      Result.succeed({ theme: "light" })
    );

    const theme = await loadStoredTheme("auto");
    expect(theme).toBe("light");
  });

  it("returns fallback on storage failure", async () => {
    const mockGet = vi.fn();
    globalThis.chrome = {
      storage: {
        local: {
          get: mockGet,
        },
      },
    } as any;

    const { storageLocalGet } = await import("@/storage/helpers");
    const { Result } = await import("@praha/byethrow");

    vi.mocked(storageLocalGet).mockResolvedValue(Result.fail("Storage error"));

    const theme = await loadStoredTheme("dark");
    expect(theme).toBe("dark");
  });

  it("normalizes invalid stored values to auto", async () => {
    const mockGet = vi.fn((_, callback) => callback({ theme: "invalid" }));
    globalThis.chrome = {
      storage: {
        local: {
          get: mockGet,
        },
      },
    } as any;

    const { storageLocalGet } = await import("@/storage/helpers");
    const { Result } = await import("@praha/byethrow");

    vi.mocked(storageLocalGet).mockResolvedValue(
      Result.succeed({ theme: "invalid" as Theme })
    );

    const theme = await loadStoredTheme("light");
    expect(theme).toBe("auto");
  });

  it("returns fallback when chrome is undefined", async () => {
    const originalChrome = globalThis.chrome;
    (globalThis as any).chrome = undefined;

    const theme = await loadStoredTheme("dark");
    expect(theme).toBe("dark");

    globalThis.chrome = originalChrome;
  });

  it("returns fallback when chrome.storage.local is missing", async () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      storage: {},
    } as any;

    const theme = await loadStoredTheme("light");
    expect(theme).toBe("light");

    globalThis.chrome = originalChrome;
  });
});

describe("persistTheme", () => {
  it("persists theme to chrome.storage.local", async () => {
    const mockSet = vi.fn((_, callback) => callback());
    globalThis.chrome = {
      storage: {
        local: {
          set: mockSet,
        },
      },
    } as any;

    await persistTheme("dark");
    expect(mockSet).toHaveBeenCalledWith(
      { theme: "dark" },
      expect.any(Function)
    );
  });

  it("handles missing chrome API gracefully", async () => {
    const originalChrome = globalThis.chrome;
    (globalThis as any).chrome = undefined;

    await expect(persistTheme("dark")).resolves.toBeUndefined();

    globalThis.chrome = originalChrome;
  });
});
