# Plan 009: Slim the always-injected content bundle (defer preload, cut icon over-import)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31dee9a..HEAD -- src/content.ts src/components/icon.tsx src/content/overlay/icons.tsx src/components/ThemeCycleButton.tsx src/content/overlay/OverlayComponents.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/004-*.md (minify) — measure bundle size AFTER plan 004 has landed, so this plan's win is attributable and not muddled by minifier noise. If plan 004 has not landed yet, STOP and report rather than measuring against an unminified baseline.
- **Category**: perf / tech-debt
- **Planned at**: commit `31dee9a`, 2026-07-14

## Why this matters

`src/content.ts` is injected into **every** HTML page the user visits (Manifest V3 content script, `<all_urls>`). Two unrelated things in its dependency graph make that injection heavier than it needs to be:

1. **(G) Eager preload of heavy modules.** On every HTML document, `content.ts` unconditionally kicks off `loadNotificationModule()` and `loadOverlayModule()` at load time — not when the user actually triggers a notification or opens the overlay. `overlay-helpers.ts` pulls in `react`, `react-dom/client`, and (transitively via `OverlayApp`) `react-markdown` + `remark-gfm`. That initialization work runs on pages where the user never touches the extension.
2. **(H) Icon over-import.** `src/components/icon.tsx` builds a `Record<IconName, Component>` that eagerly imports ~25 `lucide-react` icon components as named imports and assigns them all into one object literal. Because every icon is referenced in that object literal (even ones the content script never renders), a bundler cannot tree-shake the unused ones out of `content.js` — all 25 icons ship in the content bundle even though the content-reachable UI only ever renders 9 of them.

Fixing (G) removes work that runs on every page load for a feature (overlay/toast) most page-loads never use. Fixing (H) removes bytes that are provably unreachable from the content script's actual render paths. Both are small, low-risk, purely internal refactors — no behavior change for the user once the overlay/toast are actually invoked.

## Current state

### Finding (G): eager preload in `src/content.ts`

- `src/content.ts:63-71` creates three lazy loaders:
  ```ts
  const loadNotificationModule = createLazyLoader<NotificationModule>(
    () => import("./content/notification"),
  );
  const loadOverlayModule = createLazyLoader<OverlayModule>(
    () => import("./content/overlay-helpers"),
  );
  const loadQrCodeOverlayModule = createLazyLoader<QrCodeOverlayModule>(
    () => import("./content/qrcode-overlay"),
  );
  ```
- `src/content.ts:95-104` (this is the bug):
  ```ts
  // 2回目以降の初期化では副作用を追加しない（idempotent）
  // overlay/toastのpreloadはHTMLドキュメントでのみ実行
  if (supportsHtmlDocument) {
    loadNotificationModule().catch(() => {
      // no-op
    });
    loadOverlayModule().catch(() => {
      // no-op
    });
  }
  ```
  This runs unconditionally for every HTML document, not gated on any user action. `loadQrCodeOverlayModule` is **not** called here — it is only invoked inside `showQrCodeOverlay` (`src/content.ts:236-249`), which is the correct lazy pattern. Leave `loadQrCodeOverlayModule` and `showQrCodeOverlay` untouched; use them as the reference pattern for how a load should be gated.
- `src/content/lazy-loader.ts` — `createLazyLoader` memoizes the dynamic import and its promise; calling the returned function multiple times is safe and cheap once the module is loaded (`src/content/lazy-loader.ts:1-23`). This means gating the _first_ call to `loadNotificationModule()` / `loadOverlayModule()` behind a user-intent event, instead of removing the calls, is safe — later explicit calls (from `showNotification`, `showActionOverlay`, etc.) will just resolve the already-in-flight or already-resolved promise.
- The existing `mouseup` listener at `src/content.ts:155-169` already exists for caching selected text on every page (it writes to storage). It is the natural first "user is interacting" signal already present in the file, but it fires on _every_ mouseup including clicks with no selection — do not conflate the two purposes; add a separate, narrowly-scoped listener for triggering the preload (see Step 1).

### Finding (H): icon over-import in `src/components/icon.tsx`

