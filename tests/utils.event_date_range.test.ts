import { describe, expect, it } from "vitest";
import { computeEventDateRange } from "@/utils/event_date_range";

describe("src/utils/event_date_range.ts", () => {
  it("computes an all-day range with default +1 day end when no end is given", () => {
    const range = computeEventDateRange({
      start: "2025-12-16",
      allDay: true,
    });
    expect(range).toEqual({
      kind: "allDay",
      startYyyyMmDd: "20251216",
      endYyyyMmDdExclusive: "20251217",
    });
  });

  it("corrects an all-day end that is equal to or before start", () => {
    const equalEnd = computeEventDateRange({
      start: "2025-12-16",
      end: "2025-12-16",
      allDay: true,
    });
    expect(equalEnd).toEqual({
      kind: "allDay",
      startYyyyMmDd: "20251216",
      endYyyyMmDdExclusive: "20251217",
    });

    const earlierEnd = computeEventDateRange({
      start: "2025-12-16",
      end: "2025-12-10",
      allDay: true,
    });
    expect(earlierEnd).toEqual({
      kind: "allDay",
      startYyyyMmDd: "20251216",
      endYyyyMmDdExclusive: "20251217",
    });
  });

  it("infers all-day from a date-only start without an explicit allDay flag", () => {
    const range = computeEventDateRange({ start: "2025-12-16" });
    expect(range?.kind).toBe("allDay");
  });

  it("passes through a valid multi-day all-day end unchanged", () => {
    const range = computeEventDateRange({
      start: "2025-12-16",
      end: "2025-12-20",
      allDay: true,
    });
    expect(range).toEqual({
      kind: "allDay",
      startYyyyMmDd: "20251216",
      endYyyyMmDdExclusive: "20251220",
    });
  });

  it("computes a datetime range with UTC conversion for an explicit end", () => {
    const range = computeEventDateRange({
      start: "2025-12-16T10:00:00+09:00",
      end: "2025-12-16T12:00:00+09:00",
    });
    expect(range).toEqual({
      kind: "dateTime",
      startUtc: "20251216T010000Z",
      endUtc: "20251216T030000Z",
    });
  });

  it("defaults a missing datetime end to +1 hour", () => {
    const range = computeEventDateRange({
      start: "2025-12-16T10:00:00+09:00",
    });
    expect(range).toEqual({
      kind: "dateTime",
      startUtc: "20251216T010000Z",
      endUtc: "20251216T020000Z",
    });
  });

  it("corrects a datetime end that is at or before start to +1 hour", () => {
    const range = computeEventDateRange({
      start: "2025-12-16T10:00:00+09:00",
      end: "2025-12-16T09:00:00+09:00",
    });
    expect(range).toEqual({
      kind: "dateTime",
      startUtc: "20251216T010000Z",
      endUtc: "20251216T020000Z",
    });
  });

  it("returns null for empty or unparseable start", () => {
    expect(computeEventDateRange({ start: "" })).toBeNull();
    expect(computeEventDateRange({ start: "not a date" })).toBeNull();
  });
});
