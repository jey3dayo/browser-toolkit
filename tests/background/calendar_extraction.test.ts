import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractCalendarArtifacts } from "@/background/calendar_extraction";
import {
  actionTarget,
  createContextActionHarness,
  eventDisplayText,
  extractedEvent,
} from "../helpers/contextActionHarness";

describe("extractCalendarArtifacts", () => {
  let harness: ReturnType<typeof createContextActionHarness>;

  beforeEach(() => {
    harness = createContextActionHarness();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds google and ics artifacts for the stored targets by default", async () => {
    harness.respondWithText(JSON.stringify(extractedEvent));

    const result = await extractCalendarArtifacts({ target: actionTarget });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.event).toEqual(extractedEvent);
      expect(result.value.targets).toEqual(["google", "ics"]);
      expect(result.value.eventText).toBe(eventDisplayText);
      expect(result.value.calendarUrl).toContain(
        "calendar.google.com/calendar/render"
      );
      expect(result.value.ics).toContain("BEGIN:VCALENDAR");
      expect(result.value.errors).toEqual([]);
    }
  });

  it("builds only eventText when targets is empty", async () => {
    harness.respondWithText(JSON.stringify(extractedEvent));

    const result = await extractCalendarArtifacts({
      target: actionTarget,
      targets: [],
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.calendarUrl).toBeUndefined();
      expect(result.value.ics).toBeUndefined();
      expect(result.value.errors).toEqual([]);
      expect(result.value.eventText).toBe(eventDisplayText);
    }
  });

  it("propagates provider failure", async () => {
    harness.respondWithError("Provider rejected request");

    const result = await extractCalendarArtifacts({ target: actionTarget });

    expect(result).toStrictEqual(Result.fail("Provider rejected request"));
  });
});
