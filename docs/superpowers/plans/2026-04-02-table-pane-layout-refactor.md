# TablePane Layout Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `サイト別機能` ペインを `header summary + URLパターン card + フォーカス維持 card` 構成に整理し、主 CTA と診断状態を初見で把握しやすくする。

**Architecture:** `src/popup/panes/TablePane.tsx` のロジックは維持し、DOM 構造と className を再編してレイアウトを作り直す。スタイル変更は `popup-misc.css` に集約し、既存の popup token / control class を流用して差分を局所化する。

**Tech Stack:** React 19, TypeScript, Base UI, popup design-token CSS, Vitest, Storybook stories

---

## File Map

- Modify: `src/popup/panes/TablePane.tsx`
  - `TablePane` の DOM 構造を `summary + section cards` に再編する
  - 既存の state / async action / runtime 呼び出しは保持する
- Modify: `src/styles/tokens/components/popup-misc.css`
  - `TablePane` 専用の summary / section / list / diagnostic styles を追加する
  - 既存の `.pattern-list`, `.pattern-item`, `.empty-message`, `.focus-diagnostic-*` を新レイアウトに合わせて調整する
- Modify: `tests/popup.table_sort_pane.test.ts`
  - 新しい DOM 契約と視線導線を守る unit test を追加する
- Modify: `src/popup/panes/TablePane.stories.tsx`
  - レイアウト確認しやすい story state を追加または調整する
- Verify only: `tests/popup.navigation.test.tsx`
  - ペイン切り替えの基本導線が壊れていないことを確認する

## Verification Scope Notes

- この plan の品質ゲートは `TablePane` 周辺の unit test + navigation test + typecheck/lint に絞る
- `tests/e2e/popup.spec.ts` と `tests/e2e/table-sort.spec.ts` には削除済みの `すべてのサイトで有効化` 前提が残っているため、このレイアウト refactor のゲートには含めない
- 上記 e2e の modernize は別タスクとして扱う

### Task 1: Lock the new DOM contract with failing tests

**Files:**
- Modify: `tests/popup.table_sort_pane.test.ts`
- Modify: `src/popup/panes/TablePane.tsx`
- Verify: `tests/popup.navigation.test.tsx`

- [ ] **Step 1: Write the failing test for the new summary and card structure**

Add assertions that describe the new layout contract before touching the component:

```ts
const summary = dom.window.document.querySelector(
  '[data-testid="table-pane-summary"]'
);
expect(summary).not.toBeNull();
expect(summary?.textContent).toContain("このタブで有効化");

const sections = [
  ...dom.window.document.querySelectorAll<HTMLElement>(
    '[data-testid="table-pane-section"]'
  ),
].map((element) => element.dataset.section);
expect(sections).toEqual(["url-patterns", "focus-override"]);

const diagnostic = dom.window.document.querySelector(
  '[data-testid="focus-diagnostic-panel"]'
);
const focusInput = dom.window.document.querySelector(
  '[data-testid="focus-pattern-input"]'
);
expect(
  diagnostic?.compareDocumentPosition(focusInput as Node) &
    dom.window.Node.DOCUMENT_POSITION_FOLLOWING
).toBeTruthy();
```

- [ ] **Step 2: Run the targeted unit test to verify it fails**

Run:

```bash
pnpm vitest run tests/popup.table_sort_pane.test.ts
```

Expected: FAIL because `table-pane-summary` / `table-pane-section` do not exist yet.

- [ ] **Step 3: Implement the minimal JSX reshuffle in `TablePane.tsx`**

Create the new wrapper structure without changing any runtime behavior:

```tsx
<div className="card card-stack table-pane">
  <div className="table-pane-header">
    <div className="row-between table-pane-heading">
      <h2 className="pane-title">サイト別機能</h2>
      <Button data-testid="enable-table-sort">このタブで有効化</Button>
    </div>

    <section
      className="table-pane-summary"
      data-testid="table-pane-summary"
    >
      {/* short intro + current state summary */}
    </section>
  </div>

  <section
    className="table-pane-section"
    data-testid="table-pane-section"
    data-section="url-patterns"
  >
    {/* URL patterns */}
  </section>

  <section
    className="table-pane-section"
    data-testid="table-pane-section"
    data-section="focus-override"
  >
    {/* focus diagnostic first, then input/list */}
  </section>
</div>
```

Rules for this step:

- Keep `enableNow`, `runFocusDiagnostic`, `addPattern`, `addFocusPattern`, `remove*`, `togglePatternRowFilter`, `reloadCurrentTab` unchanged except for moving their rendered controls
- Preserve all existing `data-testid` hooks already used by tests
- Add only the minimum new `data-testid` hooks needed for the layout contract

- [ ] **Step 4: Run the same unit test again**

Run:

