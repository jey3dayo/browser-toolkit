import { describe, expect, it } from "vitest";
import {
  buildCalendarArtifacts,
  buildGoogleCalendarUrl,
  buildGoogleCalendarUrlFailureMessage,
  normalizeEvent,
} from "@/background/calendar";
import type { ExtractedEvent } from "@/shared_types";

function baseEvent(overrides: Partial<ExtractedEvent> = {}): ExtractedEvent {
  return {
    title: "MTG",
    start: "2025-12-16",
    ...overrides,
  };
}

describe("src/background/calendar.ts", () => {
  describe("normalizeEvent", () => {
    it("splits a wave-separated datetime + time-only end", () => {
      const result = normalizeEvent(
        baseEvent({ title: "MTG", start: "2025-12-16 14:00〜15:00" })
      );
      expect(result.start).toBe("2025-12-16 14:00");
      expect(result.end).toBe("2025-12-16 15:00");
    });

    it("splits an ASCII-tilde-separated date-only range as all-day", () => {
      const result = normalizeEvent(
        baseEvent({ title: "旅行", start: "2025-12-16~2025-12-18" })
      );
      expect(result.start).toBe("2025-12-16");
      expect(result.end).toBe("2025-12-18");
      expect(result.allDay).toBe(true);
    });

    it("splits a ' - '-separated datetime range where the right side is a full datetime", () => {
      const result = normalizeEvent(
        baseEvent({
          title: "Call",
          start: "2025-12-16 14:00 - 2025-12-16 16:00",
        })
      );
      expect(result.start).toBe("2025-12-16 14:00");
      expect(result.end).toBe("2025-12-16 16:00");
    });

    it("passes start through unchanged when no separator pattern matches", () => {
      const result = normalizeEvent(
        baseEvent({ title: "Solo", start: "2025-12-16 14:00" })
      );
      expect(result.start).toBe("2025-12-16 14:00");
      expect(result.end).toBeUndefined();
    });

    it("skips normalization entirely when end is already present", () => {
      const result = normalizeEvent(
        baseEvent({
          title: "X",
          start: "2025-12-16 14:00〜15:00",
          end: "2025-12-16 15:30",
        })
      );
      expect(result.start).toBe("2025-12-16 14:00〜15:00");
      expect(result.end).toBe("2025-12-16 15:30");
    });

    it("defaults a blank/missing title to 予定", () => {
      const result = normalizeEvent(
        baseEvent({ title: "", start: "2025-12-16" })
      );
      expect(result.title).toBe("予定");
    });
  });

  describe("buildGoogleCalendarUrl", () => {
    it("builds an all-day dates param and trimmed text param", () => {
      const url = buildGoogleCalendarUrl(
        baseEvent({ title: "  旅行  ", start: "2025-12-16", allDay: true })
      );
      expect(url).not.toBeNull();
      const parsed = new URL(url ?? "");
      expect(parsed.searchParams.get("dates")).toBe("20251216/20251217");
      expect(parsed.searchParams.get("text")).toBe("旅行");
    });

    it("includes trimmed location and details params for a datetime event", () => {
      const url = buildGoogleCalendarUrl(
        baseEvent({
          start: "2025-12-16T10:00:00+09:00",
          end: "2025-12-16T11:00:00+09:00",
          location: "  会議室A  ",
          description: "  詳細  ",
        })
      );
      expect(url).not.toBeNull();
      const parsed = new URL(url ?? "");
      expect(parsed.searchParams.get("location")).toBe("会議室A");
      expect(parsed.searchParams.get("details")).toBe("詳細");
    });

    it("returns null when start is unparseable", () => {
      expect(buildGoogleCalendarUrl(baseEvent({ start: "" }))).toBeNull();
    });
  });

  describe("buildCalendarArtifacts", () => {
    it("builds only calendarUrl when targets is ['google']", () => {
      const result = buildCalendarArtifacts(baseEvent(), ["google"]);
      expect(result.calendarUrl).toBeDefined();
      expect(result.ics).toBeUndefined();
      expect(result.errors).toEqual([]);
    });

    it("builds only ics when targets is ['ics']", () => {
      const result = buildCalendarArtifacts(baseEvent(), ["ics"]);
      expect(result.ics?.startsWith("BEGIN:VCALENDAR")).toBe(true);
      expect(result.calendarUrl).toBeUndefined();
      expect(result.errors).toEqual([]);
    });

    it("collects two error messages when both targets fail", () => {
      const event = baseEvent({ start: "" });
      const result = buildCalendarArtifacts(event, ["google", "ics"]);
      expect(result.calendarUrl).toBeUndefined();
      expect(result.ics).toBeUndefined();
      expect(result.errors).toEqual([
        buildGoogleCalendarUrlFailureMessage(event),
        ".ics の生成に失敗しました",
      ]);
    });

    it("still populates eventText when targets is empty", () => {
      const result = buildCalendarArtifacts(baseEvent(), []);
      expect(result.calendarUrl).toBeUndefined();
      expect(result.ics).toBeUndefined();
      expect(result.errors).toEqual([]);
      expect(result.eventText.length).toBeGreaterThan(0);
    });
  });
});
