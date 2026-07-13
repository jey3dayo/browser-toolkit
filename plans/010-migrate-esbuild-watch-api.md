# Plan 010: Migrate the esbuild watch branch to the context()/watch() API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Base branch**: This plan is STACKED on plan 004. You must branch from
> `advisor/004-enable-esbuild-minify` (commit `630fc34`), NOT from `main` —
> that branch already contains the `minify`/`sourcemap` changes to the same
> file, and building on `main` would drop them and cause a merge conflict.
>
> **Drift check (run first)**: `git diff --stat 630fc34..HEAD -- scripts/bundle.mjs`
> from the base branch. If `scripts/bundle.mjs` differs from the "Current
> state" excerpt below, treat it as a STOP condition.

## Status

- Priority: P2
- Effort: S
- Risk: LOW
- Depends on: plans/004-enable-esbuild-minify.md (stacked — same file; base branch is `advisor/004-enable-esbuild-minify`)
- Category: dx
- Planned at: commit `630fc34` (branch `advisor/004-enable-esbuild-minify`), 2026-07-14
- Issue: (none)

## Why this matters

`pnpm run watch` is currently broken. `scripts/bundle.mjs`'s watch branch calls
`build({ ...buildOptions, watch: { onRebuild } })`, but esbuild 0.28.1 (the
pinned version) removed that legacy incremental/watch API. Running
`pnpm run watch` fails immediately with `ERROR: Invalid option in build() call:
"watch"`, so the documented dev inner loop (watch build) does not work at all —
contributors must fall back to manual `pnpm run build` on every change. The
modern replacement is `context()` + `ctx.watch()`. This restores the dev watch
loop and preserves the existing "rebuild succeeded/failed" console logging via
esbuild's `onEnd` plugin hook (the `onRebuild` callback no longer exists).

## Current state

- `scripts/bundle.mjs` — on the base branch `advisor/004-enable-esbuild-minify`
  (commit `630fc34`), the full file is:

  ```js
  import { build } from "esbuild";
  import { copyStyles, cssRawPlugin, watchStyles } from "./build-shared.mjs";

  const isWatch = process.argv.includes("--watch");

  const buildOptions = {
    entryPoints: [
      "src/background.ts",
      "src/content.ts",
      "src/popup.ts",
      "src/focus-override.ts",
    ],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    charset: "utf8",
    alias: {
      "@": "./src",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.GA4_MEASUREMENT_ID": JSON.stringify(
        process.env.GA4_MEASUREMENT_ID || "",
      ),
      "process.env.GA4_API_SECRET": JSON.stringify(
        process.env.GA4_API_SECRET || "",
      ),
    },
    loader: {
      ".toml": "text",
      ".css": "css",
    },
    outdir: "dist",
    sourcemap: isWatch,
    minify: !isWatch,
    plugins: [cssRawPlugin],
  };

  try {
    if (isWatch) {
      await copyStyles();
      watchStyles();
      await build({
        ...buildOptions,
        watch: {
          onRebuild(error) {
            if (error) {
              console.error("[esbuild] rebuild failed", error);
            } else {
              console.log("[esbuild] rebuild succeeded");
            }
          },
        },
      });
    } else {
      await build(buildOptions);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
  ```

  Key facts:
  - Line 1: only `build` is imported from esbuild today — you must also import
    `context`.
  - The `buildOptions` object (including `sourcemap: isWatch` and
    `minify: !isWatch` from plan 004) is correct and must NOT change.
  - Only the `if (isWatch) { ... }` branch is broken and in scope to change.
    The `else { await build(buildOptions); }` production path is correct — do
    not touch it.

- Verified: esbuild 0.28.1 exports both `context` and `build` as functions
  (confirmed via `node -e "const e=require('esbuild'); console.log(typeof e.context, typeof e.build)"` → `function function`). The `context()` API is the supported replacement for the removed `build({watch})` API.

