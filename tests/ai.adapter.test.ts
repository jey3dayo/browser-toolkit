import { describe, expect, it } from "vitest";
import { anthropicAdapter } from "@/ai/anthropic-adapter";
import { getAdapter } from "@/ai/get-adapter";
import { openaiAdapter } from "@/ai/openai-adapter";
import { zaiAdapter } from "@/ai/zai-adapter";
import { OPENAI_MODELS } from "@/constants/models";

describe("ai/adapter", () => {
  describe("getAdapter", () => {
    it("returns openai adapter for openai provider", () => {
      expect(getAdapter("openai")).toBe(openaiAdapter);
    });

    it("returns anthropic adapter for anthropic provider", () => {
      expect(getAdapter("anthropic")).toBe(anthropicAdapter);
    });

    it("returns zai adapter for zai provider", () => {
      expect(getAdapter("zai")).toBe(zaiAdapter);
    });
  });

  describe("openaiAdapter", () => {
    it("builds request with correct URL and headers", () => {
      const { url, init } = openaiAdapter.buildRequest("test-token", {
        messages: [{ content: "test", role: "user" }],
        model: OPENAI_MODELS.GPT_5_6_LUNA,
      });

      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      });
    });

    it("removes temperature for GPT-5 OpenAI models", () => {
      const { init } = openaiAdapter.buildRequest("test-token", {
        messages: [{ content: "test", role: "user" }],
        model: OPENAI_MODELS.GPT_5_6_TERRA,
        temperature: 0.2,
      });

      const body = JSON.parse(String(init.body)) as {
        model?: string;
        temperature?: number;
      };
      expect(body.model).toBe(OPENAI_MODELS.GPT_5_6_TERRA);
      expect(body.temperature).toBeUndefined();
    });

    it("keeps temperature for non GPT-5 OpenAI models", () => {
      const { init } = openaiAdapter.buildRequest("test-token", {
        messages: [{ content: "test", role: "user" }],
        model: "gpt-4o-mini",
        temperature: 0.2,
      });

      const body = JSON.parse(String(init.body)) as { temperature?: number };
      expect(body.temperature).toBe(0.2);
    });

    it("extracts text from valid response", () => {
      const response = {
        choices: [{ message: { content: "  Hello  " } }],
      };

      expect(openaiAdapter.extractText(response)).toBe("Hello");
    });

    it("returns null for invalid response", () => {
      expect(openaiAdapter.extractText(null)).toBeNull();
      expect(openaiAdapter.extractText({})).toBeNull();
      expect(openaiAdapter.extractText({ choices: [] })).toBeNull();
      expect(openaiAdapter.extractText({ choices: [{}] })).toBeNull();
    });

    it("extracts error message from error response", () => {
      const errorResponse = {
        error: { message: "API error occurred" },
      };

      expect(openaiAdapter.extractError(errorResponse, 400)).toBe(
        "API error occurred"
      );
    });

    it("returns default error message for invalid error response", () => {
      expect(openaiAdapter.extractError({}, 500)).toBe("OpenAI APIエラー: 500");
    });
  });

  describe("anthropicAdapter", () => {
    it("builds request with correct URL and headers", () => {
      const { url, init } = anthropicAdapter.buildRequest("test-token", {
        messages: [{ content: "test", role: "user" }],
        model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5",
      });

      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "x-api-key": "test-token",
      });
    });

    it("separates system messages in request body", () => {
      const { init } = anthropicAdapter.buildRequest("test-token", {
        messages: [
          { content: "You are helpful", role: "system" },
          { content: "Hello", role: "user" },
        ],
        model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5",
      });

      const body = JSON.parse(init.body as string);
      expect(body.system).toBe("You are helpful");
      expect(body.messages).toEqual([{ content: "Hello", role: "user" }]);
    });

    it("converts max_completion_tokens to max_tokens", () => {
      const { init } = anthropicAdapter.buildRequest("test-token", {
        max_completion_tokens: 100,
        messages: [{ content: "test", role: "user" }],
        model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5",
      });

      const body = JSON.parse(init.body as string);
      expect(body.max_tokens).toBe(100);
    });

    it("omits sampling params rejected by current Claude models", () => {
      // Claude 4.6 以降は temperature / top_p / top_k を受け付けず 400 を返す。
      // 共通呼び出し元（src/background/openai.ts）は temperature を常に載せるため、
      // adapter 側で落とす必要がある。
      const { init } = anthropicAdapter.buildRequest("test-token", {
        messages: [{ content: "test", role: "user" }],
        model: "claude-sonnet-5",
        temperature: 0.2,
      });

      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("top_p");
      expect(body).not.toHaveProperty("top_k");
      expect(body.model).toBe("claude-sonnet-5");
    });

    it("extracts text from valid response", () => {
      const response = {
        content: [{ text: "  Hello  " }],
      };

      expect(anthropicAdapter.extractText(response)).toBe("Hello");
    });

    it("returns null for invalid response", () => {
      expect(anthropicAdapter.extractText(null)).toBeNull();
      expect(anthropicAdapter.extractText({})).toBeNull();
      expect(anthropicAdapter.extractText({ content: [] })).toBeNull();
    });

    it("extracts error message from error response", () => {
      const errorResponse = {
        error: { message: "API error occurred" },
      };

      expect(anthropicAdapter.extractError(errorResponse, 400)).toBe(
        "API error occurred"
      );
    });

    it("returns default error message for invalid error response", () => {
      expect(anthropicAdapter.extractError({}, 500)).toBe(
        "Anthropic APIエラー: 500"
      );
    });
  });

  describe("zaiAdapter", () => {
    it("builds request with correct URL and headers", () => {
      const { url, init } = zaiAdapter.buildRequest("test-token", {
        messages: [{ content: "test", role: "user" }],
        model: "ZAI_MODELS.GLM_4_7",
      });

      expect(url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      });
    });

    it("extracts text from valid response", () => {
      const response = {
        choices: [{ message: { content: "  Hello  " } }],
      };

      expect(zaiAdapter.extractText(response)).toBe("Hello");
    });

    it("extracts error message from error response", () => {
      const errorResponse = {
        error: { message: "z.ai error occurred" },
      };

      expect(zaiAdapter.extractError(errorResponse, 400)).toBe(
        "z.ai error occurred"
      );
    });

    it("returns default error message for invalid error response", () => {
      expect(zaiAdapter.extractError({}, 500)).toBe("z.ai APIエラー: 500");
    });
  });
});
