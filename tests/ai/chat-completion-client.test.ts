import { Result } from "@praha/byethrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionAdapter, ChatRequestBody } from "@/ai/adapter";
import {
  fetchChatCompletionOk,
  fetchChatCompletionText,
} from "@/ai/chat-completion-client";
import { API_FETCH_TIMEOUT_MS } from "@/constants/timeouts";
import { FetchTimeoutError } from "@/utils/custom-errors";
import { isRecord } from "@/utils/guards";

const requestBody: ChatRequestBody = {
  messages: [{ content: "hello", role: "user" }],
  model: "test-model",
};

function createAdapter(
  overrides: Partial<ChatCompletionAdapter> = {}
): ChatCompletionAdapter {
  return {
    buildRequest: (token, body) => ({
      init: {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": token,
        },
        method: "POST",
      },
      url: "https://api.anthropic.com/v1/messages",
    }),
    extractError: (_json, status) => `adapter error: ${status}`,
    extractText: (json) =>
      isRecord(json) && typeof json.value === "string"
        ? json.value.trim()
        : null,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchChatCompletionText", () => {
  it("uses the adapter request and returns extracted content", async () => {
    const adapter = createAdapter();
    const buildRequest = vi.fn(adapter.buildRequest);
    const extractText = vi.fn(adapter.extractText);
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ value: " adapter ok " }));

    const result = await fetchChatCompletionText(
      fetchFn,
      { ...adapter, buildRequest, extractText },
      "test-token",
      requestBody,
      "empty"
    );

    expect(buildRequest).toHaveBeenCalledExactlyOnceWith(
      "test-token",
      requestBody
    );
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(
      "https://api.anthropic.com/v1/messages",
      {
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-token",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      }
    );
    expect(extractText).toHaveBeenCalledExactlyOnceWith({
      value: " adapter ok ",
    });
    expect(result).toEqual(Result.succeed("adapter ok"));
  });

  it.each([{}, { value: "" }, { value: "   " }])(
    "returns the supplied error when content is empty: %j",
    async (json) => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(json));

      const result = await fetchChatCompletionText(
        fetchFn,
        createAdapter(),
        "token",
        requestBody,
        "empty content"
      );

      expect(result).toEqual(Result.fail("empty content"));
    }
  );

  it("returns the empty-content error when a successful response has invalid JSON", async () => {
    const extractText = vi.fn(createAdapter().extractText);
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not JSON"));

    const result = await fetchChatCompletionText(
      fetchFn,
      createAdapter({ extractText }),
      "token",
      requestBody,
      "empty content"
    );

    expect(extractText).toHaveBeenCalledExactlyOnceWith(null);
    expect(result).toEqual(Result.fail("empty content"));
  });
});

describe("fetchChatCompletionOk", () => {
  it("returns Success without requiring response content", async () => {
    const extractText = vi.fn(createAdapter().extractText);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}));

    const result = await fetchChatCompletionOk(
      fetchFn,
      createAdapter({ extractText }),
      "token",
      requestBody
    );

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(extractText).not.toHaveBeenCalled();
    expect(result).toEqual(Result.succeed());
  });

  it("returns Success when a successful response has invalid JSON", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not JSON"));

    const result = await fetchChatCompletionOk(
      fetchFn,
      createAdapter(),
      "token",
      requestBody
    );

    expect(result).toEqual(Result.succeed());
  });
});

type CompletionRequest = (
  fetchFn: typeof fetch,
  adapter: ChatCompletionAdapter
) => Result.ResultAsync<unknown, string>;

const requests: { name: string; run: CompletionRequest }[] = [
  {
    name: "fetchChatCompletionText",
    run: (fetchFn, adapter) =>
      fetchChatCompletionText(fetchFn, adapter, "token", requestBody, "empty"),
  },
  {
    name: "fetchChatCompletionOk",
    run: (fetchFn, adapter) =>
      fetchChatCompletionOk(fetchFn, adapter, "token", requestBody),
  },
];

describe.each(requests)("$name transport failures", ({ run }) => {
  it("returns the adapter error for a non-ok response", async () => {
    const json = { error: "slow down" };
    const extractError = vi.fn(
      (_json: unknown, status: number) => `failed: ${status}`
    );
    const extractText = vi.fn(createAdapter().extractText);
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(json, { status: 429 }));

    const result = await run(
      fetchFn,
      createAdapter({ extractError, extractText })
    );

    expect(extractError).toHaveBeenCalledExactlyOnceWith(json, 429);
    expect(extractText).not.toHaveBeenCalled();
    expect(result).toEqual(Result.fail("failed: 429"));
  });

  it("passes null and the HTTP status to the adapter when error JSON is invalid", async () => {
    const extractError = vi.fn(createAdapter().extractError);
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not JSON", { status: 503 }));

    const result = await run(fetchFn, createAdapter({ extractError }));

    expect(extractError).toHaveBeenCalledExactlyOnceWith(null, 503);
    expect(result).toEqual(Result.fail("adapter error: 503"));
  });

  it("returns the network error when fetch rejects", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network"));

    const result = await run(fetchFn, createAdapter());

    expect(result).toEqual(Result.fail("network"));
  });

  it("returns a generic request error for an unknown fetch rejection", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(null);

    const result = await run(fetchFn, createAdapter());

    expect(result).toEqual(Result.fail("APIへのリクエストに失敗しました"));
  });

  it("aborts at the API timeout and preserves the timeout message", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        })
    );

    const pendingResult = run(fetchFn, createAdapter());
    await vi.advanceTimersByTimeAsync(API_FETCH_TIMEOUT_MS - 1);
    expect(fetchFn.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pendingResult;

    expect(fetchFn.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(result).toEqual(
      Result.fail(new FetchTimeoutError(API_FETCH_TIMEOUT_MS).message)
    );
  });

  it.each([
    "https://example.invalid/chat/completions",
    "https://api.openai.com.example.invalid/v1/chat/completions",
    "http://api.openai.com/v1/chat/completions",
  ])("rejects an unapproved endpoint before fetching: %s", async (url) => {
    const fetchFn = vi.fn<typeof fetch>();
    const adapter = createAdapter({
      buildRequest: () => ({ init: { method: "POST" }, url }),
    });

    const result = await run(fetchFn, adapter);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toEqual(
      Result.fail(
        `セキュリティエラー: 許可されていないAPIエンドポイント (${new URL(url).origin})`
      )
    );
  });
});