## Commands you will need

| Purpose          | Command              | Expected on success                                   |
| ---------------- | -------------------- | ----------------------------------------------------- |
| Install deps     | `pnpm install`       | exit 0                                                |
| Production build | `pnpm run build`     | exit 0 (clean → typecheck → bundle → copy:styles)     |
| Watch build      | `pnpm run watch`     | starts, prints initial rebuild + "watching", stays up |
| Typecheck        | `pnpm run typecheck` | exit 0                                                |
| Unit tests       | `pnpm run test`      | all pass                                              |

## Scope

#### In scope (the only file you should modify)

- `scripts/bundle.mjs`

#### Out of scope (do NOT touch)

- The `buildOptions` object contents (entryPoints, define, loader, sourcemap,
  minify, plugins list) — unchanged.
- The `else { await build(buildOptions); }` production branch — unchanged.
- `scripts/build-shared.mjs`, `scripts/copy-styles.mjs`, `scripts/clean.mjs` —
  `copyStyles`/`watchStyles`/`cssRawPlugin` behavior is out of scope; keep the
  existing `await copyStyles(); watchStyles();` calls in the watch branch.
- Anything under `src/`, `manifest.json`, `package.json`.

## Git workflow

- Branch FROM the base branch: `git checkout advisor/004-enable-esbuild-minify`
  then `git checkout -b advisor/010-migrate-esbuild-watch-api`.
- Single commit, Conventional Commits style. Suggested message:
  `build: migrate esbuild watch to context()/watch() API`
- Do NOT push or open a PR.

## Steps

### Step 1: Create the stacked branch

```bash
git checkout advisor/004-enable-esbuild-minify
git checkout -b advisor/010-migrate-esbuild-watch-api
```

Verify: `git branch --show-current` → `advisor/010-migrate-esbuild-watch-api`,
and `git log --oneline -1` shows plan 004's commit `630fc34` as HEAD's parent
lineage (i.e. `git show HEAD:scripts/bundle.mjs` contains `minify: !isWatch`).
If `minify: !isWatch` is NOT present, you branched from the wrong base — STOP.

### Step 2: Import `context` and replace the watch branch

In `scripts/bundle.mjs`:

1. Change the first import line from:

   ```js
   import { build } from "esbuild";
   ```

   to:

   ```js
   import { build, context } from "esbuild";
   ```

2. Replace the `if (isWatch) { ... }` block (the `await build({ ...buildOptions, watch: { onRebuild } })` call) with a `context()` + `ctx.watch()` version that preserves the rebuild logging via an `onEnd` plugin hook. Target shape for the `try` block:

   ```js
   try {
     if (isWatch) {
       await copyStyles();
       watchStyles();
       const ctx = await context({
         ...buildOptions,
         plugins: [
           ...buildOptions.plugins,
           {
             name: "rebuild-logger",
             setup(pluginBuild) {
               pluginBuild.onEnd((result) => {
                 if (result.errors.length > 0) {
                   console.error("[esbuild] rebuild failed", result.errors);
                 } else {
                   console.log("[esbuild] rebuild succeeded");
                 }
               });
             },
           },
         ],
       });
       await ctx.watch();
       console.log("[esbuild] watching for changes...");
     } else {
       await build(buildOptions);
     }
   } catch (error) {
     console.error(error);
     process.exit(1);
   }
   ```

Do not change `buildOptions`, the `else` branch, or the outer `catch`. The
`onEnd` hook fires after both the initial build and every rebuild, so the
"rebuild succeeded/failed" logging behavior is preserved. `ctx.watch()` keeps
the process alive (do not call `ctx.dispose()` — the watcher must keep running).

Verify: `pnpm run typecheck` → exit 0 (this is a `.mjs` script, but run it to
confirm nothing else broke), and visually confirm the import line now includes
`context` and the watch branch uses `context(...)` + `ctx.watch()`.

