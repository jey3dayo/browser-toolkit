---
colors:
  primary: "#7c8cff"
  bgDark: "#0c0d10"
  surfaceDark: "#15171c"
  surfaceDarkRaised: "#1c1f26"
  textDark: "#ececef"
  textDarkMuted: "#9aa0ac"
  primaryDark: "#7c8cff"
  primaryDarkStrong: "#6674f5"
  dangerDark: "#f07178"
  bgLight: "#f6f6f8"
  surfaceLight: "#ffffff"
  surfaceLightRaised: "#f0f1f4"
  textLight: "#16181d"
  textLightMuted: "#6b7080"
  primaryLight: "#4f5fe0"
  primaryLightStrong: "#3f4dc7"
  dangerLight: "#d64545"
typography:
  ui:
    fontFamily: '"Segoe UI", "Helvetica Neue", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  title:
    fontFamily: '"Segoe UI", "Helvetica Neue", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "0px"
  label:
    fontFamily: '"Segoe UI", "Helvetica Neue", system-ui, sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0px"
  compactAction:
    fontFamily: '"Segoe UI", "Helvetica Neue", system-ui, sans-serif'
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "18px"
rounded:
  sm: "10px"
  md: "12px"
  lg: "14px"
  pill: "999px"
components:
  buttonPrimary:
    backgroundColor: "{colors.primaryDarkStrong}"
    textColor: "{colors.bgDark}"
    typography: "{typography.compactAction}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  buttonGhost:
    backgroundColor: "transparent"
    textColor: "{colors.textDark}"
    typography: "{typography.compactAction}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  field:
    backgroundColor: "{colors.surfaceDarkRaised}"
    textColor: "{colors.textDark}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surfaceDark}"
    textColor: "{colors.textDark}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surfaceDarkRaised}"
    textColor: "{colors.primaryDark}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  mutedMeta:
    backgroundColor: "{colors.surfaceDark}"
    textColor: "{colors.textDarkMuted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0"
  dangerButton:
    backgroundColor: "{colors.dangerDark}"
    textColor: "{colors.bgDark}"
    typography: "{typography.compactAction}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  lightSurface:
    backgroundColor: "{colors.bgLight}"
    textColor: "{colors.textLight}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    padding: "16px"
  lightRaisedSurface:
    backgroundColor: "{colors.surfaceLightRaised}"
    textColor: "{colors.textLight}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  lightPrimaryButton:
    backgroundColor: "{colors.primaryLightStrong}"
    textColor: "{colors.bgLight}"
    typography: "{typography.compactAction}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  overlayPanel:
    backgroundColor: "{colors.surfaceDark}"
    textColor: "{colors.textDark}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    padding: "0"
---

## Visual Theme & Atmosphere

Browser Toolkit の UI は、ブラウザ作業を邪魔しない小型の実務ツールとして扱う。装飾よりも判読性、状態の明確さ、操作密度を優先する。

popup は 800px x 600px の固定的な作業面を前提に、設定・一覧・編集・実行結果を素早く切り替えられる密度にする。ページ内 overlay はユーザーが見ている Web ページの上に出るため、浮遊感は出しつつ、影・角丸・色数を抑えて内容を読む邪魔をしない。

## Colors

CSS custom properties in `src/styles/tokens/` are the implementation source of truth. New UI must use semantic tokens such as `--color-bg`, `--color-surface`, `--color-text`, `--color-primary`, `--mbu-surface`, and `--mbu-accent` instead of hard-coded colors.

Both themes use neutral, low-saturation surfaces with a single indigo/blue accent hue (`--color-primary` / `--color-primary-strong`); there is no second accent color. `--color-primary-2` is kept only as a legacy alias of `--color-primary` for existing markup. Dark theme uses near-black neutrals; light theme uses off-white/white neutrals. Auto theme follows `prefers-color-scheme` when `data-theme` is absent. Muted text is a solid, non-alpha color in both themes so it holds at least 4.5:1 contrast against `--color-surface`.

Primary fills are flat: a solid `--color-primary` (or `--color-primary-strong` in light theme, which keeps AA contrast under white label text). Do not use accent gradients or colored glow shadows on buttons, icon wells, or nav items — reserve gradients for the product brandmark alone, and keep that gradient a single hue (`--color-primary` to `--color-primary-strong`), never a second color. The popup body background is a flat `--color-bg`, not a radial wash.

Primary color is reserved for the main affirmative action, selected state, active state, and focused affordance. Danger color is reserved for destructive or failure states. Muted text is used for labels, descriptions, helper text, and secondary metadata.

## Typography

