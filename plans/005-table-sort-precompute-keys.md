# Plan 005: Precompute sort keys once per row in table-sort's `sortRows`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31dee9a..HEAD -- src/content/table-sort.ts`
> If this file changed since this plan was written, compare the
> "Current state" excerpt below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW-MED (must preserve tie-break semantics exactly)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `31dee9a`, 2026-07-14

## Why this matters

`sortRows` in `src/content/table-sort.ts` re-extracts `textContent` and
re-parses the numeric value for both operands on _every_ comparator call
during `Array.prototype.sort`, i.e. O(n·log n) text extraction + parsing
instead of O(n). For large tables (hundreds/thousands of rows, a realistic
case for this extension's target pages) this means redundant DOM property
reads and redundant numeric parsing on every comparison. Precomputing a
`{ row, text, num }` key once per row before sorting removes the redundant
work while keeping the exact same ordering behavior.

## Current state

- `src/content/table-sort.ts` — the only file to change. Not exported:
  `sortRows` (module-private, line ~100) and `sortTable` (module-private,
  line ~147). Exported: `enableSingleTable`, `enableTableSort`,
  `applyRowFiltering`.
- `src/utils/number_parser.ts` — exports `parseNumericValue(text: string): number`
  (returns `NaN` for non-numeric text). Do not modify this file; only call it.

Exact current code of `sortRows` (`src/content/table-sort.ts:100-120`):

```ts
function sortRows(
  rows: HTMLTableRowElement[],
  columnIndex: number,
  isAscending: boolean,
): void {
  rows.sort((a, b) => {
    const aCell = a.cells[columnIndex]?.textContent?.trim() ?? "";
    const bCell = b.cells[columnIndex]?.textContent?.trim() ?? "";

    const aNum = parseNumericValue(aCell);
    const bNum = parseNumericValue(bCell);

    if (!(Number.isNaN(aNum) || Number.isNaN(bNum))) {
      return isAscending ? aNum - bNum : bNum - aNum;
    }

    return isAscending
      ? aCell.localeCompare(bCell, "ja")
      : bCell.localeCompare(aCell, "ja");
  });
}
```

Semantics that MUST be preserved exactly:

- If BOTH parsed values are non-`NaN`: compare numerically —
  `isAscending ? aNum - bNum : bNum - aNum`.
- Otherwise (at least one side is non-numeric, i.e. mixed or fully textual
  column): compare with `localeCompare(..., "ja")` — ascending uses
  `aCell.localeCompare(bCell, "ja")`, descending uses
  `bCell.localeCompare(aCell, "ja")`.
- Missing cell → empty string via `?.textContent?.trim() ?? ""` (same
  fallback must apply when precomputing).

Caller (`sortTable`, `src/content/table-sort.ts:147-175`) that must remain
unchanged in its contract with `sortRows`:

```ts
function sortTable(
  table: HTMLTableElement,
  columnIndex: number,
  getRowFilterSetting?: () => Result.Result<boolean, string>,
): boolean {
  const tbody = table.querySelector("tbody") as HTMLTableSectionElement | null;
  const targetBody = tbody ?? table;
  const rows = Array.from(
    targetBody.querySelectorAll<HTMLTableRowElement>("tr"),
  ).filter((row) => row.parentNode === targetBody);

  const isAscending = table.dataset.sortOrder !== "asc";
  table.dataset.sortOrder = isAscending ? "asc" : "desc";

  resetHiddenRows(rows);
  sortRows(rows, columnIndex, isAscending);

  for (const row of rows) {
    targetBody.appendChild(row);
  }

  applyRowFilterIfEnabled({ rows, columnIndex, getRowFilterSetting });

  return isAscending;
}
```

`sortRows` currently mutates the `rows` array **in place** via
`Array.prototype.sort` (no return value — `sortTable` relies on `rows` being
reordered after the call, then re-appends in that order). The fix MUST keep
this in-place-mutation contract: `sortRows` still takes `rows` and reorders
it in place (e.g. by building the sorted array of rows internally and then
copying that order back into `rows` with `.length = 0; rows.push(...sorted)`
or `rows.splice(0, rows.length, ...sorted)`). Do not change `sortRows`'s
signature or return type, and do not change any line in `sortTable`,
`resetHiddenRows`, or `applyRowFilterIfEnabled`.

## Commands you will need

| Purpose   | Command              | Expected on success              |
| --------- | -------------------- | -------------------------------- |
| Install   | `pnpm install`       | exit 0                           |
| Typecheck | `pnpm run typecheck` | exit 0, no errors                |
| Tests     | `pnpm test -- table` | all tests in matching files pass |
| Full test | `pnpm test`          | all pass                         |
| Lint      | `pnpm run lint`      | exit 0                           |

(Verified from `package.json` scripts: `"typecheck": "tsc --noEmit"`,
`"test": "vitest run --project=node --project=dom --maxWorkers=1"`,
`"lint": "ultracite check"`.)

## Scope

**In scope** (the only files you should modify):

- `src/content/table-sort.ts`
- `tests/content.table_sort_a11y.dom.test.ts` (extend with new `describe`
  blocks — do not remove or alter the existing test)

**Out of scope** (do NOT touch, even though they look related):

- `src/content/table-observer.ts`, `src/content/table-auto-exec.ts` — not
  part of this finding.
- `applyRowFiltering` / `applyRowFilterIfEnabled` and the row-filtering path
  — separate concern, must keep calling with the same `rows` array
  reference after sort.
- `src/utils/number_parser.ts` — read-only dependency, do not modify.
- `tests/popup.table_sort_pane.dom.test.ts` — unrelated pane test.

## Git workflow

- Branch: `advisor/005-table-sort-precompute-keys`
- Commit message style (conventional commits, see `git log`): use
  `perf(content): precompute table sort keys once per row` as the summary.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create isolated branch

```bash
git checkout -b advisor/005-table-sort-precompute-keys
```

**Verify**: `git branch --show-current` → `advisor/005-table-sort-precompute-keys`

### Step 2: Rewrite `sortRows` to precompute keys once per row

Replace the body of `sortRows` (`src/content/table-sort.ts:100-120`) with a
Schwartzian-transform version. Target shape:

```ts
function sortRows(
  rows: HTMLTableRowElement[],
  columnIndex: number,
  isAscending: boolean,
): void {
  const keyed = rows.map((row) => {
    const text = row.cells[columnIndex]?.textContent?.trim() ?? "";
    return { row, text, num: parseNumericValue(text) };
  });

  keyed.sort((a, b) => {
    if (!(Number.isNaN(a.num) || Number.isNaN(b.num))) {
      return isAscending ? a.num - b.num : b.num - a.num;
    }

    return isAscending
      ? a.text.localeCompare(b.text, "ja")
      : b.text.localeCompare(a.text, "ja");
  });

  rows.splice(0, rows.length, ...keyed.map((entry) => entry.row));
}
```

Do not change the function signature (`rows: HTMLTableRowElement[], columnIndex: number, isAscending: boolean): void`).
Do not change any other function in the file.

**Verify**: `pnpm run typecheck` → exit 0, no errors.

### Step 3: Confirm no other caller depends on `sortRows` return value

```bash
grep -n "sortRows(" src/content/table-sort.ts
```

Expected: exactly two matches — the `function sortRows(` declaration and the
single call site inside `sortTable` (`sortRows(rows, columnIndex, isAscending);`),
and that call site does not use a return value (statement, no assignment).

**Verify**: output matches the above; if a third call site or a
return-value usage appears, STOP and report (see STOP conditions).

## Test plan

- Existing test to use as structural pattern: `tests/content.table_sort_a11y.dom.test.ts`
  (uses `createTable()` helper + `enableSingleTable` + `dispatchEvent`/`click`
  on `th`, then reads `tbody tr` cell text order). `sortRows`/`sortTable` are
  not exported, so all new tests MUST drive sorting through the exported
  `enableSingleTable` and a `click` (or `Enter` keydown) on the relevant `th`,
  then assert the resulting `tbody tr` row order — do not attempt to import
  or export `sortRows`/`sortTable` for direct testing (that would be a scope
  change requiring the export list to change, which is out of scope here).
- Add new tests to `tests/content.table_sort_a11y.dom.test.ts`, in a new
  `describe("table sort ordering", () => { ... })` block, covering:
  1. **Pure numeric column, ascending then descending**: table with a
     "Score" column of `["10", "2", "1"]`. Click header once → ascending
     numeric order `["1", "2", "10"]` (NOT lexicographic `["1","10","2"]`).
     Click again → descending `["10", "2", "1"]`.
  2. **Pure string column, Japanese locale ordering, ascending + descending**:
     a "Name" column with Japanese strings, e.g. `["う", "あ", "い"]`. Click
     once → `["あ", "い", "う"]`. Click again → `["う", "い", "あ"]`.
  3. **Mixed column (numeric-looking and non-numeric cells together)**: e.g.
     `["10", "apple", "2"]`. Because `parseNumericValue("apple")` is `NaN`,
     the current (and new) implementation falls back to
     `localeCompare(..., "ja")` for the WHOLE column, not per-pair numeric
     comparison. Assert the resulting order equals
     `["10", "2", "apple"].sort((a,b) => a.localeCompare(b,"ja"))` computed
     inline in the test (or hardcode the expected order after computing it
     once) — do not assume standard ASCII sort.
  4. **Missing/empty cell**: a row where the target column's `<td>` is
     absent or empty; the fallback `?? ""` must apply so the cell sorts as
     empty string, not throw. Add one such row to one of the above cases and
     assert it does not throw and lands in the correct position for
     `localeCompare("", other, "ja")`.
  5. **Characterization/regression check**: before writing Step 2's change,
     if time allows, run the NEW tests against the CURRENT (unmodified)
     `sortRows` first to confirm they pass against old behavior — this
     proves the tests capture existing semantics, not just the new code's
     output. If you already implemented Step 2 before writing tests, instead
     manually re-derive the expected order from the OLD comparator logic
     (quoted in "Current state" above) by hand for each case and hardcode
     that as the expected value — do not derive expectations from running
     the new code itself, or the test would be tautological.
- Verification: `pnpm test -- table` → all pass, including the new tests in
  `content.table_sort_a11y.dom.test.ts` (existing accessibility test must
  still pass unmodified). Then `pnpm test` → all pass (repo-wide regression
  check, since this is a shared content-script module).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm test` exits 0; new ordering tests exist in
      `tests/content.table_sort_a11y.dom.test.ts` and pass
- [ ] `pnpm run lint` exits 0
- [ ] `grep -n "sortRows(" src/content/table-sort.ts` shows exactly one
      declaration + one call site, call site is a bare statement (no
      assignment of a return value)
- [ ] No files outside the in-scope list are modified (`git status --short`)
- [ ] `plans/README.md` status row for plan 005 updated (create the row if
      `plans/README.md` does not exist yet — do not otherwise restructure
      that file)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at `src/content/table-sort.ts:100-120` or `:147-175` doesn't
  match the excerpts in "Current state" (drift since this plan was written).
- `pnpm run typecheck`, `pnpm test`, or `pnpm run lint` fails twice after a
  reasonable fix attempt.
- The fix appears to require exporting `sortRows` or `sortTable`, or
  touching any out-of-scope file.
- You discover that `sortRows`'s current in-place-mutation contract is not
  actually relied upon by `sortTable` (i.e. the assumption stated in
  "Current state" is false) — this would mean the refactor's safety argument
  needs to be redone.
- Any new test fails to reproduce the OLD comparator's ordering when checked
  by hand against the quoted old code — indicates a semantic mismatch, not
  just a code-style change, and must not be silently "fixed" by changing the
  expected order.

## Maintenance notes

- If `parseNumericValue` semantics change in `src/utils/number_parser.ts`
  in the future (e.g. to handle more numeric formats), the mixed-column test
  case (case 3 above) is the one most likely to need updated expectations —
  the fallback-to-localeCompare-when-any-side-is-NaN behavior is easy to
  regress.
- If a future change needs to test `sortRows` in isolation instead of via
  `enableSingleTable` + DOM events, that requires exporting it — flag that
  explicitly as a design decision to the reviewer, don't do it silently as
  part of a "test improvement."
- No follow-up work is deferred; this plan is self-contained and does not
change any other file's behavior.
</content>
