# SettingsPane UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `設定` ペインを `overview + 5 setting cards` 構成に再編し、保存/確認/削除の強弱と `ダーク / ライト / 自動` のテーマ導線を見た目で理解しやすくする。

**Architecture:** `src/popup/panes/SettingsPane.tsx` の state と storage/runtime の flow は維持し、DOM 構造と className を整理してカード UI を構築する。SettingsPane 専用スタイルは `popup-misc.css` に局所化し、既存の popup token / control class を流用して差分を最小限にする。検証は `tests/popup.settings_pane.test.ts` の fail-first 更新と Storybook の populated story を軸に行う。

**Tech Stack:** React 19, TypeScript, Base UI, popup design-token CSS, Vitest, Storybook

---

## File Map

- Modify: `src/popup/panes/SettingsPane.tsx`
  - `overview + 5 cards` の DOM 構造に再編する
  - Token card と Theme card の操作順を調整する
  - 既存の save / clear / test / provider change / theme apply のロジックは保持する
- Modify: `src/styles/tokens/components/popup-misc.css`
  - SettingsPane 専用の overview / card / action hierarchy / theme layout のスタイルを追加する
  - 既存の `.btn-delete`, `.hint`, `.prompt-input` などと干渉しないように局所化する
- Modify: `tests/popup.settings_pane.test.ts`
  - 新しい layout contract と token/theme の操作構造を表す unit test を追加する
  - 既存の interaction test が新構造で継続して通るように調整する
- Modify: `src/popup/panes/SettingsPane.stories.tsx`
  - overview card と 5 cards の視認性を確認しやすい populated story を追加する
  - Storybook test で主要導線が崩れていないことを確認する
- Verify only: `tests/popup.navigation.test.tsx`
  - SettingsPane の構造変更で popup の pane navigation が壊れていないことを確認する

## Verification Scope Notes

- この plan の品質ゲートは `SettingsPane` unit test + `SettingsPane` story + typecheck/lint/build に絞る
- `tests/e2e/popup.spec.ts` は smoke check の候補だが、実行コストが高いのでこの refactor の必須ゲートにはしない
- Storybook populated state で見た目の密度と theme 配置を確認できるようにして、手動確認コストを下げる

### Task 1: Lock the new overview-and-cards DOM contract

**Files:**
- Modify: `tests/popup.settings_pane.test.ts`
- Modify: `src/popup/panes/SettingsPane.tsx`

- [ ] **Step 1: Write the failing test for the new top-level structure**

Add assertions that describe the new layout contract before touching the component:

```ts
const overview = dom.window.document.querySelector(
  '[data-testid="settings-overview"]'
);
expect(overview).not.toBeNull();
expect(overview?.textContent).toContain("この端末のみ");

const sections = [
  ...dom.window.document.querySelectorAll<HTMLElement>(
    '[data-testid="settings-card"]'
  ),
].map((element) => element.dataset.section);
expect(sections).toEqual([
  "provider",
  "token",
  "model",
  "prompt",
  "theme",
]);
```

- [ ] **Step 2: Run the targeted unit test to verify it fails**

Run:

```bash
pnpm vitest run --project=unit tests/popup.settings_pane.test.ts
```

Expected: FAIL because `settings-overview` / `settings-card` hooks do not exist yet.

- [ ] **Step 3: Implement the minimal JSX reshuffle in `SettingsPane.tsx`**

Reorganize the markup without changing any handler logic:

```tsx
<div className="card card-stack settings-pane">
  <section className="settings-pane-overview" data-testid="settings-overview">
    {/* title, short explanation, provider/theme chips */}
  </section>

  <section
    className="settings-pane-card"
    data-section="provider"
    data-testid="settings-card"
  >
    {/* provider fieldset */}
  </section>

  <section
    className="settings-pane-card"
    data-section="token"
    data-testid="settings-card"
  >
    {/* token fieldset + actions */}
  </section>

  {/* model / prompt / theme cards */}
</div>
```

