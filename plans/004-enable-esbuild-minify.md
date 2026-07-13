# Plan 004: Enable esbuild minification for production bundles

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31dee9a..HEAD -- scripts/bundle.mjs`
> If `scripts/bundle.mjs` changed since this plan was written, compare the
> "Current state" excerpt below against the live file before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `31dee9a`, 2026-07-14
- **Issue**: (none — internal plan, not published as a GitHub issue)

## Why this matters

`dist/content.js` — the content script injected on **every** page via
`manifest.json`'s `content_scripts` matches (`<all_urls>`) — is currently
~1.86MB (unminified, verified: `1857449` bytes as of this writing) because
`scripts/bundle.mjs` never enables esbuild's `minify` option. Chrome's V8
engine must parse and compile this file on every single page navigation
across every tab, adding avoidable CPU/memory overhead and slowing page load
for a script that runs constantly in the background of daily browsing.
Enabling minification for production builds (while keeping watch/dev builds
unminified with sourcemaps for debuggability) is a small, low-risk,
high-leverage fix: less bytes to parse/compile, smaller extension package,
no behavior change.

## Current state

- `scripts/bundle.mjs` — the only build script; defines `buildOptions` passed
  to esbuild for both the one-shot production build (`pnpm run bundle`) and
  the `--watch` dev loop. Full current content (as of commit `31dee9a`):

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
    sourcemap: true,
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

  Key facts from this excerpt:
  - Line 4: `const isWatch = process.argv.includes("--watch");` — already
    distinguishes production vs. watch/dev invocation. Reuse this, do not
    introduce a second flag.
  - Line 36: `sourcemap: true` — currently unconditional (production build
    also emits `.map` files).
  - There is **no** `minify` key in `buildOptions` today.
  - `format: "iife"` (line 14) — each entry point is a self-contained IIFE;
    minification is fully compatible with this format and does not change
    module boundaries.

- Verified: no source code in `src/` relies on preserved function/class
  names or minification-unsafe patterns. `grep -rn "\.name ===" src/` matches
  only `alarm.name === "keep-alive"` (background.ts:98, a plain data object
  property), `group.name === name` / `engine.name === name` (form-field
  comparisons), and `error.name === "AbortError"` /
  `error.name === "TimeoutError"` (fetch-with-timeout.ts:47, the standard
  `Error.prototype.name` string, which esbuild minification does not alter).
  None of these depend on `Function.name` / class name preservation, so
  esbuild's default minifier settings (which do not rename these) are safe
  as-is. No `keepNames: true` option is needed.

## Commands you will need

| Purpose                  | Command              | Expected on success                                      |
| ------------------------ | -------------------- | -------------------------------------------------------- |
| Install deps (if needed) | `pnpm install`       | exit 0                                                   |
| Full build               | `pnpm run build`     | exit 0 (runs clean → typecheck → bundle → copy:styles)   |
| Bundle only              | `pnpm run bundle`    | exit 0, esbuild writes to `dist/`                        |
| Watch/dev build          | `pnpm run watch`     | starts esbuild watch mode, "rebuild succeeded" on change |
| Typecheck                | `pnpm run typecheck` | exit 0, no errors                                        |
| Unit tests               | `pnpm run test`      | all pass                                                 |
| Full local gate          | `mise run ci`        | format, lint, test, storybook test, build all pass       |

(All commands verified from `package.json` and `mise.toml` in this repo — not guessed.)

## Scope

**In scope** (the only file you should modify):

- `scripts/bundle.mjs`

**Out of scope** (do NOT touch, even though they look related):

- `manifest.json` — no permission or content_script config change needed.
- Anything under `src/` — no source code change is needed; the finding is
  purely a build-config gap.
- `scripts/copy-styles.mjs`, `scripts/clean.mjs`, `scripts/build-shared.mjs`
  — these handle CSS copying and shared watch/copy helpers, unrelated to the
  JS minify/sourcemap settings being changed here.
- Any further "slim the content bundle" work (removing eager preloads,
  icon barrel imports, etc.) — that is a separate, larger effort tracked in
  a follow-up plan; do not attempt it here.

## Git workflow

- Branch: `advisor/004-enable-esbuild-minify`
- Single commit for this change; message style matches repo convention
  (Conventional Commits, e.g. `build: enable no-downgrade trust policy with
semver exception` from `git log`). Suggested message:
  `build: minify production bundles and gate sourcemaps to watch mode`
- Do NOT push or open a PR unless explicitly instructed.

## Steps

### Step 1: Add `minify` and gate `sourcemap` in `buildOptions`

In `scripts/bundle.mjs`, inside the `buildOptions` object, change:

```js
  outdir: "dist",
  sourcemap: true,
  plugins: [cssRawPlugin],
```

to:

```js
  outdir: "dist",
  sourcemap: isWatch,
  minify: !isWatch,
  plugins: [cssRawPlugin],
