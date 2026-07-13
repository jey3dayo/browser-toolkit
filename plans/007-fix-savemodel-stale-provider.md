# Plan 007: Fix `saveModel` using stale `provider` closure on provider switch

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31dee9a..HEAD -- src/popup/panes/settings/useSettingsState.ts src/popup/panes/settings/SettingsProviderSection.tsx src/popup/panes/settings/SettingsModelSection.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `31dee9a`, 2026-07-14

## Why this matters

`saveModel` in `useSettingsState.ts` normalizes the model against the `provider`
value captured in the current render's closure. When the user switches AI
provider, `SettingsProviderSection.tsx`'s `handleValueChange` calls
`setProvider(newProvider)` and then, in the **same** event handler (before
React re-renders and before `useSettingsState` re-executes with the new
`provider`), calls `await saveModel(defaultModel)`. That call still runs with
the OLD `provider` closed over, so `normalizeAiModel(oldProvider,
newProviderDefaultModel)` fails to find the new provider's default model in
the old provider's model list and falls back to the OLD provider's default
model. `chrome.storage.local` briefly (and, if `saveProvider`/`saveModel`
partially fail, persistently) holds `aiProvider = newProvider` together with
`aiModel = oldProvider's default`, an inconsistent pair.

This is currently masked because `useSettingsState.ts` re-normalizes the
stored model against the stored provider on next load (`useEffect` at
`useSettingsState.ts:93-147`, specifically line 127). Any other code path that
reads `aiModel` from storage without going through that same re-normalization
(e.g. a future background/content script read, or a test asserting the
persisted pair) would observe the inconsistent state. Fixing `saveModel` to
take an explicit target provider removes the stale-closure bug at its source
instead of relying on the masking re-normalization.

## Current state

- `src/popup/panes/settings/useSettingsState.ts` — owns `provider` state and
  `saveModel`/`saveProvider`. Relevant excerpt (lines 198-203):

  ```ts
  const saveModel = async (value: string): Promise<void> => {
    const normalized = normalizeAiModel(provider, value);
    await runtime.storageLocalSet({
      aiModel: normalized,
    });
  };
  ```

  The `saveModel` type is declared at line 48:

  ```ts
  saveModel: (value: string) => Promise<void>;
  ```

  On load, storage is re-normalized against the stored provider (lines
  113-128), which is why the bug is currently invisible in the UI:

  ```ts
  const providerValue = raw.aiProvider ?? "openai";
  const resolvedProvider = safeParseAiProvider(providerValue) ?? "openai";
  setProvider(resolvedProvider);
  ...
  const modelValue = raw.aiModel ?? raw.openaiModel;
  const resolvedModel = normalizeAiModel(resolvedProvider, modelValue);
  setModel(resolvedModel);
  ```

- `src/popup/panes/settings/SettingsProviderSection.tsx` — `handleValueChange`
  (lines 33-63) is the caller that hits the stale-closure bug:

  ```ts
  const handleValueChange = async (value: string): Promise<void> => {
    const newProvider = safeParseAiProvider(value);
    if (!newProvider) {
      return;
    }
    setProvider(newProvider);
    // プロバイダー変更時にモデルをデフォルトにリセット
    const defaultModel = PROVIDER_CONFIGS[newProvider].defaultModel;
    setModel(defaultModel);

    // プロバイダー別トークンをロード（完了を待つ）
    const tokenKey = getAiProviderTokenKey(newProvider);
    try {
      const result = await runtime.storageLocalGet([tokenKey]);
      if (Result.isSuccess(result)) {
        const raw = result.value as Partial<LocalStorageData>;
        const tokenValue = raw[tokenKey];
        setToken(typeof tokenValue === "string" ? tokenValue : "");
      }
    } catch {
      // no-op
    }

    // トークンロード完了後に保存
    try {
      await saveProvider(newProvider);
      await saveModel(defaultModel);
    } catch {
      // no-op
    }
  };
  ```

  The component prop type for `saveModel` is declared at line 21:

  ```ts
  saveModel: (value: string) => Promise<void>;
  ```

