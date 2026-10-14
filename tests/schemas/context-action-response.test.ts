import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import { isRunContextActionResponse } from "@/schemas/context-action-response";

describe("isRunContextActionResponse", () => {
  it("accepts valid text response", () => {
    const valid = Result.succeed({
      resultType: "text" as const,
      source: "selection" as const,
      text: "Summary text",
    });

    expect(isRunContextActionResponse(valid)).toBe(true);
  });

  it("accepts valid event response", () => {
    const valid = Result.succeed({
      eventText: "Event details",
      resultType: "event" as const,
      source: "page" as const,
    });

    expect(isRunContextActionResponse(valid)).toBe(true);
  });

  it("accepts valid failure response", () => {
    const valid = Result.fail("Error message");

    expect(isRunContextActionResponse(valid)).toBe(true);
  });

  it("rejects Result.succeed(undefined)", () => {
    const invalid = Result.succeed(undefined);

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects success with missing text field", () => {
    const invalid = Result.succeed({
      resultType: "text" as const,
      source: "selection" as const,
      // missing text
    });

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects success with missing eventText field", () => {
    const invalid = Result.succeed({
      resultType: "event" as const,
      source: "viewport" as const,
      // missing eventText
    });

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects success with missing source field", () => {
    const invalid = Result.succeed({
      resultType: "text" as const,
      text: "Summary",
      // missing source
    });

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects success with invalid source value", () => {
    const invalid = Result.succeed({
      resultType: "text" as const,
      source: "invalid-source",
      text: "Summary",
    });

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects success with invalid resultType", () => {
    const invalid = Result.succeed({
      resultType: "invalid" as const,
      source: "selection" as const,
      text: "Summary",
    });

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects failure with non-string error", () => {
    const invalid = Result.fail(123);

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects failure with undefined error", () => {
    const invalid = Result.fail(undefined);

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects failure with object error", () => {
    const invalid = Result.fail({ message: "error" });

    expect(isRunContextActionResponse(invalid)).toBe(false);
  });

  it("rejects non-Result objects", () => {
    expect(isRunContextActionResponse({})).toBe(false);
    expect(isRunContextActionResponse({ type: "Success" })).toBe(false);
    expect(isRunContextActionResponse({ type: "Failure" })).toBe(false);
  });

  it("rejects primitives", () => {
    expect(isRunContextActionResponse(null)).toBe(false);
    expect(isRunContextActionResponse(undefined)).toBe(false);
    expect(isRunContextActionResponse("string")).toBe(false);
    expect(isRunContextActionResponse(123)).toBe(false);
    expect(isRunContextActionResponse(true)).toBe(false);
  });
});
