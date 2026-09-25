import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkStorageQuota,
  getStorageSyncBytesInUse,
  QUOTA_BYTES,
  QUOTA_BYTES_PER_ITEM,
} from "@/background/storage";

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

  describe("getStorageSyncBytesInUse", () => {
    it("should return safe level for low usage", async () => {
      const bytesInUse = QUOTA_BYTES * 0.5; // 50%
      vi.mocked(chrome.storage.sync.getBytesInUse).mockImplementation(
        (_keys, callback) => {
          callback(bytesInUse);
        }
      );

      const usage = await getStorageSyncBytesInUse();
      expect(usage.bytesInUse).toBe(bytesInUse);
      expect(usage.warningLevel).toBe("safe");
    });

    it("should return warning level for 80-90% usage", async () => {
      const bytesInUse = QUOTA_BYTES * 0.85; // 85%
      vi.mocked(chrome.storage.sync.getBytesInUse).mockImplementation(
        (_keys, callback) => {
          callback(bytesInUse);
        }
      );

      const usage = await getStorageSyncBytesInUse();
      expect(usage.warningLevel).toBe("warning");
    });

    it("should return danger level for >90% usage", async () => {
      const bytesInUse = QUOTA_BYTES * 0.95; // 95%
      vi.mocked(chrome.storage.sync.getBytesInUse).mockImplementation(
        (_keys, callback) => {
          callback(bytesInUse);
        }
      );

      const usage = await getStorageSyncBytesInUse();
      expect(usage.warningLevel).toBe("danger");
    });

    it("should handle Chrome runtime errors", async () => {
      vi.mocked(chrome.storage.sync.getBytesInUse).mockImplementation(
        (_keys, callback) => {
          chrome.runtime.lastError = { message: "Storage unavailable" };
          callback(0); // Call the callback even with error
        }
      );

      await expect(getStorageSyncBytesInUse()).rejects.toThrow(
        "Storage unavailable"
      );
    });
  });
});