- `src/popup/panes/settings/SettingsModelSection.tsx` — the OTHER caller of
  `saveModel`, lines 34-43. This one already normalizes against the CURRENT
  `provider` before calling `saveModel`, so it does not need a provider
  override:

  ```ts
  onValueChange={(value) => {
    if (value === null) {
      return;
    }
    const normalized = normalizeAiModel(provider, value);
    setModel(normalized);
    saveModel(normalized).catch(() => {
      // no-op
    });
  }}
  ```

  Its prop type is declared at line 17:

  ```ts
  saveModel: (value: string) => Promise<void>;
  ```

- `src/schemas/provider.ts` — `normalizeAiModel(provider, value)` (lines
  77-93) and `AiProvider` type (line 15), `PROVIDER_CONFIGS` (lines 17-44).
  Do NOT change this file — the normalization logic itself is correct; the
  bug is which `provider` value gets passed in.

- `src/popup/panes/SettingsPane.tsx` — wires `state.saveModel` into both
  `SettingsProviderSection` (line 35) and `SettingsModelSection` (line 60). No
  change needed here; both continue to receive the same `saveModel` function
  reference, now with a wider (optional-arg) signature.

- Test file `tests/popup.settings_pane.dom.test.ts` is the structural pattern
  for popup settings tests: it drives the real popup DOM via a Chrome stub
  (`createPopupChromeStub`), imports `@/popup.ts`, and asserts on
  `chromeStub.storage.local.set` calls. It already has a model-select test at
  lines 237-259 and uses `selectBaseUiOption` from `./helpers/forms` to drive
  Base UI select components, and `flush`/`act` for async settling. There is
  no existing test that switches AI provider; you will add one to this file
  following the same pattern.

## Commands you will need

| Purpose   | Command                                              | Expected on success |
| --------- | ---------------------------------------------------- | ------------------- |
| Typecheck | `pnpm run typecheck`                                 | exit 0, no errors   |
| Tests     | `pnpm test -- tests/popup.settings_pane.dom.test.ts` | all pass            |
| Full test | `pnpm test`                                          | all pass            |
| Lint      | `pnpm run lint`                                      | exit 0              |

(Verified from `package.json` scripts: `typecheck`, `test`, `lint`.)

## Scope

**In scope** (the only files you should modify):

- `src/popup/panes/settings/useSettingsState.ts`
- `src/popup/panes/settings/SettingsProviderSection.tsx`
- `src/popup/panes/settings/SettingsModelSection.tsx` (type-only change to the
  `saveModel` prop type, to match the new signature — no behavior change)
