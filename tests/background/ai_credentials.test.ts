import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiSettings } from "@/ai/settings";
import { isRecord } from "@/utils/guards";
import {
  installChatGptChrome,
  jsonResponse,
  sampleCredentials,
} from "../helpers/chatgptChrome";

const body = {
  messages: [{ content: "hello", role: "user" }],
  model: "gpt-test",
};

const chatgptSettings: AiSettings = {
  baseUrl: "https://api.openai.com/v1",
  customPrompt: "",
  model: "gpt-test",
  provider: "chatgpt",
};

function sseResponse(text: string): Response {
  const events = [
    { delta: text, type: "response.output_text.delta" },
    { type: "response.completed" },
  ];
  return new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    { status: 200 }
  );
}

function bearerOf(init: RequestInit | undefined): string {
  const headers = init?.headers;
  return isRecord(headers) ? String(headers.Authorization) : "";
}

describe("background: ai_credentials dispatch", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends chatgpt requests to /responses with the access token only", async () => {
    installChatGptChrome({
      chatgptCredentials: sampleCredentials(),
      openaiApiToken: "sk-api-key",
    });
    const fetchSpy = vi.fn(() => Promise.resolve(sseResponse("hi")));
    vi.stubGlobal("fetch", fetchSpy);
    const { requestAiCompletionText } = await import(
      "@/background/ai_credentials"
    );

    const result = await requestAiCompletionText(
      chatgptSettings,
      body,
      "empty"
    );

    expect(Result.isSuccess(result) && result.value).toBe("hi");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(bearerOf(init)).toBe("Bearer access-1");
    expect(JSON.stringify(init)).not.toContain("sk-api-key");
  });

  it("force-refreshes once on 401 and retries with the new token", async () => {
    installChatGptChrome({ chatgptCredentials: sampleCredentials() });
    const seen: string[] = [];
    const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/oauth/token")) {
        return Promise.resolve(
          jsonResponse(200, {
            access_token: "access-2",
            expires_in: 3600,
            refresh_token: "refresh-2",
            scope: "openid chatgpt.tokens.use.direct",
          })
        );
      }
      seen.push(bearerOf(init));
      return Promise.resolve(
        seen.length === 1
          ? jsonResponse(401, { error: { message: "expired" } })
          : sseResponse("again")
      );
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { requestAiCompletionText } = await import(
      "@/background/ai_credentials"
    );

    const result = await requestAiCompletionText(
      chatgptSettings,
      body,
      "empty"
    );

    expect(Result.isSuccess(result) && result.value).toBe("again");
    expect(seen).toEqual(["Bearer access-1", "Bearer access-2"]);
  });

  it("does not retry a second time when the retry is also 401", async () => {
    installChatGptChrome({ chatgptCredentials: sampleCredentials() });
    const responsesCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/oauth/token")) {
          return Promise.resolve(
            jsonResponse(200, {
              access_token: "access-2",
              expires_in: 3600,
              refresh_token: "refresh-2",
              scope: "openid chatgpt.tokens.use.direct",
            })
          );
        }
        responsesCalls.push(url);
        return Promise.resolve(jsonResponse(401, {}));
      })
    );
    const { requestAiCompletionText } = await import(
      "@/background/ai_credentials"
    );

    const result = await requestAiCompletionText(
      chatgptSettings,
      body,
      "empty"
    );

    expect(Result.isFailure(result)).toBe(true);
    expect(responsesCalls).toHaveLength(2);
  });

  it("fails without any request when signed out", async () => {
    installChatGptChrome({ openaiApiToken: "sk-api-key" });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { requestAiCompletionText } = await import(
      "@/background/ai_credentials"
    );

    const result = await requestAiCompletionText(
      chatgptSettings,
      body,
      "empty"
    );

    expect(Result.isFailure(result)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps api-key providers on chat/completions with their own token", async () => {
    installChatGptChrome();
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, { choices: [{ message: { content: "ok" } }] })
      )
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { requestAiCompletionText } = await import(
      "@/background/ai_credentials"
    );

    const result = await requestAiCompletionText(
      { ...chatgptSettings, provider: "openai", token: "sk-api-key" },
      body,
      "empty"
    );

    expect(Result.isSuccess(result) && result.value).toBe("ok");
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(bearerOf(init)).toBe("Bearer sk-api-key");
  });
});

describe("background: ai_requests with chatgpt", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("answers chat follow-ups through /responses and never uses openaiApiToken", async () => {
    installChatGptChrome({
      aiProvider: "chatgpt",
      chatgptCredentials: sampleCredentials(),
      openaiApiToken: "sk-api-key",
    });
    const fetchSpy = vi.fn(() => Promise.resolve(sseResponse("reply")));
    vi.stubGlobal("fetch", fetchSpy);
    const { chatFollowUpWithAi } = await import("@/background/ai_requests");

    const result = await chatFollowUpWithAi(
      [{ content: "質問", role: "user" }],
      "ページ"
    );

    expect(Result.isSuccess(result) && result.value).toBe("reply");
    const urls = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual(["https://api.openai.com/v1/responses"]);
  });

  it("ignores the token override when testing chatgpt", async () => {
    installChatGptChrome({
      aiProvider: "chatgpt",
      chatgptCredentials: sampleCredentials(),
    });
    const fetchSpy = vi.fn(() => Promise.resolve(sseResponse("OK")));
    vi.stubGlobal("fetch", fetchSpy);
    const { testAiToken } = await import("@/background/ai_requests");

    const result = await testAiToken("sk-override");

    expect(Result.isSuccess(result)).toBe(true);
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(bearerOf(init)).toBe("Bearer access-1");
  });

  it("fails with a sign-in message when chatgpt is selected but signed out", async () => {
    installChatGptChrome({
      aiProvider: "chatgpt",
      openaiApiToken: "sk-api-key",
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { testAiToken } = await import("@/background/ai_requests");

    const result = await testAiToken();

    expect(Result.isFailure(result)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
