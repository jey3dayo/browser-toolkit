import type {
  CalendarRegistrationTarget,
  ExtractedEvent,
} from "@/shared_types";
import {
  parseDateOnlyToYyyyMmDd,
  parseDateTimeLoose,
} from "@/utils/date_utils";
import { computeEventDateRange } from "@/utils/event_date_range";
import { buildIcs } from "@/utils/ics";

// Regex patterns at module level for performance (lint/performance/useTopLevelRegex)
const WAVE_SEPARATOR_REGEX = /^(.*?)\s*(?:〜|~|–|—)\s*(.*?)$/;
const DASH_SEPARATOR_REGEX = /^(.*?)\s+-\s+(.*?)$/;
const TIME_DASH_REGEX =
  /^(.+\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)$/;
const DATE_PREFIX_REGEX =
  /^(\d{4}-\d{1,2}-\d{1,2}|\d{4}\/\d{1,2}\/\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}[/-]\d{1,2}|\d{1,2}月\d{1,2}日)\s+/;
const TIME_ONLY_REGEX = /^(\d{1,2}:\d{2}(?::\d{2})?)$/;

export type CalendarArtifacts = {
  eventText: string;
  calendarUrl?: string;
  ics?: string;
  errors: string[];
};

type NormalizedEventRange = {
  start: string;
  end?: string;
  allDay?: true;
};

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function splitTextRange(value: string): [string, string] | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const waveMatch = normalized.match(WAVE_SEPARATOR_REGEX);
  if (waveMatch) {
    return [waveMatch[1].trim(), waveMatch[2].trim()];
  }
  const dashMatch = normalized.match(DASH_SEPARATOR_REGEX);
  if (dashMatch) {
    return [dashMatch[1].trim(), dashMatch[2].trim()];
  }
  const timeDashMatch = normalized.match(TIME_DASH_REGEX);
  if (timeDashMatch) {
    return [timeDashMatch[1].trim(), timeDashMatch[2].trim()];
  }
  return null;
}

function normalizeEventRange(
  start: string,
  end: string | undefined,
  allDay: true | undefined
): NormalizedEventRange {
  // モデルが `start: "2025-12-16 14:00〜15:00"` のようにレンジを一つの文字列に詰めるケースがあるため補正する。
  if (end || !start) {
    return { start, end, allDay };
  }

  const parts = splitTextRange(start);
  if (!parts) {
    return { start, end, allDay };
  }

  const [left, right] = parts;

  // date-only range: "2025-12-16〜2025-12-17"
  if (parseDateOnlyToYyyyMmDd(left) && parseDateOnlyToYyyyMmDd(right)) {
    return { start: left, end: right, allDay: allDay ?? true };
  }

  // datetime range with time-only end: "2025-12-16 14:00〜15:00"
  const leftDatePrefix = left.match(DATE_PREFIX_REGEX)?.[1];
  const rightTimeOnly = right.match(TIME_ONLY_REGEX)?.[1];

  if (leftDatePrefix && rightTimeOnly) {
    return { start: left, end: `${leftDatePrefix} ${rightTimeOnly}`, allDay };
  }
  if (parseDateTimeLoose(right)) {
    return { start: left, end: right, allDay };
  }

  return { start: left, end, allDay };
}

export function normalizeEvent(event: ExtractedEvent): ExtractedEvent {
  const title = normalizeOptionalText(event.title) ?? "予定";
  const rawStart = normalizeOptionalText(event.start) ?? "";
  const rawEnd = normalizeOptionalText(event.end);
  const rawAllDay = event.allDay === true ? true : undefined;
  const location = normalizeOptionalText(event.location);
  const description = normalizeOptionalText(event.description);

  const { start, end, allDay } = normalizeEventRange(
    rawStart,
    rawEnd,
    rawAllDay
  );
  return { title, start, end, allDay, location, description };
}

export function formatEventText(event: ExtractedEvent): string {
  const lines: string[] = [];
  lines.push(`タイトル: ${event.title}`);
  lines.push(`日時: ${event.start}${event.end ? ` 〜 ${event.end}` : ""}`);
  if (event.location) {
    lines.push(`場所: ${event.location}`);
  }
  if (event.description) {
    lines.push("");
    lines.push("概要:");
    lines.push(event.description);
  }
  return lines.join("\n");
}

export function buildGoogleCalendarUrlFailureMessage(
  event: ExtractedEvent
): string {
  return `日時の解析に失敗しました（Googleカレンダーリンクを生成できません）\nstart: ${event.start}${
    event.end ? `\nend: ${event.end}` : ""
  }`;
}

export function buildCalendarArtifacts(
  event: ExtractedEvent,
  targets: CalendarRegistrationTarget[]
): CalendarArtifacts {
  const errors: string[] = [];
  const eventText = formatEventText(event);

  let calendarUrl: string | undefined;
  if (targets.includes("google")) {
    const url = buildGoogleCalendarUrl(event);
    if (url) {
      calendarUrl = url;
    } else {
      errors.push(buildGoogleCalendarUrlFailureMessage(event));
    }
  }

  let ics: string | undefined;
  if (targets.includes("ics")) {
    const icsText = buildIcs(event);
    if (icsText) {
      ics = icsText;
    } else {
      errors.push(".ics の生成に失敗しました");
    }
  }

  return { eventText, calendarUrl, ics, errors };
}

type GoogleCalendarRange = NonNullable<
  ReturnType<typeof computeEventDateRange>
>;

function formatGoogleCalendarDates(range: GoogleCalendarRange): string {
  if (range.kind === "allDay") {
    return `${range.startYyyyMmDd}/${range.endYyyyMmDdExclusive}`;
  }
  return `${range.startUtc}/${range.endUtc}`;
}

function buildGoogleCalendarParams(
  event: ExtractedEvent,
  dates: string
): URLSearchParams {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title?.trim() || "予定",
    dates,
  });
  const details = event.description?.trim();
  if (details) {
    params.set("details", details);
  }
  const location = event.location?.trim();
  if (location) {
    params.set("location", location);
  }
  return params;
}

export function buildGoogleCalendarUrl(event: ExtractedEvent): string | null {
  const range = computeEventDateRange({
    start: event.start,
    end: event.end,
    allDay: event.allDay,
  });
  if (!range) {
    return null;
  }
  const dates = formatGoogleCalendarDates(range);
  const params = buildGoogleCalendarParams(event, dates);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
