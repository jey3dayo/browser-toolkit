import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import {
  compileSearchBlocklistPattern,
  matchesCompiledSearchBlocklistPattern,
  matchesSearchBlocklistPattern,
  normalizeSearchBlocklistPattern,
  validateSearchBlocklistRules,
} from "@/search-blocklist/rules";
import type { SearchBlocklistRule } from "@/search-blocklist/types";

describe("search-blocklist rules", () => {
  describe("matchesSearchBlocklistPattern", () => {
    it("matches host wildcard pattern against the apex and subdomains", () => {
      expect(
        matchesSearchBlocklistPattern(
          "*://*.example.com/*",
          "https://example.com/"
        )
      ).toBe(true);
      expect(
        matchesSearchBlocklistPattern(
          "*://*.example.com/*",
          "https://a.example.com/b"
        )
      ).toBe(true);
    });

    it("does not match an unrelated host that merely shares a suffix string", () => {
      expect(
        matchesSearchBlocklistPattern(
          "*://*.example.com/*",
          "https://notexample.com/"
        )
      ).toBe(false);
    });

    it("matches a path-scoped pattern only within that path", () => {
      expect(
        matchesSearchBlocklistPattern(
          "*://example.com/path/*",
          "https://example.com/path/x"
        )
      ).toBe(true);
      expect(
        matchesSearchBlocklistPattern(
          "*://example.com/path/*",
          "https://example.com/other"
        )
      ).toBe(false);
    });

    it("does not match and does not throw for a URL over the length limit", () => {
      const longPath = "a".repeat(2100);
      expect(() =>
        matchesSearchBlocklistPattern(
          "*://*.example.com/*",
          `https://example.com/${longPath}`
        )
      ).not.toThrow();
      expect(
        matchesSearchBlocklistPattern(
          "*://*.example.com/*",
          `https://example.com/${longPath}`
        )
      ).toBe(false);
    });

    it("does not match and does not throw for an unparsable URL", () => {
      expect(() =>
        matchesSearchBlocklistPattern("*://*.example.com/*", "not a url")
      ).not.toThrow();
      expect(
        matchesSearchBlocklistPattern("*://*.example.com/*", "not a url")
      ).toBe(false);
    });
  });

  describe("normalizeSearchBlocklistPattern", () => {
    it("normalizes a bare host into a host-wildcard match pattern", () => {
      const result = normalizeSearchBlocklistPattern("example.com");

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("*://*.example.com/*");
      }
    });

    it("fails for a regex-literal pattern (v1 unsupported)", () => {
      const result = normalizeSearchBlocklistPattern("/example\\.(net|org)/");

      expect(Result.isFailure(result)).toBe(true);
    });

    it("fails when the pattern exceeds the length limit", () => {
      const longPattern = `*://${"a".repeat(300)}.example.com/*`;
      const result = normalizeSearchBlocklistPattern(longPattern);

      expect(Result.isFailure(result)).toBe(true);
    });

    it("fails when the pattern contains 4 or more wildcards", () => {
      const result = normalizeSearchBlocklistPattern("*://*.example.com/*/*");

      expect(Result.isFailure(result)).toBe(true);
    });

    it("fails when the pattern contains userinfo", () => {
      const result = normalizeSearchBlocklistPattern(
        "*://user:pass@example.com/*"
      );

      expect(Result.isFailure(result)).toBe(true);
    });

    it("fails when the pattern contains a port", () => {
      const result = normalizeSearchBlocklistPattern("*://example.com:8080/*");

      expect(Result.isFailure(result)).toBe(true);
    });

    it("fails for a scheme other than http/https", () => {
      const result = normalizeSearchBlocklistPattern("ftp://example.com/*");

      expect(Result.isFailure(result)).toBe(true);
    });
  });

  describe("validateSearchBlocklistRules", () => {
    function buildRules(count: number): SearchBlocklistRule[] {
      return Array.from({ length: count }, (_, index) => ({
        createdAt: index,
        id: `rule-${index}`,
        pattern: `*://example-${index}.com/*`,
      }));
    }

    it("accepts exactly 2000 rules", () => {
      const result = validateSearchBlocklistRules(buildRules(2000));

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toHaveLength(2000);
      }
    });

    it("fails on the 2001st rule instead of silently truncating", () => {
      const rules = buildRules(2001);
      const result = validateSearchBlocklistRules(rules);

      expect(Result.isFailure(result)).toBe(true);
      expect(rules).toHaveLength(2001);
    });
  });

  describe("performance", () => {
    it("evaluates rule sets in roughly linear time relative to rule count", () => {
      const url = `https://example.com/${"a".repeat(500)}`;

      function timeMatching(ruleCount: number): number {
        const compiledPatterns = Array.from(
          { length: ruleCount },
          (_, index) => {
            const compiled = compileSearchBlocklistPattern(
              `*://*.example-${index}.com/*`
            );
            if (Result.isFailure(compiled)) {
              throw new Error("unexpected compile failure in benchmark setup");
            }
            return compiled.value;
          }
        );

        const start = performance.now();
        for (const compiled of compiledPatterns) {
          matchesCompiledSearchBlocklistPattern(compiled, url);
        }
        return performance.now() - start;
      }

      const smallDuration = timeMatching(200);
      const largeDuration = timeMatching(2000);
      const countRatio = 2000 / 200;

      expect(largeDuration).toBeLessThan(smallDuration * countRatio * 20 + 5);
    });
  });
});
