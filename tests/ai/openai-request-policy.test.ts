import { describe, expect, it } from "vitest";
import { prepareOpenAiRequestBody } from "@/ai/openai-request-policy";
import { OPENAI_MODELS } from "@/constants/models";

describe("OpenAI request policy", () => {
  it.each([
    OPENAI_MODELS.GPT_6_LUNA,
    OPENAI_MODELS.GPT_6_1_SOL,
    "gpt-5-custom",
  ])(
    "omits unsupported temperature for reasoning model %s without mutating input",
    (model) => {
      const body = {
        max_completion_tokens: 100,
        messages: [{ content: "test", role: "user" }],
        model,
        response_format: { type: "json_object" },
        temperature: 0.2,
      };
      expect(prepareOpenAiRequestBody(body)).toEqual({
        max_completion_tokens: 100,
        messages: body.messages,
        model,
        response_format: body.response_format,
      });
      expect(body.temperature).toBe(0.2);
    }
  );

  it("preserves parameters for arbitrary model strings outside the request policy", () => {
    const body = {
      messages: [],
      model: "custom-openai-model",
      temperature: 0.2,
    };
    expect(prepareOpenAiRequestBody(body)).toBe(body);
  });
});
