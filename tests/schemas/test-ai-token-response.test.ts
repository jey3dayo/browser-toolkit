import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import { isTestAiTokenResponse } from "@/schemas/test-ai-token-response";

describe("isTestAiTokenResponse", () => {
  it("accepts valid success response (void)", () => {
    const valid = Result.succeed(undefined);

    expect(isTestAiTokenResponse(valid)).toBe(true);
  });

  it("accepts valid failure response", () => {
    const valid = Result.fail("API error");

    expect(isTestAiTokenResponse(valid)).toBe(true);
  });

  it("rejects success with non-void value", () => {
    const invalid = Result.succeed("not void");

    expect(isTestAiTokenResponse(invalid)).toBe(false);
  });

  it("rejects success with object value", () => {
    const invalid = Result.succeed({ data: "something" });

    expect(isTestAiTokenResponse(invalid)).toBe(false);
  });

  it("rejects success with null value", () => {
    const invalid = Result.succeed(null);

    expect(isTestAiTokenResponse(invalid)).toBe(false);
  });

  it("rejects failure with non-string error", () => {
    const invalid = Result.fail(123);

    expect(isTestAiTokenResponse(invalid)).toBe(false);
  });

  it("rejects failure with undefined error", () => {
    const invalid = Result.fail(undefined);

    expect(isTestAiTokenResponse(invalid)).toBe(false);
  });

  it("rejects failure with object error", () => {
    const invalid = Result.fail({ code: 500, message: "error" });

    expect(isTestAiTokenResponse(invalid)).toBe(false);
  });

  it("rejects non-Result objects", () => {
    expect(isTestAiTokenResponse({})).toBe(false);
    expect(isTestAiTokenResponse({ type: "Success" })).toBe(false);
    expect(isTestAiTokenResponse({ type: "Failure" })).toBe(false);
  });

  it("rejects primitives", () => {
    expect(isTestAiTokenResponse(null)).toBe(false);
    expect(isTestAiTokenResponse(undefined)).toBe(false);
    expect(isTestAiTokenResponse("string")).toBe(false);
    expect(isTestAiTokenResponse(123)).toBe(false);
    expect(isTestAiTokenResponse(true)).toBe(false);
  });
});