- `tests/popup.settings_pane.dom.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- `src/schemas/provider.ts` — `normalizeAiModel` itself is correct; do not
  change its signature or logic.
- `src/popup/panes/SettingsPane.tsx` — no wiring change needed.
- Any other settings pane file (`SettingsTokenSection.tsx`,
  `SettingsPromptSection.tsx`, `SettingsThemeSection.tsx`,
  `SettingsPaneLayout.tsx`) — unrelated to this bug.
- `LocalStorageData` / `src/storage/types.ts` — no schema change needed.

If fixing this requires touching any of the above out-of-scope files, STOP
and report instead of proceeding.

## Git workflow

- Branch: `advisor/007-fix-savemodel-stale-provider`
- Commit message style (conventional commits, no footer/signature), e.g.:
  `fix(popup): normalize saveModel against target provider on switch`
- Do NOT push or open a PR unless explicitly instructed.

## Steps

### Step 1: Widen `saveModel`'s signature to accept an explicit target provider

In `src/popup/panes/settings/useSettingsState.ts`:

1. Change the type declaration at line 48 from:

   ```ts
   saveModel: (value: string) => Promise<void>;
   ```

   to:

   ```ts
   saveModel: (value: string, providerOverride?: AiProvider) => Promise<void>;
   ```

2. Change the implementation at lines 198-203 from:

   ```ts
   const saveModel = async (value: string): Promise<void> => {
     const normalized = normalizeAiModel(provider, value);
     await runtime.storageLocalSet({
       aiModel: normalized,
     });
   };
   ```

   to:

   ```ts
   const saveModel = async (
     value: string,
     providerOverride?: AiProvider,
   ): Promise<void> => {
     const normalized = normalizeAiModel(providerOverride ?? provider, value);
     await runtime.storageLocalSet({
       aiModel: normalized,
     });
   };
   ```

`AiProvider` is already imported in this file (line 13), so no new import is
needed.

**Verify**: `pnpm run typecheck` → this step alone will likely fail because
the two callers (Step 2/3) still use the old signature in a way that's still
compatible (optional param, so old call sites `saveModel(value)` remain valid)
— typecheck should still pass after this step alone. Confirm: `pnpm run typecheck` exits 0.

### Step 2: Pass `newProvider` explicitly from the provider-switch handler

In `src/popup/panes/settings/SettingsProviderSection.tsx`:

1. Update the prop type at line 21 from:

   ```ts
   saveModel: (value: string) => Promise<void>;
   ```

   to:

   ```ts
   saveModel: (value: string, providerOverride?: AiProvider) => Promise<void>;
   ```

2. In `handleValueChange` (lines 57-62), change:

   ```ts
   try {
     await saveProvider(newProvider);
     await saveModel(defaultModel);
   } catch {
     // no-op
   }
   ```

   to:

   ```ts
   try {
     await saveProvider(newProvider);
     await saveModel(defaultModel, newProvider);
   } catch {
     // no-op
   }
   ```

`AiProvider` is already imported in this file (line 8).

**Verify**: `pnpm run typecheck` → exit 0, no errors.

### Step 3: Update `SettingsModelSection.tsx`'s prop type to match (no behavior change)

In `src/popup/panes/settings/SettingsModelSection.tsx`, update the prop type
at line 17 from:

```ts
saveModel: (value: string) => Promise<void>;
```

to:

```ts
saveModel: (value: string, providerOverride?: AiProvider) => Promise<void>;
```

`AiProvider` is already imported in this file (line 7, as part of the
`import { type AiProvider, normalizeAiModel, type PROVIDER_CONFIGS } from "@/schemas/provider";` statement). Do NOT change the `onValueChange` call site
in this file — it correctly calls `saveModel(normalized)` with the current
provider already baked into `normalized` via `normalizeAiModel(provider, value)`,
and needs no override.

**Verify**: `pnpm run typecheck` → exit 0, no errors.

### Step 4: Add a regression test for provider switch

In `tests/popup.settings_pane.dom.test.ts`, add a new `it(...)` block after
the existing `"saves the selected model using local storage"` test (after
line 259, before the `"orders theme options..."` test). The test must:

1. Locate the provider radio inputs. `SettingsProviderSection.tsx` renders a
   `RadioFieldset` with `name="aiProvider"` and options `openai`, `anthropic`,
   `zai` (see `SettingsProviderSection.tsx` lines 70-75). Find the radio input
   whose value is `"anthropic"` — the `RadioFieldset`/underlying component
   renders standard radio `<input>` elements; select it with something like:

   ```ts
   const anthropicRadio = dom.window.document.querySelector<HTMLInputElement>(
     'input[name="aiProvider"][value="anthropic"]',
   );
   expect(anthropicRadio).not.toBeNull();
   ```

   If this selector does not find the element (radio markup may differ),
   inspect the rendered DOM (e.g. temporarily log
   `dom.window.document.querySelector('[data-testid="settings-card"][data-section="provider"]')?.outerHTML`
   in a scratch script, not committed) to find the correct selector, and use
   that instead. Do not guess indefinitely — if you cannot find a working
   selector after two attempts, treat it as a STOP condition (see below) and
   report the actual rendered markup.

2. Click/check that radio inside `act(...)` + `flush(dom.window)`, mirroring
   the existing "saves and clears the token" test's `act` pattern (lines
   142-146).

3. Assert `chromeStub.storage.local.set` was called with an object containing
   BOTH `aiProvider: "anthropic"` AND `aiModel` equal to
   `ANTHROPIC_MODELS.CLAUDE_SONNET_4_5` (import `ANTHROPIC_MODELS` from
   `@/constants/models`, alongside the existing `OPENAI_MODELS` import at line
   4). This is the concrete regression check: before the fix, `aiModel` would
   have been saved as the stale `OPENAI_MODELS.DEFAULT` (or whatever the
   previous provider's default was) instead of the new provider's default.

   Because `saveProvider` and `saveModel` are two separate
   `runtime.storageLocalSet` calls, assert each call site separately, e.g.:

   ```ts
   expect(chromeStub.storage.local.set).toHaveBeenCalledWith(
     expect.objectContaining({ aiProvider: "anthropic" }),
     expect.any(Function),
   );
   expect(chromeStub.storage.local.set).toHaveBeenCalledWith(
     expect.objectContaining({ aiModel: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5 }),
     expect.any(Function),
   );
   ```

4. Also assert the model select UI reflects the new default, mirroring line
   258 (`expect(modelSelect?.textContent).toContain(...)`), to catch any
   `setModel` state-sync regression:

   ```ts
   const modelSelect = dom.window.document.querySelector<HTMLButtonElement>(
     '[data-testid="ai-model"]',
   );
   expect(modelSelect?.textContent).toContain(
     ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
   );
   ```

**Verify**: `pnpm test -- tests/popup.settings_pane.dom.test.ts` → all tests in
this file pass, including the new one. Run this test WITHOUT the Step 1-3
fix first (or `git stash` the source changes) to confirm it fails against the
old code — this confirms the test actually exercises the bug — then re-apply
the fix and confirm it passes. If the test passes even without the fix, the
test is not exercising the bug; revise it (likely the assertion needs to be
tighter, or the radio selector isn't actually triggering
`handleValueChange`) rather than declaring success.

## Test plan

- New test: "switches provider and persists a consistent provider/model pair"
  (or similar name) in `tests/popup.settings_pane.dom.test.ts`, covering the
  regression: switching AI provider must persist `aiModel` matching the NEW
  provider's default, not the previous provider's.
- Structural pattern: model after the existing
  `"saves the selected model using local storage"` test in the same file
  (uses `act`, `flush`, `chromeStub.storage.local.set` assertions).
- Verification: `pnpm test` → all pass, including the new test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm test` exits 0; new provider-switch test in
      `tests/popup.settings_pane.dom.test.ts` exists and passes
