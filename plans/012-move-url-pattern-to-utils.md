# Plan 012: Move `url-pattern.ts` from `content/` to `utils/` to fix a popup→content layer import

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before moving on. If any STOP condition occurs,
> stop and report. Do not improvise. Commit in the worktree per the git workflow.
> SKIP updating `plans/README.md` — the reviewer maintains the index.
>
> **Drift check (run first)**: `git diff --stat 425c15d..HEAD -- src/content/url-pattern.ts src/content.ts src/domain-pattern-configs.ts src/content/table-auto-exec.ts src/popup/runtime.ts src/popup/storybook/createStoryPopupRuntime.ts`
> If any changed since this plan was written, compare against "Current state"; on a mismatch, STOP.

## Status

- Priority: P3
- Effort: S
- Risk: LOW
- Depends on: none
- Category: tech-debt
- Planned at: commit `425c15d`, 2026-07-14

## Why this matters

`src/content/url-pattern.ts` is a pure, framework-free utility (`patternToRegex`,
`matchesAnyPattern`) but it lives under `src/content/`. The popup layer imports it
(`src/popup/runtime.ts:3`, `src/popup/storybook/createStoryPopupRuntime.ts:2`),
so the popup takes a runtime dependency on the content layer — a layering
violation. Moving the file to the neutral `src/utils/` directory (where the
repo's other pure helpers live: `date_utils.ts`, `errors.ts`, `ics.ts`, etc.)
lets popup and content both depend on a shared utility layer with no cross-layer
coupling. This is a pure move + import-path update; no logic changes.

## Current state

- `src/content/url-pattern.ts` exports exactly two functions:
  - `export function patternToRegex(pattern: string): RegExp` (line 12)
  - `export function matchesAnyPattern(...)` (line 39)
- All 5 importers (verified via `rg "@/content/url-pattern" src`):
  1. `src/domain-pattern-configs.ts:2` — `import { patternToRegex } from "@/content/url-pattern";`
  2. `src/content/table-auto-exec.ts:9` — `import { matchesAnyPattern } from "@/content/url-pattern";`
  3. `src/content.ts:14` — `import { matchesAnyPattern, patternToRegex } from "@/content/url-pattern";`
  4. `src/popup/runtime.ts:3` — `import { matchesAnyPattern } from "@/content/url-pattern";`
  5. `src/popup/storybook/createStoryPopupRuntime.ts:2` — `import { matchesAnyPattern } from "@/content/url-pattern";`
- `src/content.ts:78` also has a **comment** referencing the old location:
  `  // → @/content/url-pattern に移動` (inside a comment block around lines 76–79). Update this comment's path too.
- `src/utils/` already exists and holds the repo's pure helpers.
- Path alias: `@/` → `./src` (from `scripts/bundle.mjs` and tsconfig). So the new import specifier is `@/utils/url-pattern`.

## Commands you will need

| Purpose       | Command                          | Expected                  |
| ------------- | -------------------------------- | ------------------------- |
| Install       | `pnpm install`                   | exit 0                    |
| Typecheck     | `pnpm run typecheck`             | exit 0                    |
| Tests         | `pnpm test`                      | all pass                  |
| Lint          | `pnpm run lint`                  | exit 0                    |
| Grep old path | `rg "@/content/url-pattern" src` | no matches after the move |

## Scope

#### In scope

- `src/content/url-pattern.ts` → move to `src/utils/url-pattern.ts` (use `git mv` to preserve history)
- The 5 importer files listed above (update the import specifier only)
- `src/content.ts` comment at ~line 78 (update the referenced path)
- Any test file that imports `@/content/url-pattern` — check with `rg "@/content/url-pattern" tests` and update those specifiers too (do not otherwise change tests)

#### Out of scope

- The bodies of `patternToRegex` / `matchesAnyPattern` — no logic change.
- Any other refactor of the importer files.

## Git workflow

- Branch: `advisor/012-move-url-pattern-to-utils`
- Single commit, conventional commits: `refactor: move url-pattern to utils to fix popup->content import`
- Do NOT push or open a PR.

## Steps

### Step 1: Move the file with history preserved

```bash
git checkout -b advisor/012-move-url-pattern-to-utils
git mv src/content/url-pattern.ts src/utils/url-pattern.ts
```

Verify: `ls src/utils/url-pattern.ts` exists; `ls src/content/url-pattern.ts` gone.

### Step 2: Update all importers to `@/utils/url-pattern`

Update the import specifier in each of the 5 source importers (and any test
importers found via `rg "@/content/url-pattern" tests`) from
`@/content/url-pattern` to `@/utils/url-pattern`. Change ONLY the path string;
keep the named imports identical.

Also update the comment in `src/content.ts` (~line 78) that reads
`// → @/content/url-pattern に移動` to reference `@/utils/url-pattern`.

Verify: `rg "@/content/url-pattern" src tests` → no matches.

### Step 3: Typecheck, test, lint

#### Verify

- `pnpm run typecheck` → exit 0
- `pnpm test` → all pass
- `pnpm run lint` → exit 0

## Test plan

No new tests — pure move. Existing tests that exercise `patternToRegex` /
`matchesAnyPattern` (and any that imported the old path, now updated) must
continue to pass unchanged. Verification is typecheck + full suite + lint.

## Done criteria

- [ ] `src/utils/url-pattern.ts` exists; `src/content/url-pattern.ts` is gone
- [ ] `rg "@/content/url-pattern" src tests` returns no matches
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] Only the moved file + its importers + the content.ts comment changed (`git status`)

## STOP conditions

- Any importer file's live content differs from what the drift check implies (unexpected import shape).
- A build-config file (e.g. a custom module-resolution rule) treats `@/content/*` and `@/utils/*` differently in a way that breaks the move — report it.
- typecheck/test/lint fails twice after a reasonable fix attempt (e.g. a missed importer).

## Maintenance notes

- After this, `url-pattern` is a neutral utility; future consumers should import from `@/utils/url-pattern`.
- A reviewer should confirm no importer was missed (`rg "@/content/url-pattern"` clean) and that the two exported function bodies are byte-identical to before the move.