Rules for this step:

- Keep `saveToken`, `clearToken`, `testToken`, `savePrompt`, `saveModel`, `saveTheme` unchanged except for moving their rendered controls
- Preserve all existing `data-testid` hooks already used by tests
- Add only the minimum new `data-testid` hooks needed for the layout contract

- [ ] **Step 4: Run the same unit test again**

Run:

```bash
pnpm vitest run --project=unit tests/popup.settings_pane.test.ts
```

Expected: PASS for the new overview/card assertions and the existing interaction tests.

- [ ] **Step 5: Commit the structure-safe checkpoint**

```bash
git add tests/popup.settings_pane.test.ts src/popup/panes/SettingsPane.tsx
git commit -m "refactor: reorganize settings pane structure"
```

### Task 2: Lock token action hierarchy and theme ordering with tests

**Files:**
- Modify: `tests/popup.settings_pane.test.ts`
- Modify: `src/popup/panes/SettingsPane.tsx`

- [ ] **Step 1: Write the failing test for action grouping and theme layout**

Add assertions that describe the new hierarchy before changing the JSX:

```ts
const tokenPrimaryActions = dom.window.document.querySelector(
  '[data-testid="token-primary-actions"]'
);
const tokenDangerActions = dom.window.document.querySelector(
  '[data-testid="token-danger-actions"]'
);
const primaryButtons = Array.from(
  tokenPrimaryActions?.querySelectorAll<HTMLButtonElement>("button") ?? []
);

expect(primaryButtons.map((button) => button.dataset.testid)).toEqual([
  "token-save",
  "token-test",
]);
expect(
  tokenDangerActions?.querySelector('[data-testid="token-clear"]')
).not.toBeNull();

const themePrimary = dom.window.document.querySelector(
  '[data-testid="theme-primary-options"]'
);
const themeAuto = dom.window.document.querySelector(
  '[data-testid="theme-auto-option"]'
);
expect(themePrimary?.textContent).toContain("ダーク");
expect(themePrimary?.textContent).toContain("ライト");
expect(themeAuto?.textContent).toContain("自動");
```

- [ ] **Step 2: Run the targeted unit test to verify it fails**

Run:

```bash
pnpm vitest run --project=unit tests/popup.settings_pane.test.ts
```

Expected: FAIL because the new token/theme grouping hooks and order do not exist yet.

- [ ] **Step 3: Implement the minimal JSX changes for token actions and theme order**

Adjust only the rendered structure:

```tsx
<div
  className="settings-actions settings-actions--primary"
  data-testid="token-primary-actions"
>
  <Button data-testid="token-save">保存</Button>
  <Button data-testid="token-test">トークン確認</Button>
</div>
<div
  className="settings-actions settings-actions--danger"
  data-testid="token-danger-actions"
>
  <Button data-testid="token-clear">削除</Button>
</div>
```

For the theme card, keep the same `RadioGroup` state flow but split the options into primary and auto groups:

```tsx
<RadioGroup className="settings-theme-group" value={theme} ...>
  <div
    className="settings-theme-primary"
    data-testid="theme-primary-options"
  >
    {/* ダーク */}
    {/* ライト */}
  </div>
  <div className="settings-theme-auto" data-testid="theme-auto-option">
    {/* 自動 */}
  </div>
</RadioGroup>
```

Rules for this step:

- Keep `data-testid="token-save"`, `token-clear`, `token-test`, `ai-model`, `custom-prompt` unchanged
- Preserve the current `onValueChange` implementations
- Reorder the theme options to `dark`, `light`, `auto` in the DOM to match the approved design

- [ ] **Step 4: Run the same unit test again**

Run:

```bash
pnpm vitest run --project=unit tests/popup.settings_pane.test.ts
```

Expected: PASS for the new token/theme hierarchy assertions and all existing settings interactions.

