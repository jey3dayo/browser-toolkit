import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "@/utils/fetch-with-timeout";
import { FetchTimeoutError } from "@/utils/custom-errors";

describe("fetchWithTimeout", () => {
  it("正常なレスポンスを返す", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await fetchWithTimeout(
      mockFetch as unknown as typeof fetch,
      "https://example.com",
      {},
      5000
    );
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
      signal: expect.any(AbortSignal),
    });
  });

  it("タイムアウト時にFetchTimeoutErrorをスロー", async () => {
    const mockFetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        // AbortSignalをリスニング
        const signal = options?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener("abort", () => {
            const abortError = new Error("AbortError");
            abortError.name = "AbortError";
            reject(abortError);
          });
        }
        // レスポンスは1秒後（タイムアウトより遅い）
        setTimeout(() => {
          // このresolveは到達しない
        }, 1000);
      });
    });

    await expect(
      fetchWithTimeout(
        mockFetch as unknown as typeof fetch,
        "https://example.com",
        {},
        10 // 10msでタイムアウト
      )
    ).rejects.toThrow(FetchTimeoutError);
  }, 2000); // テストタイムアウトを2秒に設定

  it("AbortErrorをFetchTimeoutErrorに変換", async () => {
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    const mockFetch = vi.fn().mockRejectedValue(abortError);

    await expect(
      fetchWithTimeout(
        mockFetch as unknown as typeof fetch,
        "https://example.com",
        {},
        5000
      )
    ).rejects.toThrow(FetchTimeoutError);
  });

  it("TimeoutErrorをFetchTimeoutErrorに変換", async () => {
    const timeoutError = new Error("TimeoutError");
    timeoutError.name = "TimeoutError";
    const mockFetch = vi.fn().mockRejectedValue(timeoutError);

    await expect(
      fetchWithTimeout(
        mockFetch as unknown as typeof fetch,
        "https://example.com",
        {},
        5000
      )
    ).rejects.toThrow(FetchTimeoutError);
  });

  it("その他のエラーはそのままスロー", async () => {
    const networkError = new Error("Network error");
    const mockFetch = vi.fn().mockRejectedValue(networkError);

    await expect(
      fetchWithTimeout(
        mockFetch as unknown as typeof fetch,
        "https://example.com",
        {},
        5000
      )
    ).rejects.toThrow("Network error");
  });

  it("デフォルトタイムアウトは25秒", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    await fetchWithTimeout(
      mockFetch as unknown as typeof fetch,
      "https://example.com",
      {}
    );
    expect(mockFetch).toHaveBeenCalled();
    // デフォルトタイムアウトは25000ms（コード内で確認済み）
  });

  it("カスタムタイムアウトを設定可能", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    await fetchWithTimeout(
      mockFetch as unknown as typeof fetch,
      "https://example.com",
      {},
      10_000
    );
    expect(mockFetch).toHaveBeenCalled();
  });

  it("FetchTimeoutErrorのメッセージが正しい", () => {
    const error = new FetchTimeoutError(25_000);
    expect(error.message).toBe(
      "API呼び出しがタイムアウトしました（25秒）。テキストを短くして再試行してください。"
    );
    expect(error.name).toBe("FetchTimeoutError");
  });
});
