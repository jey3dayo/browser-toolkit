import { describe, expect, it } from "vitest";
import { generateTemplateId } from "@/text_templates";

// Pattern for slug-based IDs with hash suffix: template:slug-hash
const SLUG_HASH_PATTERN = /^template:[a-z0-9-]+-[0-9a-f]{8}$/;
// Pattern for hash-only IDs (non-ASCII titles): template:hash
const HASH_ONLY_PATTERN = /^template:[0-9a-f]{8}$/;
// Patterns for specific templates
const LGTM_PATTERN = /^template:lgtm-/;
const GREPTILE_REVIEW_PATTERN = /^template:greptile-review-/;
const CODE_REVIEW_PATTERN = /^template:code-review-/;

describe("generateTemplateId", () => {
  it("generates slug with hash suffix for ASCII titles", () => {
    const id1 = generateTemplateId("LGTM");
    const id2 = generateTemplateId("greptile review");
    const id3 = generateTemplateId("Code Review");

    // Should match slug-hash pattern
    expect(id1).toMatch(SLUG_HASH_PATTERN);
    expect(id2).toMatch(SLUG_HASH_PATTERN);
    expect(id3).toMatch(SLUG_HASH_PATTERN);

    // Should have readable slugs
    expect(id1).toMatch(LGTM_PATTERN);
    expect(id2).toMatch(GREPTILE_REVIEW_PATTERN);
    expect(id3).toMatch(CODE_REVIEW_PATTERN);
  });

  it("generates unique IDs even for similar titles", () => {
    const id1 = generateTemplateId("Hello World");
    const id2 = generateTemplateId("hello_world");

    // Both should match slug-hash pattern
    expect(id1).toMatch(SLUG_HASH_PATTERN);
    expect(id2).toMatch(SLUG_HASH_PATTERN);

    // Different titles should have different IDs (due to different hashes)
    expect(id1).not.toBe(id2);
  });

  it("generates hash-only IDs for non-ASCII titles", () => {
    const id1 = generateTemplateId("お願いします");
    const id2 = generateTemplateId("よろしく");
    const id3 = generateTemplateId("お願いします"); // Same as id1

    // Should match hash-only pattern
    expect(id1).toMatch(HASH_ONLY_PATTERN);
    expect(id2).toMatch(HASH_ONLY_PATTERN);

    // Different titles should have different IDs
    expect(id1).not.toBe(id2);

    // Same title should have same ID
    expect(id1).toBe(id3);
  });

  it("generates hash-only IDs for mixed non-ASCII titles", () => {
    const id1 = generateTemplateId("こんにちは 世界");
    const id2 = generateTemplateId("你好世界");

    expect(id1).toMatch(HASH_ONLY_PATTERN);
    expect(id2).toMatch(HASH_ONLY_PATTERN);
    expect(id1).not.toBe(id2);
  });

  it("handles titles with special characters", () => {
    const id1 = generateTemplateId("Code-Review!!!");
    const id2 = generateTemplateId("@greptile review");

    // Should match slug-hash pattern
    expect(id1).toMatch(SLUG_HASH_PATTERN);
    expect(id2).toMatch(SLUG_HASH_PATTERN);

    // Should have readable slugs
    expect(id1).toMatch(CODE_REVIEW_PATTERN);
    expect(id2).toMatch(GREPTILE_REVIEW_PATTERN);
  });

  it("handles empty title gracefully", () => {
    const id = generateTemplateId("");
    expect(id).toMatch(HASH_ONLY_PATTERN);
  });

  it("handles titles with only special characters", () => {
    const id = generateTemplateId("!!!");
    expect(id).toMatch(HASH_ONLY_PATTERN);
  });

  it("generates consistent IDs for same title", () => {
    const title = "Test Template";
    const id1 = generateTemplateId(title);
    const id2 = generateTemplateId(title);

    expect(id1).toBe(id2);
  });
});