### Step 3: Confirm watch mode starts, builds, and emits sourcemaps

Start watch mode with a timeout so it does not run forever (watch keeps the
process alive by design):

```bash
timeout 20 pnpm run watch; echo "exit:$?"
```

(If `timeout` is unavailable, run `pnpm run watch` in the background, wait ~10s,
capture output, then kill it. Do NOT leave it running.)

Verify: the output includes `[esbuild] rebuild succeeded` and
`[esbuild] watching for changes...` (the initial build fired the `onEnd` hook),
and there is NO `Invalid option in build() call: "watch"` error. The `exit:$?`
will typically be `124` (killed by timeout) — that is EXPECTED and means watch
stayed alive successfully; a non-124, non-0 early exit with an esbuild error is
a failure. Then confirm sourcemaps were emitted (watch mode has
`sourcemap: isWatch === true`):

```bash
ls dist/*.map
```

Expected: lists `.map` files (e.g. `dist/content.js.map`, `dist/background.js.map`).

### Step 4: Confirm production build is unaffected

```bash
pnpm run build
```

Verify: exits 0. Then:

```bash
ls -la dist/content.js && ls dist/*.map 2>/dev/null; echo "map-exit:$?"
```

Expected: `dist/content.js` is minified (well under 1MB, ~680KB), and NO `.map`
files exist after a production build (`map-exit` is nonzero). This confirms the
`minify: !isWatch` / `sourcemap: isWatch` gating from plan 004 still holds — the
watch-branch change did not affect the production path.

## Test plan

No new unit tests — this is a build-script change with no runtime `src/` logic.
Verification is the watch/build command behavior in Steps 3–4. Run the existing
suite to confirm no regression:

```bash
pnpm run test
```

Expected: all existing tests pass (unaffected by this change).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `scripts/bundle.mjs` imports `context` from esbuild and the watch branch
      uses `context(...)` + `await ctx.watch()` (no `build({watch:...})` call remains)
- [ ] `grep -n "watch: {" scripts/bundle.mjs` returns no matches (legacy API gone)
- [ ] `pnpm run watch` starts without the `Invalid option ... "watch"` error,
      prints `[esbuild] rebuild succeeded` + `[esbuild] watching for changes...`,
      and stays alive (killed by timeout, not an early esbuild error)
- [ ] `ls dist/*.map` lists `.map` files after a watch run
- [ ] `pnpm run build` exits 0; `dist/content.js` is minified (<1MB) and no
      `.map` files exist after a production build
- [ ] `pnpm run test` exits 0
- [ ] `git status` shows only `scripts/bundle.mjs` modified (plus regenerated
      `dist/` artifacts, which are not source-controlled)
- [ ] `plans/README.md` status row for plan 010 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The base branch's `scripts/bundle.mjs` does not match the "Current state"
  excerpt (drift, or you branched from the wrong base — `minify: !isWatch`
  must be present).
- `pnpm run watch` still errors after the change with an esbuild option error
  other than the legacy `watch` one — report the exact error; do not
  speculatively add unrelated esbuild options.
- The `onEnd` hook approach does not compile or `ctx.watch()` is not a function
  on the installed esbuild — report the esbuild version and error.
- Any existing test fails as a result of this change (unexpected for a
  build-script-only change).
- Restoring the production build (Step 4) shows `dist/content.js` is NOT
  minified or `.map` files appear — this would mean the plan-004 gating was
  disturbed; stop and report.

## Maintenance notes

- This plan is stacked on plan 004. When merging, 004 must land first (or both
  branches merge together) since they share `scripts/bundle.mjs`.
- If a future esbuild upgrade changes the `context()`/`onEnd` API again, this
  watch branch is the place to update; the `onEnd` logger plugin is the only
  bespoke piece.
- A reviewer should confirm the diff is limited to the import line and the
  `if (isWatch)` branch, and that the production `else` branch and `buildOptions`
  are byte-identical to the base branch.
