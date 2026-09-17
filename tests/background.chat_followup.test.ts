import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

describe("background: chat follow-up history guard", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    chromeStub = createChromeStub({ listeners: [] });
    chromeStub.storage.local.get.mockImplementation(
      (keys: string[], callback: (items: unknown) => void) => {
        chromeStub.runtime.lastError = null;
        const keyList = Array.isArray(keys) ? keys : [String(keys)];
        const items: Record<string, unknown> = {};
        if (keyList.includes("anthropicApiToken")) {
          items.anthropicApiToken = "sk-ant-test";
        }
        if (keyList.includes("aiProvider")) {
          items.aiProvider = "anthropic";
        }
        callback(items);
      }
    );
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an empty history instead of sending a trailing assistant turn", async () => {
    // 合成した「了解しました」assistant turn が末尾に残ると prefill 扱いになり、
    // Claude 4.6 以降は 400 を返す。送信前に弾く。
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { chatFollowUpWithOpenAI } = await import("@/background/openai");

    const result = await chatFollowUpWithOpenAI([], "ページの本文");

    expect(Result.isFailure(result)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a history whose last turn is from the assistant", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { chatFollowUpWithOpenAI } = await import("@/background/openai");

    const result = await chatFollowUpWithOpenAI(
      [
        { content: "質問", role: "user" },
        { content: "回答", role: "assistant" },
      ],
      "ページの本文"
    );

    expect(Result.isFailure(result)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the request when the history ends with a user turn", async () => {
    let sentBody = "";
    const fetchSpy = vi.fn((_url: string, options?: unknown) => {
      const raw = (options as { body?: unknown } | undefined)?.body;
      sentBody = typeof raw === "string" ? raw : "";
      return Promise.resolve({
        json: () => Promise.resolve({ content: [{ text: "ok" }] }),
        ok: true,
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { chatFollowUpWithOpenAI } = await import("@/background/openai");

    const result = await chatFollowUpWithOpenAI(
      [{ content: "質問", role: "user" }],
      "ページの本文"
    );

    expect(Result.isSuccess(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(sentBody) as { messages: Array<{ role: string }> };
    expect(body.messages.at(-1)?.role).toBe("user");
  });
});
