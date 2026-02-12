import { describe, expect, it } from "vitest";
import { generateId } from "../src/utils/id_generator";

// Test regex patterns (top-level for performance)
const TEMPLATE_HELLO_WORLD_PATTERN = /^template:hello-world-[0-9a-f]{8}$/;
const GROUP_HASH_ONLY_PATTERN = /^group:[0-9a-f]{8}$/;
const TEMPLATE_HELLO_WORLD_123_PATTERN =
  /^template:hello-world-123-[0-9a-f]{8}$/;
const PREFIX_TEST_PATTERN = /^prefix:test-[0-9a-f]{8}$/;
const GROUP_TEST_PATTERN = /^group:test-[0-9a-f]{8}$/;
const TEMPLATE_TEST_PATTERN = /^template:test-[0-9a-f]{8}$/;

describe("generateId", () => {
  it("generates ID with ASCII name", () => {
    const id = generateId("Hello World", "template");
    expect(id).toMatch(TEMPLATE_HELLO_WORLD_PATTERN);
  });

  it("generates ID with Japanese name", () => {
    const id = generateId("お買い物", "group");
    // Non-ASCII characters are removed, so only hash remains
    expect(id).toMatch(GROUP_HASH_ONLY_PATTERN);
  });

  it("generates consistent hash for same input", () => {
    const id1 = generateId("test", "prefix");
    const id2 = generateId("test", "prefix");
    expect(id1).toBe(id2);
  });

  it("generates different hash for different input", () => {
    const id1 = generateId("test1", "prefix");
    const id2 = generateId("test2", "prefix");
    expect(id1).not.toBe(id2);
  });

  it("handles special characters", () => {
    const id = generateId("Hello@World#123!", "template");
    expect(id).toMatch(TEMPLATE_HELLO_WORLD_123_PATTERN);
  });

  it("handles leading and trailing hyphens", () => {
    const id = generateId("-test-", "prefix");
    expect(id).toMatch(PREFIX_TEST_PATTERN);
  });

  it("uses different prefixes correctly", () => {
    const groupId = generateId("test", "group");
    const templateId = generateId("test", "template");
    expect(groupId).toMatch(GROUP_TEST_PATTERN);
    expect(templateId).toMatch(TEMPLATE_TEST_PATTERN);
    // Hash should be the same since input is the same
    expect(groupId.split("-").pop()).toBe(templateId.split("-").pop());
  });
});