Use the project sans stack everywhere: `"Segoe UI", "Helvetica Neue", system-ui, sans-serif`. Use the semantic font-size tokens instead of raw px: `--font-size-xs` (11px) for the smallest labels, `--font-size-sm` (12px) for metadata and overlay utility controls, `--font-size-md` (13px) for body text, `--font-size-lg` (16px) for pane and section titles, and `--font-size-xl` (18px) for the largest headings. `.pane-title` is a single definition (`--font-size-lg` / weight 650); do not add per-pane overrides.

Do not introduce viewport-scaled type. Keep letter spacing at 0 for new reusable typography rules unless an existing compact badge or legacy class already defines a small positive value.

## Layout & Spacing

Use the token spacing rhythm from `--spacing-xs` through `--spacing-xl`: 6px, 8px, 10px, 14px, and 18px. Dense controls can use 6px-10px gaps; pane-level grouping should use 14px-18px gaps.

Popup UI should keep navigation, pane content, and action rows visually separate without large marketing-style sections. Prefer grid and flex layouts with stable dimensions for repeated rows, toolbars, icon buttons, and output panels.

Overlay UI should fit within `min(560px, calc(100vw - 32px))`, cap height to the viewport, and keep header, body, and footer zones stable while content scrolls.

## Elevation & Depth

A selected or active state gets exactly one visual treatment, not several saying the same thing. Do not stack a tinted background, a ring, a shadow, a filled icon chip and an indicator bar on the same element — pick the single strongest one.

Use one raised surface layer for cards, popovers, dialogs, overlays, and toasts. Shadows should come from `--shadow-elevation` or the corresponding `--mbu-shadow`. Avoid stacked card-on-card layouts unless the inner surface is an actual dialog, popover, or repeated list item.

Scrims are only for modal focus or blocking overlays. Non-modal overlays should rely on border, shadow, and header contrast instead of dimming the page.

## Shapes

Standard control radius is 12px. Smaller utility controls can use 10px. Cards and overlay shells use 14px. Pills and chips use 999px.

Icon buttons should keep stable square dimensions, commonly 32px in overlays. Do not let hover text or status labels resize neighboring controls unexpectedly.

## Components

Shared React primitives in `src/components/shared/` are the default building blocks for popup and overlay UI. Base UI-backed primitives should preserve focus-visible outlines from `--focus-ring` and `--focus-ring-offset`.

Buttons use semantic variants: primary for the main action, ghost for secondary actions, danger for destructive actions, overlay variants for Shadow DOM surfaces, and icon-only variants when a familiar symbol is enough. Disabled controls must visibly reduce emphasis and must not imply success.

Inputs, selects, textareas, fieldsets, switches, toggles, tabs, dialogs, popovers, tooltips, and scroll areas should use the existing shared primitives before adding local markup. Form labels and helper text stay close to their control and use muted text.

Radio, checkbox and switch options sit directly on their card surface. The control itself is the selected-state affordance, so do not wrap each option in its own bordered chip inside a card. Buttons size to their label; do not stretch an action across an equal-width grid, which makes the primary action read as a banner.

Cards are for bounded tool surfaces and repeated items, not for wrapping entire page sections. Lists should keep row alignment, drag handles, expand controls, and badges stable across hover, focus, selected, disabled, empty, loading, error, and success states.

Toast and overlay surfaces share the ShadowRoot token set. Overlay action buttons should preserve keyboard and pointer parity, and active or primary overlay actions should use accent-tinted backgrounds rather than new colors.

## Storybook UI Reference

Storybook is the visual reference surface for shared UI, popup panes, and overlay states. Use `pnpm run storybook` to inspect current behavior, and use the toolbar theme selector to verify Auto, Dark, and Light.

Representative references live in:

- `src/popup/App.stories.tsx` and `src/popup/panes/*.stories.tsx` for popup layout and pane-level composition.
- `src/components/*.stories.tsx` and shared primitive stories for reusable control behavior.
- `src/content/overlay/*.stories.tsx` and `src/ui/toast.stories.tsx` for Shadow DOM overlays, toast placement, icons, and calendar/action output states.

When a new reusable component state is added, add or update a Storybook story for that state before treating it as part of the design system.

## Do's and Don'ts

Do use semantic CSS tokens and existing shared primitives.

Do verify popup and overlay UI in both dark and light themes.

Do keep Japanese UI strings concise and task-oriented.

Do keep focus states visible and consistent across keyboard and pointer usage.

Don't add new palette colors, type scales, rounded values, or shadow styles for a one-off screen.

Don't make landing-page-style hero sections inside this utility UI.

Don't place review policy, promotion criteria, or temporary exceptions in this file.
