import { describe, expect, it, vi } from "vitest";
import type { ChatRequestBody } from "@/ai/adapter";
import { createOpenAiCompatibleAdapter } from "@/ai/openai-compatible-adapter";
import { zaiAdapter } from "@/ai/zai-adapter";
import { OPENAI_MODELS } from "@/constants/models";

describe("Chat Completions wire adapter", () => {
  it("uses only the explicitly supplied provider request policy", () => {
    const prepareBody = vi.fn((request: ChatRequestBody) => ({
      ...request,
      temperature: 0.7,
    }));
    const adapter = createOpenAiCompatibleAdapter({
      baseUrl: "https://api.example.test/v1",
      label: "Example",
      prepareBody,
    });
    const body = {
      messages: [],
      model: OPENAI_MODELS.GPT_6_LUNA,
      temperature: 0.2,
    };
    const { url, init } = adapter.buildRequest("test-token", body);
    expect(prepareBody).toHaveBeenCalledExactlyOnceWith(body);
    expect(url).toBe("https://api.example.test/v1/chat/completions");
    expect(init).toEqual({
      body: JSON.stringify({ ...body, temperature: 0.7 }),
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(body.temperature).toBe(0.2);
    expect(adapter.extractError({}, 500)).toBe("Example APIエラー: 500");
  });

  it("keeps z.ai parameters even when a model name resembles OpenAI", () => {
    const body = {
      messages: [],
      model: OPENAI_MODELS.GPT_6_LUNA,
      temperature: 0.2,
    };
    const { init } = zaiAdapter.buildRequest("test-token", body);
    expect(init.body).toBe(JSON.stringify(body));
    expect(body.temperature).toBe(0.2);
  });
});
