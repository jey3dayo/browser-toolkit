import { describe, expect, it } from "vitest";
import {
  ALLOWED_API_ORIGINS,
  isAllowedApiOrigin,
} from "@/constants/api-endpoints";

describe("API Endpoints Whitelist", () => {
  describe("isAllowedApiOrigin", () => {
    it("should allow OpenAI API", () => {
      expect(
        isAllowedApiOrigin("https://api.openai.com/v1/chat/completions")
      ).toBe(true);
    });

    it("should allow Anthropic API", () => {
      expect(isAllowedApiOrigin("https://api.anthropic.com/v1/messages")).toBe(
        true
      );
    });

    it("should allow z.ai API", () => {
      expect(
        isAllowedApiOrigin("https://api.z.ai/api/paas/v4/chat/completions")
      ).toBe(true);
    });

    it("should reject unknown API origins", () => {
      expect(isAllowedApiOrigin("https://evil.com/api")).toBe(false);
      expect(isAllowedApiOrigin("https://api.malicious.com/v1")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isAllowedApiOrigin("not-a-url")).toBe(false);
      expect(isAllowedApiOrigin("javascript:alert(1)")).toBe(false);
    });

    it("should reject subdomain attacks", () => {
      expect(isAllowedApiOrigin("https://api.openai.com.evil.com/")).toBe(
        false
      );
      expect(isAllowedApiOrigin("https://evil.com/api.openai.com")).toBe(false);
    });
  });

  describe("ALLOWED_API_ORIGINS", () => {
    it("should contain exactly 3 allowed origins", () => {
      expect(ALLOWED_API_ORIGINS).toHaveLength(3);
    });

    it("should contain OpenAI, Anthropic, and z.ai", () => {
      expect(ALLOWED_API_ORIGINS).toContain("https://api.openai.com");
      expect(ALLOWED_API_ORIGINS).toContain("https://api.anthropic.com");
      expect(ALLOWED_API_ORIGINS).toContain("https://api.z.ai");
    });
  });
});
