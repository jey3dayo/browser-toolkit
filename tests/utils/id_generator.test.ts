import { describe, expect, it } from "vitest";
import { generateId } from "@/utils/id_generator";

const PREFIX_PATTERN = /^myprefix:/;
const GROUP_PATTERN = /^group:/;
const TEMPLATE_HELLO_PATTERN = /^template:hello-world/;
const HASH_ONLY_PATTERN = /^special:[0-9a-f]{8}$/;

describe("generateId", () => {
  it("generates consistent IDs for the same input", () => {
    const id1 = generateId("test", "prefix");
    const id2 = generateId("test", "prefix");
    expect(id1).toBe(id2);
  });

  it("generates different IDs for different inputs", () => {
    const id1 = generateId("test1", "prefix");
    const id2 = generateId("test2", "prefix");
    expect(id1).not.toBe(id2);
  });

  it("includes prefix in generated ID", () => {
    const id = generateId("test", "myprefix");
    expect(id).toMatch(PREFIX_PATTERN);
  });

  it("handles Japanese characters", () => {
    const id1 = generateId("お買い物", "group");
    const id2 = generateId("お買い物", "group");
    expect(id1).toBe(id2);
    expect(id1).toMatch(GROUP_PATTERN);
  });

  it("handles spaces and special characters", () => {
    const id = generateId("Hello World!", "template");
    expect(id).toMatch(TEMPLATE_HELLO_PATTERN);
  });

  it("handles special characters like @#!", () => {
    const id = generateId("Hello@World#123!", "template");
    expect(id).toBe("template:hello-world-123-14ac1112");
  });

  it("handles leading and trailing hyphens", () => {
    const id = generateId("-test-", "prefix");
    expect(id).toBe("prefix:test-535c61ce");
  });

  it("pins specific hash outputs for fixed inputs", () => {
    expect(generateId("test", "prefix")).toBe("prefix:test-00364492");
    expect(generateId("Hello World", "template")).toBe(
      "template:hello-world-3369657c"
    );
    expect(generateId("お買い物", "group")).toBe("group:1809f912");
    expect(generateId("", "empty")).toBe("empty:00000000");
  });

  it("generates hash-only ID for empty slug", () => {
    const id = generateId("!@#$%", "special");
    expect(id).toMatch(HASH_ONLY_PATTERN);
    expect(id).not.toContain("-");
  });
});