```

This keeps watch/dev builds (`isWatch === true`) unminified with sourcemaps
for debuggability, and makes production builds (`pnpm run bundle` /
`pnpm run build`, `isWatch === false`) minified with no sourcemap output.

Do not change anything else in the file — the `isWatch` conditional
branching in the `try` block, the `entryPoints`, `define`, `loader`, or
`plugins` keys are all out of scope for this change.

**Verify**: `sed -n '1,40p' scripts/bundle.mjs` (or open the file) → confirm
the `buildOptions` object now contains both `sourcemap: isWatch` and
`minify: !isWatch`, and no other lines changed.

### Step 2: Run a clean production build and confirm minification took effect

```bash
pnpm run build
```

**Verify**: exits 0. Then:

```bash
ls -la dist/content.js
```

Expected: file size is substantially smaller than the pre-change baseline of
**1,857,449 bytes** (~1.86MB). A reduction to well under 1MB (commonly
60-70% smaller for typical esbuild minification) is expected; treat "no
meaningful reduction" (e.g. still >1.5MB) as a STOP condition, not something
to explain away.

```bash
ls dist/*.map 2>/dev/null; echo "exit:$?"
```

Expected: no `.map` files exist in `dist/` after a production build (the
`ls` command prints "No such file or directory" to stderr and the shown
`exit:$?` is nonzero, e.g. `exit:1` or `exit:2` depending on shell). This
confirms sourcemaps are correctly gated off for production.

### Step 3: Confirm watch/dev mode still produces sourcemaps and is unminified

```bash
timeout 15 pnpm run watch || true
```

(If `timeout` is unavailable on the executor's platform, start `pnpm run
watch` in the background, wait a few seconds, then stop it — do not let it
run indefinitely.)

**Verify**: console output includes `[esbuild] rebuild succeeded` (or the
initial build completes without error), and after it runs at least once,
`ls dist/*.map` lists `.map` files (e.g. `dist/content.js.map`,
`dist/background.js.map`, etc.) — confirming dev builds still emit
sourcemaps. Stop the watch process afterward (Ctrl+C or kill the background
job) before continuing.

Re-run `pnpm run build` once more afterward to leave `dist/` in the
production (minified, no sourcemap) state expected by Step 2's checks:

**Verify**: `pnpm run build` exits 0; `ls dist/*.map` again shows no files.

## Test plan

This is a build-configuration change with no new runtime logic, so no new
unit tests are required. Verification relies on the build commands and file
inspections in Steps 2–3 above, plus the existing test suite to confirm no
regression:

```bash
pnpm run test
```

Expected: all existing tests pass (this change touches no `src/` code, so
the test suite result should be unaffected by this plan).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `scripts/bundle.mjs` contains `sourcemap: isWatch` and `minify: !isWatch`
      in `buildOptions`, and no other lines in the file changed
- [ ] `pnpm run build` exits 0
- [ ] `ls -la dist/content.js` shows a size well under the ~1.86MB baseline
      (1,857,449 bytes)
- [ ] `ls dist/*.map` produces no matches after a production build
- [ ] A `pnpm run watch` run still produces `.map` files during dev/watch mode
- [ ] `pnpm run test` exits 0
- [ ] `git status` shows only `scripts/bundle.mjs` modified (plus any
      regenerated `dist/` build artifacts, which are not source-controlled
      changes to review)
- [ ] `plans/README.md` status row for plan 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code in `scripts/bundle.mjs` at the time you read it doesn't match the
  "Current state" excerpt above (the file has drifted since this plan was
  written) — re-verify the drift check command first.
- `pnpm run build` fails after adding `minify: !isWatch` (e.g. esbuild
  throws a minification error). Do not attempt speculative esbuild option
  changes beyond this plan's scope — report the exact error instead.
- `dist/content.js` size does not shrink meaningfully (stays above ~1.5MB)
  after minification — this would indicate the option was not applied
  correctly or esbuild version behavior differs from expectation.
- Any existing test in `pnpm run test` fails as a result of this change —
  this would be unexpected for a pure build-config change and needs
  investigation before proceeding, not a workaround.
- You find any `Function.name` / class-name-dependent runtime logic in
  `src/` beyond what was already checked in "Current state" (i.e. beyond
  `alarm.name`, `group.name`, `engine.name`, `error.name` on Error objects)
  that could break under minification — if found, stop and report the
  file/line rather than adding `keepNames: true` yourself, since that is a
  design trade-off (larger output vs. safety) outside this plan's scope.

## Maintenance notes

- This plan only enables minification; it does not otherwise shrink the
  bundle. Follow-up plans that reduce `dist/content.js` further (e.g.
  removing eager preloads, deduplicating icon barrel imports) build on top
  of this change and should be planned/executed separately.
- A reviewer should check that the diff to `scripts/bundle.mjs` is exactly
  the two-line change described in Step 1 — nothing else should differ.
- If a future contributor needs to debug a production-only bug that can't
  be reproduced in watch mode, they will need to temporarily set
  `sourcemap: true` locally (or add a separate opt-in flag) since production
  builds no longer emit sourcemaps by design.
