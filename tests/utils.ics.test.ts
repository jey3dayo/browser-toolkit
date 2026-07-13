import { describe, expect, it } from "vitest";
import type { ExtractedEvent } from "@/shared_types";
import { buildIcs } from "@/utils/ics";

function baseEvent(overrides: Partial<ExtractedEvent> = {}): ExtractedEvent {
  return {
    title: "予定",
    start: "2025-12-16T10:00:00+09:00",
    end: "2025-12-16T11:00:00+09:00",
    ...overrides,
  };
}

describe("src/utils/ics.ts", () => {
  it("escapes special characters and strips \\r", () => {
    const ics = buildIcs(
      baseEvent({
        title: "A, B; C\\D\nE",
        description: "F, G; H\\I\nJ\r",
      })
    );
    expect(ics).not.toBeNull();
    const summaryLine = ics
      ?.split("\r\n")
      .find((line) => line.startsWith("SUMMARY:"));
    expect(summaryLine).toBe("SUMMARY:A\\, B\\; C\\\\D\\nE");
    const descriptionLine = ics
      ?.split("\r\n")
      .find((line) => line.startsWith("DESCRIPTION:"));
    expect(descriptionLine).toBe("DESCRIPTION:F\\, G\\; H\\\\I\\nJ");
    expect(ics).not.toContain("\r\n\r");
  });

  it("folds lines longer than 75 characters", () => {
    const longTitle = "A".repeat(100);
    const ics = buildIcs(baseEvent({ title: longTitle }));
    expect(ics).not.toBeNull();
    expect(ics).toContain("\r\n ");

    // Reconstruct the SUMMARY line by joining folded continuations back.
    const rawLines = (ics ?? "").split("\r\n");
    let reconstructed = "";
    let collecting = false;
    for (const line of rawLines) {
      if (line.startsWith("SUMMARY:")) {
        collecting = true;
        reconstructed = line.slice("SUMMARY:".length);
        continue;
      }
      if (collecting && line.startsWith(" ")) {
        reconstructed += line.slice(1);
        continue;
      }
      if (collecting) {
        break;
      }
    }
    expect(reconstructed).toBe(longTitle);
  });

  it("formats an all-day event with exclusive end date", () => {
    const ics = buildIcs(
      baseEvent({ allDay: true, start: "2025-12-16", end: undefined })
    );
    expect(ics).not.toBeNull();
    expect(ics).toContain("DTSTART;VALUE=DATE:20251216\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20251217\r\n");
  });

  it("formats a timed event converted to UTC", () => {
    const ics = buildIcs(
      baseEvent({
        start: "2025-12-16T10:00:00+09:00",
        end: "2025-12-16T11:00:00+09:00",
      })
    );
    expect(ics).not.toBeNull();
    expect(ics).toContain("DTSTART:20251216T010000Z\r\n");
    expect(ics).toContain("DTEND:20251216T020000Z\r\n");
  });

  it("returns null when the date range cannot be computed", () => {
    expect(buildIcs(baseEvent({ start: "" }))).toBeNull();
  });

  it("omits LOCATION/DESCRIPTION lines when those fields are empty", () => {
    const ics = buildIcs(baseEvent({ location: "", description: "" }));
    expect(ics).not.toBeNull();
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("has the expected VCALENDAR/VEVENT structure", () => {
    const ics = buildIcs(baseEvent());
    expect(ics).not.toBeNull();
    expect(ics?.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics?.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });
});
