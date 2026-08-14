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
          { enableRowFilter: true, pattern: " example.com/* " },
          { enableRowFilter: false, pattern: "   " },
        ],
      });

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual([
          { enableRowFilter: true, pattern: "example.com/*" },
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
          { enableRowFilter: false, pattern: "legacy.example/*" },
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
        [{ enableRowFilter: true, pattern: "example.com/path*" }],
        "https://example.com/path/to/page"
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });
  });
});
