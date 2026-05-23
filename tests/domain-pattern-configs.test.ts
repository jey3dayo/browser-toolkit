import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import {
  getCurrentPatternRowFilterSetting,
  normalizeDomainPatternConfigs,
} from "@/domain-pattern-configs";

describe("domain-pattern-configs", () => {
  describe("normalizeDomainPatternConfigs", () => {
    it("normalizes current domainPatternConfigs and trims empty patterns", () => {
      const result = normalizeDomainPatternConfigs({
        domainPatternConfigs: [
          { pattern: " example.com/* ", enableRowFilter: true },
          { pattern: "   ", enableRowFilter: false },
        ],
      });

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual([
          { pattern: "example.com/*", enableRowFilter: true },
        ]);
      }
    });

    it("normalizes legacy domainPatterns with row filtering disabled", () => {
      const result = normalizeDomainPatternConfigs({
        domainPatterns: [" legacy.example/* ", ""],
      });

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual([
          { pattern: "legacy.example/*", enableRowFilter: false },
        ]);
      }
    });

    it("fails on malformed current config items", () => {
      const result = normalizeDomainPatternConfigs({
        domainPatternConfigs: [{ pattern: "example.com/*" }],
      });

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error).toBe("Invalid domainPatternConfig item format");
      }
    });
  });

  describe("getCurrentPatternRowFilterSetting", () => {
    it("matches URL patterns regardless of protocol", () => {
      const result = getCurrentPatternRowFilterSetting(
        [{ pattern: "example.com/path*", enableRowFilter: true }],
        "https://example.com/path/to/page"
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });
  });
});