```bash
pnpm vitest run tests/popup.table_sort_pane.test.ts
```

Expected: PASS for the new structure assertions and all pre-existing TablePane behavior tests.

- [ ] **Step 5: Commit the structure-safe checkpoint**

```bash
git add tests/popup.table_sort_pane.test.ts src/popup/panes/TablePane.tsx
git commit -m "refactor: reorganize table pane structure"
```

### Task 2: Apply the summary/card visual hierarchy

**Files:**
- Modify: `src/styles/tokens/components/popup-misc.css`
- Modify: `src/popup/panes/TablePane.tsx`

- [ ] **Step 1: Add the new layout classes in CSS**

Start with focused selectors for TablePane-only wrappers:

```css
.table-pane {
  gap: 18px;
}

.table-pane-summary {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-primary) 18%, transparent),
    color-mix(in oklab, var(--color-primary-2) 14%, transparent)
  );
  border: 1px solid color-mix(in oklab, var(--color-primary-2) 18%, var(--line));
  border-radius: 16px;
}

.table-pane-section {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: color-mix(in oklab, var(--panel-soft) 92%, transparent);
  border: 1px solid var(--line);
  border-radius: 16px;
}
```

- [ ] **Step 2: Restyle the list and empty states to match the new card layout**

Update the existing selectors instead of inventing a second list system:

```css
.pattern-list {
  max-height: 320px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed var(--line);
  border-radius: 14px;
}

.pattern-item {
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-height: 48px;
  padding: 10px 12px;
  border-radius: 12px;
}

.empty-message {
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed var(--line);
  border-radius: 14px;
}
```

- [ ] **Step 3: Rework the diagnostic panel so state is visually dominant**

Keep the existing hooks and status classes, but rebalance spacing and action placement:

```css
.focus-diagnostic-panel {
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
}

.focus-diagnostic-summary {
  gap: 10px;
}

.focus-diagnostic-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}
```

Wire the new `focus-diagnostic-actions` class in `TablePane.tsx` if needed instead of relying on a generic button wrapper.

- [ ] **Step 4: Build the extension bundle to verify CSS integration**

Run:

```bash
pnpm run build
```

Expected: PASS with copied styles and no type errors from the JSX reshuffle.

- [ ] **Step 5: Commit the styling checkpoint**

```bash
git add src/popup/panes/TablePane.tsx src/styles/tokens/components/popup-misc.css
git commit -m "style: add summary and card hierarchy to table pane"
```

### Task 3: Add a visual harness and finish verification

**Files:**
- Modify: `src/popup/panes/TablePane.stories.tsx`
- Verify: `tests/popup.table_sort_pane.test.ts`
- Verify: `tests/popup.navigation.test.tsx`

- [ ] **Step 1: Expand the story so the new layout is easy to inspect**

Add a populated story state that shows both pattern cards and an active focus diagnosis:

```tsx
export const Populated: Story = {
  args: {
    runtime: createStoryPopupRuntime({
      sync: {
        domainPatternConfigs: [
          { pattern: "example.com/foo*", enableRowFilter: true },
          { pattern: "example.com/bar*", enableRowFilter: false },
        ],
        focusOverridePatterns: ["example.com/reader/*"],
      },
      activeTabId: 1,
    }),
    notify: { info: fn(), success: fn(), error: fn() },
  },
};
```

If `createStoryPopupRuntime` cannot express the desired diagnosis state directly, keep the story focused on layout density and use the unit test suite as the behavior gate.

- [ ] **Step 2: Run the targeted popup tests**

Run:

```bash
pnpm vitest run tests/popup.table_sort_pane.test.ts tests/popup.navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run typecheck and lint**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: PASS.

- [ ] **Step 4: Manually spot-check the story or popup if needed**

Use one of these:

```bash
pnpm run storybook
```

or

```bash
pnpm run dev
```

Manual checklist:

- Summary band reads before the two cards
- `URLパターン` card and `フォーカス維持` card feel visually separate
- `focus-diagnostic-panel` is above the focus pattern input
- No horizontal scroll in the popup width

- [ ] **Step 5: Commit the verified result**

```bash
git add src/popup/panes/TablePane.stories.tsx
git commit -m "test: add visual harness for table pane layout"
```

## Final Verification Checklist

- [ ] `pnpm vitest run tests/popup.table_sort_pane.test.ts tests/popup.navigation.test.tsx`
- [ ] `pnpm run build`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] Manual spot-check for summary hierarchy and no horizontal scroll

## Out of Scope Follow-up

- Modernize `tests/e2e/popup.spec.ts` and `tests/e2e/table-sort.spec.ts` to remove the deleted `すべてのサイトで有効化` contract
- If the new summary pattern works well, consider applying the same hierarchy to other dense popup panes in a separate refactor
