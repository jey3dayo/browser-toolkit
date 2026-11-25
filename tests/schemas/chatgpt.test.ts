import { describe, expect, it } from "vitest";
import { safeParseChatGptCredentials } from "@/schemas/chatgpt";

const BASE = {
  accessToken: "access",
  clientId: "client",
  email: null,
  idToken: "id",
  refreshToken: "refresh",
  scope: "openid",
  subject: "subject",
};

describe("safeParseChatGptCredentials", () => {
  it("parses credentials with expiresAtMs", () => {
    const parsed = safeParseChatGptCredentials({ ...BASE, expiresAtMs: 123 });
    expect(parsed?.expiresAtMs).toBe(123);
  });

  it("maps the legacy expiresAt field to expiresAtMs", () => {
    const parsed = safeParseChatGptCredentials({ ...BASE, expiresAt: 456 });
    expect(parsed?.expiresAtMs).toBe(456);
  });

  it("prefers expiresAtMs when both fields are present", () => {
    const parsed = safeParseChatGptCredentials({
      ...BASE,
      expiresAt: 456,
      expiresAtMs: 789,
    });
    expect(parsed?.expiresAtMs).toBe(789);
  });

  it("rejects credentials without any expiry field", () => {
    expect(safeParseChatGptCredentials({ ...BASE })).toBeNull();
  });
});