- `src/components/icon.tsx:1-92` — full file:
  ```ts
  import {
    Bug, Calendar, Check, ChevronDown, ChevronRight, Clock, Copy, Eye, EyeOff,
    FileText, Layers, Link, type LucideProps, Menu, MessageSquare, Monitor,
    Moon, Pencil, Pin, QrCode, Search, Settings, Sun, Table, X, Zap,
  } from "lucide-react";

  export type IconName = "bug" | "calendar" | "check" | "chevron-down" | ... ; // 25 names

  const icons: Record<IconName, React.ComponentType<LucideProps>> = {
    bug: Bug, calendar: Calendar, check: Check, "chevron-down": ChevronDown,
    /* ...all 25 mapped... */ zap: Zap,
  };

  export type IconProps = LucideProps & { name: IconName };

  export function Icon({ name, ...props }: IconProps): React.JSX.Element {
    const Component = icons[name];
    return <Component {...props} />;
  }
  ```
- Because `icons` is one object literal referencing every imported icon binding, a bundler must keep all 25 icon components reachable from any file that imports `Icon` — including `content.js`, even though the content script's render paths only ever pass 9 distinct `name` values.
- **Confirmed content-reachable icon names** (traced by grep of every `Icon`/`ThemeCycleButton` usage inside `src/content/**` and its shared dependency `src/components/ThemeCycleButton.tsx`):
  - `src/content/overlay/icons.tsx` (full file, 9 lines):
    ```tsx
    import { Icon } from "@/components/icon";
    export function PinIcon(): React.JSX.Element {
      return <Icon aria-hidden="true" name="pin" />;
    }
    export function CopyIcon(): React.JSX.Element {
      return <Icon aria-hidden="true" name="copy" />;
    }
    ```
  - `src/content/overlay/OverlayComponents.tsx` uses, via `Icon name="..."`: `settings` (line 245), `close` (line 426), `chevron-down` (line 544), `message-square` (line 569) — plus `PinIcon`/`CopyIcon` from the file above.
  - `src/components/ThemeCycleButton.tsx:1-46` is imported only by `src/content/overlay/OverlayComponents.tsx:12` (and its own Storybook file) — **no popup file imports `ThemeCycleButton`** (verified: `grep -rln "ThemeCycleButton" src/popup` returns nothing). It maps `Theme -> IconName` and renders via the shared `Icon`:
    ```ts
    const THEME_ICONS: Record<Theme, IconName> = {
      auto: "monitor",
      light: "sun",
      dark: "moon",
    };
    ```
  - So the full content-reachable set is exactly: `pin, copy, settings, close, chevron-down, message-square, monitor, sun, moon` (9 of 25).
- **Popup also imports the same shared `@/components/icon.tsx`** from `src/popup/components/Sidebar.tsx`, `src/popup/panes/CreateLinkPane.tsx`, `src/popup/panes/SearchGroupItem.tsx`, `src/popup/panes/actions/ActionTargetAccordion.tsx`, `src/popup/panes/settings/SettingsTokenSection.tsx`, `src/popup/navigation-items.ts` — these use additional names such as `menu`, `qr-code`, `pencil`, and others not in the content set. **The popup must keep access to all 25 icons; do not shrink the shared barrel's icon set.**
- `src/content/overlay/icons.stories.tsx` exists and exercises `PinIcon`/`CopyIcon` — check it after Step 2 changes.

### Repo conventions

- Path alias `@/` maps to `src/` (see existing imports like `@/content/lazy-loader`, `@/components/icon`).
- Conventional commit style, e.g. from `git log`: `fix(background): respond with failure for unknown runtime actions`, `docs(plans): add improve audit implementation plans`. Use `perf:` for Step Group A (preload timing) and `refactor:` for Step Group B (icon split).

## Commands you will need

| Purpose         | Command                   | Expected on success                                    |
| --------------- | ------------------------- | ------------------------------------------------------ |
| Install         | `pnpm install`            | exit 0                                                 |
| Typecheck       | `pnpm run typecheck`      | exit 0, no errors                                      |
| Build           | `pnpm run build`          | exit 0 (runs clean + typecheck + bundle + copy:styles) |
| Unit tests      | `pnpm test`               | all pass                                               |
| Storybook tests | `pnpm run test:storybook` | all pass                                               |
| Lint            | `pnpm run lint`           | exit 0 (Ultracite/Biome)                               |
| Bundle size     | `ls -la dist/content.js`  | compare byte size before/after each step group         |

## Scope

**In scope** (the only files you should modify):

