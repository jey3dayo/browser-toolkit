import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkStorageQuota, QUOTA_BYTES_PER_ITEM } from "@/background/storage";

// Chrome API のモック
global.chrome = {
  runtime: {
    lastError: undefined,
  },
  storage: {
    sync: {
      getBytesInUse: vi.fn(),
    },
  },
} as any;

describe("Storage Quota Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chrome.runtime.lastError = undefined;
  });

  describe("checkStorageQuota", () => {
    it("should return ok:true for small data", () => {
      const items = { key1: "small value" };
      const result = checkStorageQuota(items);
      expect(result.ok).toBe(true);
    });

    it("should return ok:false for data exceeding 8KB", () => {
      // Create a string larger than 8KB
      const largeValue = "x".repeat(QUOTA_BYTES_PER_ITEM + 1);
      const items = { key1: largeValue };
      const result = checkStorageQuota(items);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.key).toBe("key1");
        expect(result.sizeBytes).toBeGreaterThan(QUOTA_BYTES_PER_ITEM);
      }
    });

    it("should check multiple items", () => {
      const items = {
        key1: "small",
        key2: "x".repeat(QUOTA_BYTES_PER_ITEM + 1),
      };
      const result = checkStorageQuota(items);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.key).toBe("key2");
      }
    });
  });
});
