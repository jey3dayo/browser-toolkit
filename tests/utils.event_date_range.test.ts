import { describe, expect, it } from "vitest";
import { computeEventDateRange } from "@/utils/event_date_range";

describe("src/utils/event_date_range.ts", () => {
  it("computes an all-day range with default +1 day end when no end is given", () => {
    const range = computeEventDateRange({
      allDay: true,
      start: "2025-12-16",
    });
    expect(range).toEqual({
      endYyyyMmDdExclusive: "20251217",
      kind: "allDay",
      startYyyyMmDd: "20251216",
    });
  });

  it("corrects an all-day end that is equal to or before start", () => {
    const equalEnd = computeEventDateRange({
      allDay: true,
      end: "2025-12-16",
      start: "2025-12-16",
    });
    expect(equalEnd).toEqual({
      endYyyyMmDdExclusive: "20251217",
      kind: "allDay",
      startYyyyMmDd: "20251216",
    });

    const earlierEnd = computeEventDateRange({
      allDay: true,
      end: "2025-12-10",
      start: "2025-12-16",
    });
    expect(earlierEnd).toEqual({
      endYyyyMmDdExclusive: "20251217",
      kind: "allDay",
      startYyyyMmDd: "20251216",
    });
  });

  it("infers all-day from a date-only start without an explicit allDay flag", () => {
    const range = computeEventDateRange({ start: "2025-12-16" });
    expect(range?.kind).toBe("allDay");
  });

  it("passes through a valid multi-day all-day end unchanged", () => {
    const range = computeEventDateRange({
      allDay: true,
      end: "2025-12-20",
      start: "2025-12-16",
    });
    expect(range).toEqual({
      endYyyyMmDdExclusive: "20251220",
      kind: "allDay",
      startYyyyMmDd: "20251216",
    });
  });

  it("computes a datetime range with UTC conversion for an explicit end", () => {
    const range = computeEventDateRange({
      end: "2025-12-16T12:00:00+09:00",
      start: "2025-12-16T10:00:00+09:00",
    });
    expect(range).toEqual({
      endUtc: "20251216T030000Z",
      kind: "dateTime",
      startUtc: "20251216T010000Z",
    });
  });

  it("defaults a missing datetime end to +1 hour", () => {
    const range = computeEventDateRange({
      start: "2025-12-16T10:00:00+09:00",
    });
    expect(range).toEqual({
      endUtc: "20251216T020000Z",
      kind: "dateTime",
      startUtc: "20251216T010000Z",
    });
  });

  it("corrects a datetime end that is at or before start to +1 hour", () => {
    const range = computeEventDateRange({
      end: "2025-12-16T09:00:00+09:00",
      start: "2025-12-16T10:00:00+09:00",
    });
    expect(range).toEqual({
      endUtc: "20251216T020000Z",
      kind: "dateTime",
      startUtc: "20251216T010000Z",
    });
  });

  it("returns null for empty or unparseable start", () => {
    expect(computeEventDateRange({ start: "" })).toBeNull();
    expect(computeEventDateRange({ start: "not a date" })).toBeNull();
  });
});