- `src/content.ts`
- `src/content/overlay/icons.tsx`
- `src/components/icon.tsx`
- `src/components/ThemeCycleButton.tsx` (import path only, if Step Group B requires it)
- New file: `src/content/overlay/content-icon.tsx` (content-local icon component, Step Group B)
- `src/content/overlay/icons.stories.tsx` (only if it breaks due to Step Group B and needs an import-path fix)
- `plans/README.md` (status row update at the end)

**Out of scope** (do NOT touch, even though they look related):

- `scripts/bundle.mjs` and any minify/bundler config — that is plan 004's territory; this plan only changes what source code is reachable, not how it is bundled.
- `manifest.json` — no permission or injection-target changes here.
- `src/content/qrcode-overlay.ts` and `showQrCodeOverlay` in `src/content.ts` — already correctly lazy; do not touch.
- Any popup file (`src/popup/**`) — the popup must keep using the full `@/components/icon.tsx` barrel unchanged.
- Any icon name, icon set, or visual change to the overlay UI — this plan changes _when code loads_ and _where icon components are imported from_, never what is rendered.

## Git workflow

- Branch: `advisor/009-slim-content-bundle`
- Commit per step group (two commits total is expected: one `perf:` for Group A, one `refactor:` for Group B). Message style example from `git log`: `fix(security): redact sensitive fields in debug logs`.
- Do NOT push or open a PR unless the operator instructed it.

## Step Group A: defer the overlay/toast preload to first user intent

### Step A1: Baseline the content bundle size

