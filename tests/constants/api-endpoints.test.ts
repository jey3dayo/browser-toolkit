import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_API_ORIGINS,
  isAllowedApiOrigin,
} from "@/constants/api-endpoints";

const WHITESPACE_REGEX = /\s+/;

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

    it("should allow the OpenAI auth origin used by Sign in with ChatGPT", () => {
      expect(
        isAllowedApiOrigin("https://auth.openai.com/api/accounts/oauth/token")
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
    it("should contain exactly 4 allowed origins", () => {
      expect(ALLOWED_API_ORIGINS).toHaveLength(4);
    });

    it("should contain OpenAI, Anthropic, z.ai, and the OpenAI auth origin", () => {
      expect(ALLOWED_API_ORIGINS).toContain("https://api.openai.com");
      expect(ALLOWED_API_ORIGINS).toContain("https://api.anthropic.com");
      expect(ALLOWED_API_ORIGINS).toContain("https://api.z.ai");
      expect(ALLOWED_API_ORIGINS).toContain("https://auth.openai.com");
    });
  });

  describe("manifest.json content_security_policy sync", () => {
    const manifestPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../manifest.json"
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      content_security_policy?: { extension_pages?: string };
    };
    const connectSrcTokens =
      manifest.content_security_policy?.extension_pages
        ?.split(";")
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith("connect-src"))
        ?.split(WHITESPACE_REGEX)
        .slice(1) ?? [];

    it("should allow every whitelisted origin in the manifest connect-src", () => {
      for (const origin of ALLOWED_API_ORIGINS) {
        expect(connectSrcTokens).toContain(origin);
      }
    });
  });
});
