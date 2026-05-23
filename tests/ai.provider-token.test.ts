import { describe, expect, it } from "vitest";
import { getAiProviderToken, getAiProviderTokenKey } from "@/ai/provider-token";

describe("ai/provider-token", () => {
  it.each([
    ["openai", "openaiApiToken"],
    ["anthropic", "anthropicApiToken"],
    ["zai", "zaiApiToken"],
  ] as const)("maps %s to %s", (provider, key) => {
    expect(getAiProviderTokenKey(provider)).toBe(key);
  });

  it("reads provider-specific token values", () => {
    expect(
      getAiProviderToken(
        {
          openaiApiToken: "sk-openai",
          anthropicApiToken: "sk-anthropic",
          zaiApiToken: "sk-zai",
        },
        "anthropic"
      )
    ).toBe("sk-anthropic");
  });
});
