# Plan 013: Honesty cleanups — correct keep-alive comment and skip obsolete e2e assertions

> **Executor instructions**: Follow step by step. Run every verification command.
> If any STOP condition occurs, stop and report. Do not improvise. Commit in the
> worktree per the git workflow. SKIP updating `plans/README.md` — the reviewer
> maintains the index.
>
> **Drift check (run first)**: `git diff --stat 425c15d..HEAD -- src/background.ts tests/e2e/table-sort.spec.ts tests/e2e/popup.spec.ts`
> If any changed since this plan was written, compare against "Current state"; on a mismatch, STOP.

## Status

- Priority: P3
- Effort: S
- Risk: LOW
- Depends on: none
- Category: docs / test-hygiene
- Planned at: commit `425c15d`, 2026-07-14

## Why this matters

Two low-risk "make misleading things honest" cleanups, bundled because each is a
few lines and neither changes runtime behavior:

1. Keep-alive comment is wrong. `src/background.ts:90-96` claims a 1-minute
   `chrome.alarms` ping is "十分" to prevent the MV3 service-worker 30-second idle
   timeout. A 60s interval cannot keep a worker that sleeps at 30s continuously
   alive; the claim is false. The extension works regardless (event listeners
   wake the SW on demand), so this is a documentation correctness fix.
2. Obsolete e2e assertions. `tests/e2e/table-sort.spec.ts:74`,
   `tests/e2e/popup.spec.ts:96`, and `:110` drive a `label:has-text("すべてのサイトで有効化")`
   ("enable on all sites") global toggle that was REMOVED in the table-pane
   refactor — the current TablePane uses `tablePane.enableCurrentTab` + a
   URL-pattern model instead, with no direct global-toggle replacement. These
   e2e specs are already excluded from `mise run ci` and would fail if run. They
   test a feature that no longer exists.

## Current state

- `src/background.ts:90-104` (verbatim):

  ```ts
  // Service Worker Keep-Alive
  // Manifest V3のService Workerは30秒でスリープするため、
  // chrome.alarmsを使って定期的にService Workerを起こし続ける
  // 注: chrome.alarms.create()のperiodInMinutesの最小値は1分
  // 1分間隔でもService Workerのタイムアウト（30秒）を防げるため十分
  if (typeof chrome !== "undefined" && chrome.alarms) {
    chrome.alarms.create("keep-alive", { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "keep-alive") {
        debugLog("background", "Service Worker keep-alive ping").catch(() => {
          // no-op
        });
      }
    });
  }
  ```

  Only the COMMENT is wrong; the code is fine and stays as-is (do NOT remove the
  alarm — removing it is a behavior change deferred out of this plan).

- `tests/e2e/table-sort.spec.ts` — around line 66–82 a test uses the removed
  global toggle purely as SETUP to enable table-sort before testing dynamic-table
  sortability:

  ```ts
  const globalToggle = popupPage.locator(
    'label:has-text("すべてのサイトで有効化")',
  );
  const checkbox = globalToggle.locator('input[type="checkbox"]');
  const isChecked = await checkbox.isChecked();
  if (!isChecked) {
    await globalToggle.click();
  }
  ```

- `tests/e2e/popup.spec.ts` — a test around line 82–115 adds a pattern (still
  valid) then exercises the removed global toggle at `:96` and `:110`
  (`label:has-text("すべてのサイトで有効化")` and its `input[type="checkbox"]`).

## Commands you will need

| Purpose   | Command                            | Expected                                   |
| --------- | ---------------------------------- | ------------------------------------------ |
| Install   | `pnpm install`                     | exit 0                                     |
| Typecheck | `pnpm run typecheck`               | exit 0                                     |
| Lint      | `pnpm run lint`                    | exit 0                                     |
| E2E list  | `pnpm exec playwright test --list` | lists tests; affected ones show as skipped |

(Do NOT run the full Playwright suite — it needs a built unpacked extension +
browser and is outside `mise run ci`. `--list` is enough to confirm the files
still parse and the skips register.)

## Scope

#### In scope

- `src/background.ts` — the keep-alive COMMENT only (lines 90–94).
- `tests/e2e/table-sort.spec.ts` — skip the test(s) that depend on the removed global toggle.
- `tests/e2e/popup.spec.ts` — skip the test(s) that depend on the removed global toggle.

#### Out of scope