- [ ] `pnpm run lint` exits 0
- [ ] `grep -n "saveModel(defaultModel);" src/popup/panes/settings/SettingsProviderSection.tsx` returns no matches (confirms the override argument was added)
- [ ] No files outside the in-scope list are modified (`git status --short`)
- [ ] `plans/README.md` status row for plan 007 updated (create the row if
      `plans/README.md` does not yet exist, following the index format in
      the `improve` skill's plan template)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  above (the codebase has drifted since this plan was written at `31dee9a`).
- The radio input selector in Step 4 cannot be found after two reasonable
  selector attempts — report the actual rendered markup instead of guessing
  further.
- A step's verification (`pnpm run typecheck`, `pnpm test`, `pnpm run lint`)
  fails twice after a reasonable fix attempt.
- The fix appears to require touching `src/schemas/provider.ts`,
  `src/popup/panes/SettingsPane.tsx`, or any other out-of-scope file.
- The new regression test in Step 4 passes even without applying the Step
  1-3 fix (meaning the test does not actually exercise the bug).

## Maintenance notes

- Any future new caller of `saveModel` that switches provider in the same
  handler as the model save must pass the target provider as the second
  argument, mirroring `SettingsProviderSection.tsx`'s
  `saveModel(defaultModel, newProvider)` call. A reviewer should check for
  this pattern if new provider-related settings flows are added.
- The load-time re-normalization in `useSettingsState.ts`'s `useEffect`
  (around line 127) remains as defense-in-depth; it is not removed by this
  plan and continues to guard against any stale/legacy stored model value on
  next popup open, independent of this fix.
- No follow-up work is deferred; this plan closes the finding fully within
  its scope.