- [ ] **Step 5: Commit the interaction-safe checkpoint**

```bash
git add tests/popup.settings_pane.test.ts src/popup/panes/SettingsPane.tsx
git commit -m "refactor: reorder settings pane actions and theme controls"
```

### Task 3: Apply localized settings styles and add a visual harness

**Files:**
- Modify: `src/styles/tokens/components/popup-misc.css`
- Modify: `src/popup/panes/SettingsPane.stories.tsx`
- Verify: `tests/popup.settings_pane.test.ts`
- Verify: `tests/popup.navigation.test.tsx`

- [ ] **Step 1: Add a populated SettingsPane story for visual inspection**

Create a story state that makes the hierarchy visible without extra setup:

```tsx
export const StructuredLayout: Story = {
  args: {
    runtime: createStoryPopupRuntime({
      local: {
        aiProvider: "anthropic",
        anthropicApiToken: "sk-ant-story",
        aiModel: PROVIDER_CONFIGS.anthropic.defaultModel,
        aiCustomPrompt: "日本語で要点を整理してください",
        theme: "dark",
      },
    }),
    notify: { info: fn(), success: fn(), error: fn() },
  },
};
```

If desired, add a short `play` assertion that confirms the overview card and theme grouping render.

- [ ] **Step 2: Add SettingsPane-specific styles in `popup-misc.css`**

Keep the styles local to the settings pane:

```css
.settings-pane {
  gap: 16px;
}

.settings-pane-overview {
  display: grid;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-primary) 12%, transparent),
    color-mix(in oklab, var(--color-primary-2) 10%, transparent)
  );
  border: 1px solid color-mix(in oklab, var(--color-primary) 18%, var(--line));
  border-radius: 16px;
}

.settings-pane-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: color-mix(in oklab, var(--panel) 96%, transparent);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.settings-actions--primary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.settings-actions--danger {
  display: grid;
}

.settings-theme-group {
  display: grid;
  gap: 10px;
}

.settings-theme-primary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
```

Include any additional helper styles needed for chips, subcopy, and the `自動` row, but keep them prefixed with `settings-`.

- [ ] **Step 3: Run targeted verification**

Run:

```bash
pnpm vitest run --project=unit tests/popup.settings_pane.test.ts tests/popup.navigation.test.tsx
pnpm vitest run --project=storybook src/popup/panes/SettingsPane.stories.tsx
pnpm run typecheck
pnpm run lint
pnpm run build
```

Expected:

- Unit tests PASS
- Storybook test PASS
- Typecheck PASS
- Lint PASS
- Build PASS

- [ ] **Step 4: Manually spot-check the story or popup**

Use one of these:

```bash
pnpm run storybook
```

or

```bash
pnpm run dev
```

Manual checklist:

- Overview card reads before the 5 setting cards
- Provider and theme chips are visible but not visually noisy
- Token card emphasizes `保存`, de-emphasizes `削除`
- Theme card shows `ダーク / ライト` first and `自動` second
- No horizontal scroll in popup width

- [ ] **Step 5: Commit the visual refinement checkpoint**

```bash
git add src/styles/tokens/components/popup-misc.css src/popup/panes/SettingsPane.stories.tsx
git commit -m "style: add card hierarchy to settings pane"
```

## Final Verification Checklist

- [ ] `pnpm vitest run --project=unit tests/popup.settings_pane.test.ts tests/popup.navigation.test.tsx`
- [ ] `pnpm vitest run --project=storybook src/popup/panes/SettingsPane.stories.tsx`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run build`
- [ ] Manual spot-check for overview hierarchy, token button emphasis, and theme ordering

## Out of Scope Follow-up

- Revisit whether other dense popup panes (`Actions`, `Templates`, `SearchGroups`) should adopt the same overview + card hierarchy in a separate design task
- If the theme 2 + 1 layout feels good in production, consider extracting a reusable `settings-choice-grid` pattern for other popup controls