- The keep-alive `chrome.alarms` code itself (do not remove/alter behavior).
- Any e2e test that does NOT reference the removed toggle — leave passing tests untouched.
- Rewriting the skipped e2e tests to the new URL-pattern UI model — that needs interactive browser verification and is deferred (note it in the TODO).

## Git workflow

- Branch: `advisor/013-honesty-cleanups-keepalive-e2e`
- Single commit, conventional commits: `docs: correct keep-alive comment and skip obsolete e2e tests`
- Do NOT push or open a PR.

## Steps

### Step 1: Correct the keep-alive comment

In `src/background.ts`, replace the comment block at lines 90–94 with an accurate
description. Suggested (keep it factual — a 60s alarm is a periodic wake, NOT a
continuous keep-alive that defeats the 30s idle timeout):

```ts
// Service Worker 定期ウェイク
// MV3 の Service Worker は約30秒のアイドルでスリープする。chrome.alarms の
// 最小間隔は1分のため、この alarm は30秒のアイドルタイムアウトを継続的に
// 防ぐものではない（間隔中に SW はスリープしうる）。イベントリスナーが必要時に
// SW を起こすため機能上の問題はなく、この alarm は定期的な heartbeat ログ用途で残している。
```

Do NOT change the `if (typeof chrome !== "undefined" && chrome.alarms) { ... }`
code below the comment.

Verify: `pnpm run typecheck` → exit 0; the alarm code is unchanged (`git diff src/background.ts` shows only comment lines changed).

### Step 2: Skip the obsolete e2e tests with a TODO

For each e2e `test(...)` block whose body references
`label:has-text("すべてのサイトで有効化")` (in `table-sort.spec.ts` and
`popup.spec.ts`), mark that test as skipped using Playwright's `test.skip(...)`
(change `test(` to `test.skip(` for that block) and add a one-line comment above
it:

```ts
// TODO(advisor/013): 「すべてのサイトで有効化」トグルは table-pane リファクタで
// 廃止され、URL パターン + enableCurrentTab モデルへ移行済み。このテストは
// 新モデル向けに書き直しが必要（要インタラクティブ検証）。
```

Do NOT attempt to rewrite the selectors to the new UI — that is explicitly out of
scope. Only skip + annotate. Leave any test that does not reference the removed
toggle exactly as-is.

Verify: `pnpm exec playwright test --list` → runs without a parse error and
shows the affected tests as skipped (or lists them; if `--list` does not mark
skips clearly, confirm via `rg "test.skip" tests/e2e`).

### Step 3: Lint

Verify: `pnpm run lint` → exit 0.

## Test plan

No new tests. This plan only corrects a comment and skips dead e2e tests.
Verification: `pnpm run typecheck` (unaffected), `pnpm run lint`, and
`pnpm exec playwright test --list` parses. `pnpm test` (the vitest unit/dom
suite) is unaffected by e2e-file changes but run it once to confirm no
accidental breakage.

## Done criteria

- [ ] The keep-alive comment no longer claims the 1-minute alarm prevents the 30s timeout; the alarm CODE is unchanged
- [ ] Every e2e test referencing `すべてのサイトで有効化` is marked `test.skip` with the TODO comment
- [ ] `rg "label:has-text\(\"すべてのサイトで有効化\"\)" tests/e2e` still matches ONLY inside skipped tests (not deleted — skipped so the intent is preserved)
- [ ] `pnpm run typecheck` exits 0, `pnpm run lint` exits 0, `pnpm test` exits 0
- [ ] `pnpm exec playwright test --list` parses without error
- [ ] Only the 3 in-scope files modified

## STOP conditions

- Live content of `src/background.ts:90-104` or the e2e specs differs from "Current state" (drift).
- A stale e2e reference sits inside a test that ALSO covers still-valid behavior in a way that skipping would lose important non-obsolete coverage — if so, STOP and report which test, rather than guessing how to split it.
- `pnpm exec playwright test --list` errors (parse/config problem) — report it; do not try to fix Playwright config (out of scope).

## Maintenance notes

- Deferred follow-up: rewrite the skipped e2e tests against the current
  URL-pattern + `enableCurrentTab` TablePane model, and consider re-including e2e
  in a scheduled (non-per-commit) gate. Both need interactive browser verification.
- A reviewer should confirm the keep-alive code (not just the comment) is byte-identical and that no still-valid e2e assertion was skipped.