Run `pnpm run build` (must have plan 004's minify changes already merged — if `dist/content.js` is not minified, i.e. contains multi-space indentation and full variable names, STOP and report that plan 004 is a prerequisite). Record the byte size:

**Verify**: `ls -la dist/content.js` → note the size in bytes. Keep this number to compare after Step A2 and after Step Group B.

### Step A2: Replace the unconditional preload with a first-user-intent gate

In `src/content.ts`, remove the unconditional block at lines ~95-104:

```ts
if (supportsHtmlDocument) {
  loadNotificationModule().catch(() => {
    // no-op
  });
  loadOverlayModule().catch(() => {
    // no-op
  });
}
```

Replace it with a one-shot listener that triggers the same two preloads on the _first_ sign of user interaction with the page (pick `pointerdown` — it fires before `mouseup`/`click`/selection and covers touch too), removing itself after firing so it costs nothing beyond the first event:

```ts
function preloadInteractiveModules(): void {
  if (!supportsHtmlDocument) {
    return;
  }
  loadNotificationModule().catch(() => {
    // no-op
  });
  loadOverlayModule().catch(() => {
    // no-op
  });
}

if (supportsHtmlDocument) {
  document.addEventListener("pointerdown", preloadInteractiveModules, {
    once: true,
    passive: true,
  });
}
```

Place this in the same location the removed block occupied (right after the `testHooks` block, before the `if (globalState.initialized) { return; }` early-return), so the listener is (re)attached on every content-script re-injection exactly like the code it replaces. Do NOT attach it after the early return — code after that point only runs once per page (idempotent init), and the intent here is the same "runs every re-injection, cheap no-op after the first real trigger" behavior as the code being replaced.

Do not remove or rename `loadNotificationModule`, `loadOverlayModule`, or any of their existing call sites elsewhere in the file (`getOrCreateToastMount`, `showNotification`, `getOrCreateOverlayMount`, `handleCloseOverlay`, `showActionOverlay`, `showSummaryOverlay`, the `onContextActionsChange` callback passed to `setupTableAutoExec`) — those already call the loaders lazily on demand and remain the primary path; Step A2 only changes the _extra_ eager warm-up call.

**Verify**:

- `pnpm run typecheck` → exit 0, no errors.
- `pnpm run build` → exit 0.
- `grep -n "pointerdown" src/content.ts` → shows the new listener.
- `grep -n "if (supportsHtmlDocument) {" src/content.ts` → the old unconditional preload block (calling both loaders directly, no event listener) is gone; only the new gated version remains.

### Step A3: Confirm existing tests still pass

**Verify**: `pnpm test` → all pass, no new failures. If `src/content.test.ts` (or similarly named) asserts on preload timing/call counts for `loadNotificationModule`/`loadOverlayModule` at module-load time, expect it to need updating to assert the loaders are NOT called until a `pointerdown` fires — locate such a test with `grep -rln "loadNotificationModule\|loadOverlayModule" src/**/*.test.ts` before concluding none exists.

## Step Group B: stop content-reachable code from pulling in all 25 lucide icons

### Step B1: Create a content-local icon component with only the 9 content-reachable icons

Create `src/content/overlay/content-icon.tsx`. It must mirror the shape of `src/components/icon.tsx` (same `IconProps`/`Icon` export names, so call sites need minimal changes) but only import the 9 icons actually used inside `src/content/**`: `pin, copy, settings, close (X), chevron-down, message-square, monitor, sun, moon`.

```tsx
import {
  ChevronDown,
  Copy,
  type LucideProps,
  Monitor,
  Moon,
  MessageSquare,
  Pin,
  Settings,
  Sun,
  X,
} from "lucide-react";

export type ContentIconName =
  | "chevron-down"
  | "close"
  | "copy"
  | "message-square"
  | "monitor"
  | "moon"
  | "pin"
  | "settings"
  | "sun";

const icons: Record<ContentIconName, React.ComponentType<LucideProps>> = {
  "chevron-down": ChevronDown,
  close: X,
  copy: Copy,
  "message-square": MessageSquare,
  monitor: Monitor,
  moon: Moon,
  pin: Pin,
  settings: Settings,
  sun: Sun,
};

export type ContentIconProps = LucideProps & {
  name: ContentIconName;
};

export function ContentIcon({
  name,
  ...props
}: ContentIconProps): React.JSX.Element {
  const Component = icons[name];
  return <Component {...props} />;
}
```

Match the exact icon-name string values used today (`"chevron-down"`, `"close"`, etc.) — these must be byte-identical to the `name="..."` values already used in `OverlayComponents.tsx` and `ThemeCycleButton.tsx`, or the switch to the new component will silently render nothing.

**Verify**: `pnpm run typecheck` → exit 0 (new file compiles standalone; it is not yet imported anywhere, so this just checks the file itself is valid TypeScript).

### Step B2: Point content-only consumers at the new local icon component

Update these three files to import `ContentIcon` (aliased as `Icon` at the import site to minimize the diff, e.g. `import { ContentIcon as Icon } from "@/content/overlay/content-icon";`) instead of `@/components/icon`:

- `src/content/overlay/icons.tsx` — change the import; `IconName` type is no longer needed here (it only used `Icon`).
- `src/content/overlay/OverlayComponents.tsx` — change the import at line 7 (`import { Icon } from "@/components/icon";`) to the new module. Leave every `<Icon .../>` JSX usage unchanged — only the import line changes.
- `src/components/ThemeCycleButton.tsx` — change line 1 (`import { Icon, type IconName } from "@/components/icon";`) to import `ContentIcon as Icon` and `type ContentIconName as IconName` from `@/content/overlay/content-icon`. Before doing this, re-run `grep -rln "ThemeCycleButton" src` and confirm the only non-story importer is still `src/content/overlay/OverlayComponents.tsx`. If any other file (especially under `src/popup/`) now imports `ThemeCycleButton`, STOP — that means `ThemeCycleButton` is no longer content-only and this change would break the popup's ability to render `auto`/`light`/`dark` icons if the popup ever needs a name outside the 9-icon content set. Report this instead of proceeding.

Do not touch `src/components/icon.tsx` in this step — it must keep serving the popup with the full 25-icon set, completely unchanged.

**Verify**:

- `pnpm run typecheck` → exit 0.
- `grep -rn '"@/components/icon"' src/content/overlay/icons.tsx src/content/overlay/OverlayComponents.tsx src/components/ThemeCycleButton.tsx` → no matches (all three now import from `@/content/overlay/content-icon`).
- `grep -rn '"@/components/icon"' src/popup` → unchanged, still present (popup untouched).

### Step B3: Fix Storybook coverage for the moved import

Open `src/content/overlay/icons.stories.tsx`. If it imports anything from `@/components/icon` (e.g. `IconName`) that no longer applies, update it to reference the new `content-icon` module's exports instead. If it only imports `PinIcon`/`CopyIcon` from `./icons` and never references `@/components/icon` directly, no change is needed here.

**Verify**: `pnpm run test:storybook` → all pass, including any `icons.stories.tsx` / `ThemeCycleButton.stories.tsx` stories.

### Step B4: Confirm the popup's icon set is unaffected

**Verify**:

- `pnpm test` → all pass.
- `pnpm run test:storybook` → all pass (this includes popup-side stories that render icons via `@/components/icon`).
- Manually re-read `src/components/icon.tsx` and confirm the diff for this whole plan against it is empty (`git diff src/components/icon.tsx` → no output). This file must not have changed at all.

### Step B5: Measure the bundle size win

**Verify**: `pnpm run build` → exit 0, then `ls -la dist/content.js` → size must be smaller than the Step A1 baseline (Step Group A's timing change alone won't shrink bytes much; the icon cut in Step Group B is what should show a measurable byte reduction). Also check `ls -la dist/popup.js` and confirm its size is unchanged or only trivially different (popup still imports the full 25-icon barrel) — a large change there would indicate the popup's icon usage was accidentally affected.

## Test plan

- No new _behavioral_ test cases are required — this plan does not change user-visible behavior, only load timing and import graph.
- If `pnpm test` surfaces an existing test asserting the old eager-preload behavior (see Step A3), update that test's expectation to match the new `pointerdown`-gated behavior, modeled after how the existing test (if any) already asserts `loadQrCodeOverlayModule` is lazy.
- Manual check (cannot be automated by the executor): load the built extension in Chrome (`chrome://extensions` → load unpacked from `dist/` per this repo's dev flow), open a page, select text, and confirm the context-menu / overlay flow (e.g. "summarize" action) still opens the overlay and renders correctly, and that clicking the pin/copy/settings/close/chevron/message icons and cycling the theme button in the overlay all still render the correct icon glyphs (not a blank space, which would indicate an icon name mismatch introduced in Step B1). Note in your final report that this manual check was performed (or explicitly flag if it could not be, e.g. no Chrome available) — do not claim it passed without doing it.
- Verification command: `pnpm test && pnpm run test:storybook` → all pass, including any updated preload test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm run test:storybook` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `git diff src/components/icon.tsx` produces no output (popup-facing barrel untouched)
- [ ] `grep -n "pointerdown" src/content.ts` finds the new gated preload listener
- [ ] `dist/content.js` is smaller after this plan than the Step A1 baseline recorded before any change
- [ ] No files outside the in-scope list are modified (`git status --short`)
- [ ] `plans/README.md` status row updated
- [ ] Manual overlay/theme-icon check performed and noted in the final report (pass, or explicit reason it could not be performed)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written — re-run the drift check).
- Plan 004 (minify) has not landed yet, so there is no minified baseline to compare bundle sizes against.
- A step's verification fails twice after a reasonable fix attempt.
- Separating the content icon set turns out to require touching more than the four files listed in Scope (in particular, if `ThemeCycleButton` turns out to be imported from `src/popup/**` at execution time, contradicting the "content-only" assumption in Step B2) — report this and recommend deferring Finding (H) rather than letting the change sprawl into popup files.
- Any existing test or story asserts the exact `IconName` union from `@/components/icon.tsx` includes fewer than 25 names, or otherwise depends on the shared barrel's shape changing — that would mean the popup-side barrel was touched, which this plan forbids.
- The `dist/content.js` size after Step Group B is not smaller than the Step A1 baseline — that would mean the icon split did not achieve tree-shaking as expected, and the approach needs re-evaluation rather than being reported as done.

## Maintenance notes

- If a future overlay feature needs an icon outside the current 9-name `ContentIconName` set, add it to `src/content/overlay/content-icon.tsx` directly (import just that one lucide icon) — do not import from `@/components/icon.tsx` to "borrow" an icon, or the tree-shaking benefit from this plan is lost again.
- If `ThemeCycleButton` is ever reused by the popup, it will need to go back to importing from the full `@/components/icon.tsx` barrel (or the popup will need its own theme-icon usage of the full barrel) — revisit the Step B2 STOP condition guidance at that point.
- The `pointerdown` listener added in Step A2 is a one-shot warm-up only; it does not change what triggers the overlay/toast to actually render — those remain the explicit `showNotification`/`showActionOverlay`/`showSummaryOverlay` call sites. A reviewer should confirm the `once: true` option is present so the listener does not leak or re-fire.
- A reviewer should re-check that `src/content/qrcode-overlay.ts`'s already-lazy pattern was used as the reference and not altered.
- Follow-up explicitly deferred: further splitting `src/components/icon.tsx` for the popup itself (e.g. per-pane icon subsets) was not evaluated here and is out of scope — this plan only addresses the content-script side of the barrel.
