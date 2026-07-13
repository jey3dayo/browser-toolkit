# Plan 006: Add unit test coverage for the calendar-extract to .ics / Google Calendar URL chain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31dee9a..HEAD -- src/utils/ics.ts src/utils/event_date_range.ts src/background/calendar.ts src/schemas/extracted_event.ts src/utils/date_utils.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- Priority: P2
- Effort: M
- Risk: LOW
- Depends on: none
- Category: tests
- Planned at: commit `31dee9a`, 2026-07-14

## Why this matters

The calendar-extract feature (README headline feature: extract an event from selected text via AI, then generate a Google Calendar link and/or download a `.ics` file) has **zero test coverage** on its core logic. `grep -rn "background/calendar\|utils/ics\|utils/event_date_range" tests/` returns nothing; the only ICS string anywhere in `tests/` is a hardcoded literal in `tests/content.overlay_react.dom.test.ts:284`, not output from the real generator. These are pure, deterministic, timezone-sensitive functions — exactly the code most prone to silent off-by-one, all-day-boundary, and DST-adjacent bugs, and the cheapest code in the repo to unit-test (no chrome API mocking needed, unlike message-handler tests). Landing this plan gives a regression net for the date/range/escaping logic before anyone touches it again.

## Current state

- `src/utils/ics.ts` — `buildIcs(event: ExtractedEvent): string | null`. Builds an RFC5545 VCALENDAR string.
  - `escapeIcsText` (lines 15-21): escapes `\` → `\\`, `\n` → `\n` (literal backslash-n), `;` → `\;`, `,` → `\,`, strips `\r`. Order matters: backslash escaped first, so a literal `\n` in input is NOT double-escaped weirdly — check by reading the replace order top to bottom.
  - `foldLine` (lines 23-33): folds any line longer than 75 **characters** (not octets — treat as chars for this codebase) into continuation lines joined by `\r\n ` (CRLF + one space), each chunk `max=75` chars.
  - Lines 44-51: `DTSTART`/`DTEND` use `;VALUE=DATE:<YYYYMMDD>` for all-day (`range.kind === "allDay"`), or plain `DTSTART:<UTC>`/`DTEND:<UTC>` for datetime (`range.kind === "dateTime"`).
  - Returns `null` if `computeEventDateRange` returns `null` (line 40-42) or if `formatUtcDateTimeFromDate(new Date())` fails (line 58-60 — this branch is effectively unreachable with a valid `Date`, don't force it).
  - Output ends with a trailing `\r\n` (line 79) and uses `\r\n` as the line separator throughout — assert on exact `\r\n`, not `\n`.
  - Empty `location`/`description` produce no `LOCATION:`/`DESCRIPTION:` line at all (falsy-filtered on line 73-74, 77).

- `src/utils/event_date_range.ts` — `computeEventDateRange(params: { start: string; end?: string; allDay?: boolean }): EventDateRange | null`. Returns `{ kind: "allDay"; startYyyyMmDd; endYyyyMmDdExclusive }` or `{ kind: "dateTime"; startUtc; endUtc }`, or `null`.
  - All-day is chosen when `params.allDay === true` OR `start` parses as a date-only string via `parseDateOnlyToYyyyMmDd` (line 91 of event_date_range.ts).
  - All-day end-date logic (`computeAllDayDateRange`, lines 14-52): if no usable end date, `endDate = nextDateYyyyMmDd(startDate)` (exclusive end = start + 1 day). If `endDate <= startDate` (e.g. caller passed end === start, or an earlier date), it's corrected to `nextDateYyyyMmDd(startDate)` (line 43-45). This is the "all-day exclusive-end" boundary — test both the default (+1 day when no end) and the correction (end <= start gets bumped).
  - Datetime logic (`computeDateTimeRange`, lines 54-75): if `end` is missing or parses to a Date `<=` `start`, `endDate = addHours(startDate, 1)` (default 1-hour duration / correction). `formatUtcDateTimeFromDate` converts local-parsed `Date` to UTC `YYYYMMDDTHHMMSSZ` string — this is where timezone conversion happens (the test process runs in whatever TZ the CI/dev machine is in; use inputs with explicit UTC offsets, e.g. `"2025-12-16T10:00:00+09:00"`, to make the UTC output deterministic regardless of runner TZ — see `tests/date_utils.test.ts:21-25` for the same pattern already in use).
  - Returns `null` if `start` is empty after `.trim()` (line 83-85), or if neither all-day nor datetime parsing succeeds.

- `src/background/calendar.ts`:
  - `normalizeEventRange(start, end, allDay): NormalizeEventRangeResult` (lines 61-102, **not exported** — test it indirectly through `normalizeEvent`, which IS exported at line 104). Handles LLM outputs that cram a range into `start`, e.g. `"2025-12-16 14:00〜15:00"`. Splits on `〜`/`~`/`–`/`—` (`WAVE_SEPARATOR_REGEX`) or `" - "` (`DASH_SEPARATOR_REGEX` / `TIME_DASH_REGEX`). Only runs when `end` is falsy and `start` is truthy (line 69: `if (end || !start) return Result.fail(baseRange)` — i.e. normalization is skipped, original values passed through unchanged, when `end` is already present).
    - date-only both sides → `{ start: left, end: right, allDay: true }` (or existing `allDay` if already true).
    - datetime left + time-only right (e.g. `"2025-12-16 14:00"` / `"15:00"`) → right becomes `"<left's date prefix> 15:00"`.
    - full datetime right (`parseDateTimeLoose(right)` succeeds) → `{ start: left, end: right, allDay }` as-is.
    - none of the above → `{ start: left, end, allDay }` (end stays as original, i.e. `undefined` since we only get here when `end` was falsy) — verify this exact fallback by reading lines 97-101 again if unsure; do not guess.
  - `normalizeEvent(event: ExtractedEvent): ExtractedEvent` (line 104) — defaults `title` to `"予定"` when blank/missing, defaults `start` to `""`, calls `normalizeEventRange`, and on failure (`Result.isFailure`) falls back to `rangeResult.error` (the original values unchanged) rather than the input becoming garbage.
  - `buildGoogleCalendarUrl(event: ExtractedEvent): string | null` (line 203) — returns `null` if `computeEventDateRange` returns `null`; otherwise builds `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...` with optional `details`/`location` params. `dates` format: `"<start>/<end>"` — either `YYYYMMDD/YYYYMMDD` (all-day) or `<UTC>/<UTC>` (datetime), per `formatGoogleCalendarDates` (lines 176-181). Verify param encoding with `new URL(url).searchParams.get("text")` etc. rather than string-matching the raw query, since `URLSearchParams` encoding details (e.g. `%20` vs `+`) are an implementation detail you should not hardcode into assertions.
  - `buildCalendarArtifacts(event, targets: CalendarRegistrationTarget[]): CalendarArtifacts` (line 142) — orchestrates: always builds `eventText` (via `formatEventText`); builds `calendarUrl` only if `targets.includes("google")`, pushing `buildGoogleCalendarUrlFailureMessage(event)` into `errors` on failure; builds `ics` only if `targets.includes("ics")`, pushing `".ics の生成に失敗しました"` into `errors` on failure. `CalendarRegistrationTarget` is `"google" | "ics"` per `src/shared_types` (confirm the literal union there if uncertain — do not assume additional members).

- `src/schemas/extracted_event.ts` — `ExtractedEvent` shape consumed by all of the above: `{ title: string; start: string; end?: string; allDay?: boolean; location?: string; description?: string }`.

- Repo conventions / exemplar test: `tests/date_utils.test.ts` (already in the repo) is the structural pattern to imitate — plain `describe`/`it`/`expect` from `vitest`, `@/...` path-alias imports, one `describe` block per source file named after the file path (e.g. `describe("src/utils/date_utils.ts", ...)`), and the explicit-UTC-offset trick at lines 21-25 to avoid TZ flakiness. Match this style exactly in the three new test files.

## Commands you will need

| Purpose        | Command                                                                        | Expected on success                       |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| Install        | `pnpm install`                                                                 | exit 0                                    |
| All tests      | `pnpm test`                                                                    | exit 0, all pass                          |
| Filtered tests | `pnpm test -- calendar` / `pnpm test -- ics` / `pnpm test -- event_date_range` | exit 0, only matching files run, all pass |
| Typecheck      | `pnpm run typecheck`                                                           | exit 0, no errors                         |
| Lint           | `pnpm run lint`                                                                | exit 0                                    |

## Scope

#### In scope (the only files you should create)

- `tests/utils.ics.test.ts` (create)
- `tests/utils.event_date_range.test.ts` (create)
- `tests/background.calendar.test.ts` (create)
- `plans/README.md` (status row update only, if it exists)

#### Out of scope (do NOT touch, even though you are reading them closely)

- `src/utils/ics.ts`, `src/utils/event_date_range.ts`, `src/background/calendar.ts`, `src/schemas/extracted_event.ts`, `src/utils/date_utils.ts` — read-only. If writing a test surfaces what looks like a real bug (e.g. an off-by-one, an unreachable branch that should be reachable, wrong escaping order), **do not fix it** — write the test asserting the ACTUAL current behavior (even if it looks surprising), and separately report the suspected bug in your final summary. Do not silently "correct" the test to hide a real defect, and do not edit production code under this plan.
- Any other test file under `tests/` — do not modify existing tests.
- `manifest.json`, `package.json`, build config — unrelated to this plan.

## Git workflow

- Branch: `advisor/006-calendar-ics-test-coverage`
- Commit per new test file (or one commit for all three if that matches how you work) — conventional commits style matching `git log`, e.g. `test(calendar): add coverage for ics/event_date_range/calendar builders`. No footer/signature.
- Do NOT push or open a PR unless explicitly instructed.

## Steps

### Step 1: Write `tests/utils.ics.test.ts`

Cover `buildIcs` from `src/utils/ics.ts`. Import via `@/utils/ics`. Use a minimal valid `ExtractedEvent` (import type from `@/shared_types`) as your base fixture and vary fields per case. Cases:

1. Special-character escaping: an event whose `title`/`description` contains `,`, `;`, `\`, and an embedded `\n`. Assert the `SUMMARY:`/`DESCRIPTION:` line contains the escaped forms (`\,`, `\;`, `\\`, `\n`-as-two-chars) and that a raw `\r` in the input does not survive into the output.
2. 75-char line folding boundary: a `title` long enough that the folded `SUMMARY:` line must wrap (e.g. 100+ ASCII chars). Assert the output contains `\r\n ` (CRLF + single space) as a continuation marker, and that no single physical line inside the ICS payload (when split on `\r\n`, treating a line starting with a space as a continuation of the previous) exceeds 75 characters before folding logic is applied — concretely: assert the raw unfolded line info by reconstructing (strip `\r\n ` continuations and rejoin) and comparing to the original unescaped/escaped title content.
3. All-day event formatting: `allDay: true`, `start: "2025-12-16"`, no `end`. Assert `DTSTART;VALUE=DATE:20251216` and `DTEND;VALUE=DATE:20251217` (exclusive end, +1 day per `nextDateYyyyMmDd`) appear as separate lines.
4. Timed (UTC) event formatting: `start: "2025-12-16T10:00:00+09:00"`, `end: "2025-12-16T11:00:00+09:00"`. Assert `DTSTART:20251216T010000Z` and `DTEND:20251216T020000Z` (UTC-converted, matching the `date_utils.test.ts:21-25` pattern for the +09:00 offset).
5. Null on invalid input: `start: ""` (or any input that makes `computeEventDateRange` return `null`) → `buildIcs` returns `null`.
6. Optional fields omitted: no `location`, no `description` → assert the output contains no `LOCATION:` or `DESCRIPTION:` line (use `.includes("LOCATION:")` / `.includes("DESCRIPTION:")` on the result string, false in both cases).
7. Assert the overall structure: result starts with `BEGIN:VCALENDAR\r\n`, ends with `END:VCALENDAR\r\n`, and contains `VERSION:2.0`, `BEGIN:VEVENT`, `END:VEVENT`.

Verify: `pnpm test -- ics` → all new tests pass, exit 0.

### Step 2: Write `tests/utils.event_date_range.test.ts`

Cover `computeEventDateRange` from `src/utils/event_date_range.ts`. Cases:

1. All-day, no end: `{ start: "2025-12-16", allDay: true }` → `{ kind: "allDay", startYyyyMmDd: "20251216", endYyyyMmDdExclusive: "20251217" }`.
2. All-day, end before or equal to start gets corrected: `{ start: "2025-12-16", end: "2025-12-16", allDay: true }` → `endYyyyMmDdExclusive: "20251217"` (corrected per lines 43-45). Also test `end` strictly before `start` (e.g. `end: "2025-12-10"`) → same correction to `"20251217"`.
3. All-day inferred from date-only `start` without explicit `allDay`: `{ start: "2025-12-16" }` (no `allDay` field) → still `kind: "allDay"` (per line 91: `Boolean(startDateOnly)` triggers all-day even if `allDay` is undefined).
4. All-day with valid multi-day end: `{ start: "2025-12-16", end: "2025-12-20", allDay: true }` → `endYyyyMmDdExclusive: "20251220"` (end passed through unchanged, no +1 adjustment, since `end > start`).
5. Datetime, explicit end, UTC conversion: `{ start: "2025-12-16T10:00:00+09:00", end: "2025-12-16T12:00:00+09:00" }` → `kind: "dateTime"`, `startUtc: "20251216T010000Z"`, `endUtc: "20251216T030000Z"`.
6. Datetime, no end defaults to +1 hour: `{ start: "2025-12-16T10:00:00+09:00" }` → `endUtc` is exactly one hour after `startUtc` (`"20251216T020000Z"`).
7. Datetime, end <= start gets corrected to +1 hour: `{ start: "2025-12-16T10:00:00+09:00", end: "2025-12-16T09:00:00+09:00" }` → `endUtc` becomes one hour after `startUtc`, not the (earlier) provided end.
8. Null on empty/unparseable start: `{ start: "" }` → `null`. `{ start: "not a date" }` → `null`.

Verify: `pnpm test -- event_date_range` → all new tests pass, exit 0.

### Step 3: Write `tests/background.calendar.test.ts`

Cover `normalizeEvent`, `buildGoogleCalendarUrl`, and `buildCalendarArtifacts` from `src/background/calendar.ts`, imported via `@/background/calendar`. Build a minimal `ExtractedEvent` fixture per case (import type from `@/shared_types`).

`normalizeEvent` cases (LLM range-string splitting):

1. Wave-separated datetime+time-only end: `{ title: "MTG", start: "2025-12-16 14:00〜15:00" }` → result `start: "2025-12-16 14:00"`, `end` equal to the same date prefix + `" 15:00"` (per lines 90-96 — the exact `leftDatePrefix` your regex captures from `"2025-12-16 14:00"`; verify by reading `DATE_PREFIX_REGEX` at line 19-20 of `calendar.ts` — it matches `\d{4}-\d{1,2}-\d{1,2}` followed by a space, so the captured prefix is `"2025-12-16"` and the expected `end` is `"2025-12-16 15:00"`).
2. Tilde-separated (ASCII `~`) date-only range: `{ title: "旅行", start: "2025-12-16~2025-12-18" }` → `start: "2025-12-16"`, `end: "2025-12-18"`, `allDay: true`.
3. `" - "`-separated datetime range where right is a full datetime: `{ title: "Call", start: "2025-12-16 14:00 - 2025-12-16 16:00" }` → `start: "2025-12-16 14:00"`, `end: "2025-12-16 16:00"` (via `parseDateTimeLoose(right)` succeeding, lines 97-99).
4. No range in `start`, no `end` provided, none of the separator patterns match: `{ title: "Solo", start: "2025-12-16 14:00" }` (no separator at all) → `splitTextRange` returns `null`, so `normalizeEventRange` fails and `normalizeEvent` passes the original `start`/`end` through unchanged (`end` stays `undefined`).
5. `end` already present — normalization is skipped entirely: `{ title: "X", start: "2025-12-16 14:00〜15:00", end: "2025-12-16 15:30" }` → `start` and `end` are returned exactly as given (unchanged), because line 69 short-circuits (`if (end || !start) return Result.fail(...)`).
6. Blank/missing `title` defaults to `"予定"`: `{ title: "", start: "2025-12-16" }` → `normalizeEvent(...).title === "予定"`.

`buildGoogleCalendarUrl` cases: 7. All-day event → URL's `dates` param (parse via `new URL(url).searchParams.get("dates")`) equals `"<YYYYMMDD>/<YYYYMMDD+1>"`; `text` param equals the trimmed title. 8. Datetime event with `location` and `description` → `location` and `details` params are present and equal the trimmed input values (read via `URLSearchParams`, not raw string matching). 9. Invalid/unparseable `start` → returns `null`.

`buildCalendarArtifacts` cases: 10. `targets: ["google"]` with a valid event → result has `calendarUrl` set, `ics` is `undefined`, `errors` is empty. 11. `targets: ["ics"]` with a valid event → result has `ics` set (starts with `"BEGIN:VCALENDAR"`), `calendarUrl` is `undefined`, `errors` is empty. 12. `targets: ["google", "ics"]` with an event whose `start` is unparseable (e.g. `""`) → both `calendarUrl` and `ics` are `undefined`, and `errors` contains exactly 2 messages (one per failed target) — assert the exact two message strings from `buildGoogleCalendarUrlFailureMessage` output and the literal `".ics の生成に失敗しました"`. 13. `targets: []` → `calendarUrl` and `ics` both `undefined`, `errors` empty, `eventText` still populated (via `formatEventText`, always run).

Verify: `pnpm test -- calendar` → all new tests pass, exit 0. Note this filter may also match `tests/background.context_menu_calendar*` or similar existing files if present — check `pnpm test -- calendar` output lists your new file and no prior failures were introduced; if the filter is too broad, run the exact file instead: `pnpm test tests/background.calendar.test.ts`.

### Step 4: Full verification pass

Run the full suite and quality gates.

#### Verify

- `pnpm test` → exit 0, all tests pass including the 3 new files.
- `pnpm run typecheck` → exit 0.
- `pnpm run lint` → exit 0 (fix formatting/lint issues in your new test files only if it fails; do not touch other files).

## Test plan

(See Steps 1-3 above for the full enumerated case list per file.) Structural pattern to imitate: `tests/date_utils.test.ts` — plain `describe`/`it`/`expect`, `@/...` import aliases, one `describe("src/<path>.ts", ...)` block per file, explicit UTC-offset datetime strings to avoid timezone flakiness in CI. Verification: `pnpm test` → all pass including the new tests enumerated above (7 in ics, 8 in event_date_range, 13 in calendar — 28 new `it` cases total, adjust count only if you legitimately split/merge cases while keeping full coverage of the listed scenarios).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm test` exits 0; `tests/utils.ics.test.ts`, `tests/utils.event_date_range.test.ts`, `tests/background.calendar.test.ts` exist and all their cases pass
- [ ] `pnpm run lint` exits 0
- [ ] `git status --short` shows only the 3 new test files (and optionally `plans/README.md`) as changed — no `src/` file is modified
- [ ] `plans/README.md` status row for plan 006 updated (if `plans/README.md` exists)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations cited in "Current state" doesn't match the excerpts quoted here (drift since this plan was written at `31dee9a`).
- A step's verification (`pnpm test -- <filter>`) fails twice after a reasonable fix attempt on the TEST file itself.
- Reproducing one of the enumerated cases reveals the actual runtime behavior differs from what this plan predicted (e.g. a different `end` value than specified in step 3 case 1) — do NOT silently change the assertion to whatever value happens to come out without understanding why; re-derive the expected value from the source excerpts in "Current state" first. If it still doesn't match after re-deriving, STOP and report the discrepancy — this may indicate either a plan error or a real bug in `src/`.
- You find yourself needing to edit any file under `src/` to make a test pass — that means either the test assertion is wrong (fix the test) or there is a real bug (STOP and report; do not fix the bug under this plan).
- `parseDateTimeLoose`/`parseDateOnlyToYyyyMmDd` behave differently than assumed for a specific input string used in a test case (e.g. an ambiguous format is rejected) — swap to a clearer input string that exercises the same branch rather than fighting the parser, and note the substitution in your final report.

## Maintenance notes

- These tests lock in current behavior, including at least one path (Step 1 case 3 in `background.calendar.test.ts` fallback) that looks like it could be an intentional-but-subtle design choice (normalization no-op when no separator matches). If that behavior is ever intentionally changed, this test needs updating in the same PR — flag it to reviewers.
- If `normalizeEventRange` is ever exported directly from `src/background/calendar.ts`, these tests can be simplified to call it directly instead of going through `normalizeEvent`; not required now.
- Any future change to `escapeIcsText`'s escape order or `foldLine`'s fold width should re-run `tests/utils.ics.test.ts` case 1/2 specifically — they are sensitive to exact character counts.
- Out of scope for this plan, deferred: mocking `chrome.storage`/message-handler-level integration tests for the "extract → download .ics" end-to-end flow (that would need chrome API mocks, unlike these pure-function tests).
