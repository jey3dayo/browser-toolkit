import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientIdCache, trackError, trackEvent } from "@/utils/analytics";

// ============================================
// Mocks
// ============================================

// chrome.storage.local のモック
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
global.chrome = {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
  },
  runtime: {
    getManifest: () => ({ version: "1.0.0" }),
  },
} as any;

// fetch のモック
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // キャッシュをクリア
    clearClientIdCache();
    // デフォルトは本番環境
    process.env.NODE_ENV = "production";
    // crypto.randomUUID のモック
    vi.stubGlobal("crypto", {
      ...crypto,
      randomUUID: () => "test-uuid-12345",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("trackEvent", () => {
    it("開発環境ではコンソールログのみ", async () => {
      process.env.NODE_ENV = "development";
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // no-op
      });

      const result = await trackEvent("test_event", {
        param1: "value1",
      });

      expect(Result.isSuccess(result)).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[Analytics] Event (dev mode only):",
        "test_event",
        { param1: "value1" }
      );
      expect(mockFetch).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("本番環境でGA4にイベントを送信", async () => {
      // クライアントIDが既に存在する場合
      mockStorageGet.mockResolvedValue({ ga4_client_id: "existing-client-id" });
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));

      const result = await trackEvent("test_event", {
        param1: "value1",
      });

      expect(Result.isSuccess(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://www.google-analytics.com/mp/collect"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining("test_event"),
        })
      );

      // ペイロードの検証
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.client_id).toBe("existing-client-id");
      expect(body.events[0].name).toBe("test_event");
      expect(body.events[0].params.param1).toBe("value1");
      expect(body.events[0].params.extension_version).toBe("1.0.0");
    });

    it("クライアントIDが存在しない場合は新規生成", async () => {
      mockStorageGet.mockResolvedValue({});
      mockStorageSet.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));

      const result = await trackEvent("test_event");

      expect(Result.isSuccess(result)).toBe(true);
      expect(mockStorageSet).toHaveBeenCalledWith({
        ga4_client_id: "test-uuid-12345",
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.client_id).toBe("test-uuid-12345");
    });

    it("GA4 APIエラー時はResultを返す", async () => {
      mockStorageGet.mockResolvedValue({ ga4_client_id: "existing-client-id" });
      mockFetch.mockResolvedValue(
        new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        })
      );

      const result = await trackEvent("test_event");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error).toContain("GA4 API returned 500");
      }
    });

    it("ネットワークエラー時はResultを返す", async () => {
      mockStorageGet.mockResolvedValue({ ga4_client_id: "existing-client-id" });
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await trackEvent("test_event");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error).toContain("Failed to send GA4 event");
      }
    });
  });

  describe("trackError", () => {
    beforeEach(() => {
      mockStorageGet.mockResolvedValue({ ga4_client_id: "test-client-id" });
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));
    });

    it("エラーをGA4にトラッキング", async () => {
      const error = new Error("Test error message");
      error.name = "TestError";

      const result = await trackError(error, "background");

      expect(Result.isSuccess(result)).toBe(true);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.events[0].name).toBe("exception");
      expect(body.events[0].params.description).toBe("Test error message");
      expect(body.events[0].params.fatal).toBe(false);
      expect(body.events[0].params.context).toBe("background");
      expect(body.events[0].params.error_name).toBe("TestError");
    });

    it("コンテキストが指定されない場合はunknown", async () => {
      const error = new Error("Test error");

      await trackError(error);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.events[0].params.context).toBe("unknown");
    });

    it("エラーメッセージからOpenAI API Keyを除去", async () => {
      const error = new Error(
        "Failed to authenticate with API key: sk-1234567890abcdefghij"
      );

      await trackError(error, "background");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.events[0].params.description).toBe(
        "Failed to authenticate with API key: [REDACTED_API_KEY]"
      );
    });

    it("エラーメッセージからURLパスを除去", async () => {
      const error = new Error(
        "Failed to fetch https://example.com/user/12345/profile"
      );

      await trackError(error, "content");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.events[0].params.description).toBe(
        "Failed to fetch https://example.com/[PATH]"
      );
    });

    it("長いエラーメッセージは500文字に切り詰め", async () => {
      const longMessage = "a".repeat(600);
      const error = new Error(longMessage);

      await trackError(error, "popup");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.events[0].params.description).toBe(`${"a".repeat(500)}...`);
    });

    it("複数の機密情報を同時に除去", async () => {
      const error = new Error(
        "API key sk-abc123xyz456 failed for URL https://api.example.com/v1/users/789"
      );

      await trackError(error, "background");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const sanitized = body.events[0].params.description;
      expect(sanitized).not.toContain("sk-abc123xyz456");
      expect(sanitized).not.toContain("/v1/users/789");
      expect(sanitized).toContain("[REDACTED_API_KEY]");
      expect(sanitized).toContain("https://api.example.com/[PATH]");
    });
  });
});
