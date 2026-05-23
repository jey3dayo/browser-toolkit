import type { CalendarRegistrationTarget } from "@/shared_types";

export const DEFAULT_CALENDAR_TARGETS: CalendarRegistrationTarget[] = [
  "google",
  "ics",
];

const VALID_TARGETS = new Set<CalendarRegistrationTarget>(["google", "ics"]);

function normalizeCalendarTargets(
  value: unknown
): CalendarRegistrationTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const targets: CalendarRegistrationTarget[] = [];
  const seen = new Set<CalendarRegistrationTarget>();
  for (const item of value) {
    const target = item as CalendarRegistrationTarget;
    if (!VALID_TARGETS.has(target)) {
      continue;
    }
    if (!seen.has(target)) {
      seen.add(target);
      targets.push(target);
    }
  }
  return targets;
}

export function resolveCalendarTargets(
  value: unknown
): CalendarRegistrationTarget[] {
  if (typeof value === "undefined") {
    return DEFAULT_CALENDAR_TARGETS;
  }
  if (!Array.isArray(value)) {
    return DEFAULT_CALENDAR_TARGETS;
  }
  return normalizeCalendarTargets(value);
}
