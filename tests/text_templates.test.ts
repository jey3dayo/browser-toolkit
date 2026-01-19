import { describe, expect, it } from "vitest";
import { generateTemplateId } from "@/text_templates";

const HASH_PATTERN = /^template:[0-9a-f]{8}$/;

describe("generateTemplateId", () => {
  it("generates slug for ASCII titles", () => {
    expect(generateTemplateId("LGTM")).toBe("template:lgtm");
    expect(generateTemplateId("greptile review")).toBe(
      "template:greptile-review"
    );
    expect(generateTemplateId("Code Review")).toBe("template:code-review");
  });

  it("generates hash for non-ASCII titles", () => {
    const id1 = generateTemplateId("お願いします");
    const id2 = generateTemplateId("よろしく");
    const id3 = generateTemplateId("お願いします"); // Same as id1

    // Should start with template:
    expect(id1).toMatch(HASH_PATTERN);
    expect(id2).toMatch(HASH_PATTERN);

    // Different titles should have different IDs
    expect(id1).not.toBe(id2);

    // Same title should have same ID
    expect(id1).toBe(id3);
  });

  it("generates hash for mixed non-ASCII titles", () => {
    const id1 = generateTemplateId("こんにちは 世界");
    const id2 = generateTemplateId("你好世界");

    expect(id1).toMatch(HASH_PATTERN);
    expect(id2).toMatch(HASH_PATTERN);
    expect(id1).not.toBe(id2);
  });

  it("handles titles with special characters", () => {
    expect(generateTemplateId("Code-Review!!!")).toBe("template:code-review");
    expect(generateTemplateId("@greptile review")).toBe(
      "template:greptile-review"
    );
  });

  it("handles empty title gracefully", () => {
    const id = generateTemplateId("");
    expect(id).toMatch(HASH_PATTERN);
  });

  it("handles titles with only special characters", () => {
    const id = generateTemplateId("!!!");
    expect(id).toMatch(HASH_PATTERN);
  });
});
