# Plan 011: Serialize focus-override content-script (un)registration via a promise queue

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If any
> STOP condition occurs, stop and report. Do not improvise. Commit in the
> worktree per the git workflow. SKIP updating `plans/README.md` — the reviewer
> maintains the index.
>
> **Drift check (run first)**: `git diff --stat 425c15d..HEAD -- src/background/focus_override_registration.ts src/background.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code; on a mismatch, STOP.

## Status

- Priority: P3
- Effort: S
- Risk: LOW
- Depends on: none
- Category: bug
- Planned at: commit `425c15d`, 2026-07-14

## Why this matters

`syncFocusOverrideContentScript()` performs an unguarded check-then-act:
`getRegisteredContentScripts` → `unregisterContentScripts` → `registerContentScripts`.
It is invoked from three places that can overlap: `chrome.runtime.onStartup`
(`src/background.ts:48`), top-level module evaluation on every cold
service-worker start (`src/background.ts:86`), and `chrome.storage.onChanged`
(`src/background.ts:73`). On browser startup the onStartup + top-level calls can
interleave: both pass the "not registered" check, both call
`registerContentScripts` with the same id, and the second rejects with a
duplicate-id error that is swallowed by the callers' `.catch(() => {})`. There is
also a transient window where the script is unregistered while a re-register is
in flight. It self-heals in practice, so this is a robustness/log-noise fix, not
a crash — but the repo already solved the identical problem for context menus
with a promise queue (`scheduleRefreshContextMenus`), and this should match it.

## Current state

- `src/background/focus_override_registration.ts` — full current body of the
  exported function (lines 41–64):

  ```ts
  export async function syncFocusOverrideContentScript(): Promise<void> {
    if (!chrome.scripting?.registerContentScripts) {
      return;
    }

    const patterns = await getStoredFocusOverridePatterns();
    const matches = toFocusOverrideMatchPatterns(patterns);

    await unregisterFocusOverrideContentScriptIfNeeded();
    if (matches.length === 0) {
      return;
    }

    await chrome.scripting.registerContentScripts([
      {
        id: FOCUS_OVERRIDE_CONTENT_SCRIPT_ID,
        js: [FOCUS_OVERRIDE_CONTENT_SCRIPT_JS],
        matches,
        persistAcrossSessions: true,
        runAt: "document_start",
        world: "MAIN",
      },
    ]);
  }
  ```

  Helper functions `getStoredFocusOverridePatterns`,
  `unregisterFocusOverrideContentScriptIfNeeded`, and the constants above stay
  unchanged. Callers in `src/background.ts` call
  `syncFocusOverrideContentScript()` and only `.catch(() => {})` the result — the
  signature must remain `(): Promise<void>` so callers need no change.

- Exemplar to match — `src/background/context_menu_registry.ts:60` +
  `:423-438`:

  ```ts
  let contextMenuRefreshQueue: Promise<void> = Promise.resolve();
  // ...
  export function scheduleRefreshContextMenus(): Promise<void> {
    contextMenuRefreshQueue = Promise.resolve(contextMenuRefreshQueue)
      .catch(() => {
        // no-op
      })
      .then(async () => {
        const succeeded = await refreshContextMenus();
        if (!succeeded) {
          await refreshContextMenus();
        }
      });
    return contextMenuRefreshQueue;
  }
  ```

  Chain onto a module-level `Promise` with a `.catch` reset so one failure does
  not wedge the queue.

## Commands you will need

| Purpose   | Command                                    | Expected |
| --------- | ------------------------------------------ | -------- |
| Install   | `pnpm install`                             | exit 0   |
| Typecheck | `pnpm run typecheck`                       | exit 0   |
| Tests     | `pnpm test -- focus_override_registration` | all pass |
| Full test | `pnpm test`                                | all pass |
| Lint      | `pnpm run lint`                            | exit 0   |

## Scope

#### In scope

- `src/background/focus_override_registration.ts`
- `tests/background.focus_override_registration.test.ts` (extend; do not remove existing cases)

#### Out of scope

- `src/background.ts` — callers stay as-is (they already fire-and-forget with `.catch`).
- The `@/storage/helpers` import / `getStoredFocusOverridePatterns` read path — the naive sync-only read is CORRECT here (`focusOverridePatterns` is only ever written by the popup via a plain `chrome.storage.sync.set`, never through the quota-fallback path), so do NOT change it.
- `context_menu_registry.ts` (read-only exemplar).

## Git workflow

- Branch: `advisor/011-serialize-focus-override-registration`
- Single commit, conventional commits: `fix(background): serialize focus-override content-script registration`
- Do NOT push or open a PR.

## Steps

### Step 1: Extract the body into a private function and wrap the export in a queue

In `src/background/focus_override_registration.ts`:

1. Rename the current exported `syncFocusOverrideContentScript` to a private
   `async function performFocusOverrideSync(): Promise<void>` with the SAME body.
2. Add a module-level queue and a new exported wrapper:

   ```ts
   let focusOverrideSyncQueue: Promise<void> = Promise.resolve();

   export function syncFocusOverrideContentScript(): Promise<void> {
     focusOverrideSyncQueue = Promise.resolve(focusOverrideSyncQueue)
       .catch(() => {
         // no-op
       })
       .then(() => performFocusOverrideSync());
     return focusOverrideSyncQueue;
   }
   ```

The exported name and `(): Promise<void>` signature are unchanged, so
`src/background.ts` callers need no edits.

Verify: `pnpm run typecheck` → exit 0.

### Step 2: Add a concurrency regression test

Extend `tests/background.focus_override_registration.test.ts` (read it first to
match its chrome-mock setup and assertion style). Add a test that:

- Mocks `chrome.scripting.getRegisteredContentScripts` /
  `unregisterContentScripts` / `registerContentScripts` (reuse the file's
  existing stubs/pattern).
- Invokes `syncFocusOverrideContentScript()` TWICE without awaiting between
  calls, then awaits both.
- Asserts `registerContentScripts` is not called concurrently / does not throw a
  duplicate-id error — i.e. the two runs are serialized (e.g. assert the mock
  observed non-overlapping execution, or that no unhandled rejection occurred and
  the final registered state is consistent). Model the exact assertion on what
  the existing stubs expose.

If the existing test harness cannot express overlap without significant new
mocking scaffolding, STOP and report — do not build a large new harness.

Verify: `pnpm test -- focus_override_registration` → all pass, including the new test.

## Test plan

- Extend `tests/background.focus_override_registration.test.ts` with the
  concurrency test above; keep all existing cases passing.
- `pnpm test` → full suite passes (shared background module).

## Done criteria

- [ ] `syncFocusOverrideContentScript` is a thin queue wrapper; the real work is in a private `performFocusOverrideSync`
- [ ] Exported signature is still `(): Promise<void>`; `src/background.ts` unchanged (`git status` shows it unmodified)
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm test` exits 0; new concurrency test present and passing
- [ ] `pnpm run lint` exits 0
- [ ] Only the two in-scope files modified

## STOP conditions

- The current code doesn't match the "Current state" excerpt (drift).
- Adding the concurrency test requires a large new chrome-mock harness beyond the existing file's patterns.
- The fix appears to require editing `src/background.ts` or the storage read path.
- typecheck/test/lint fails twice after a reasonable fix attempt.

## Maintenance notes

- This mirrors `scheduleRefreshContextMenus`. If the context-menu queue pattern
  is ever refactored into a shared helper, this queue should adopt it too.
- A reviewer should confirm the queue's `.catch` reset prevents a single failed
  run from wedging all future syncs.
