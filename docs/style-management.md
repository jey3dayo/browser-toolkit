---
type: reference
title: Style Management
description: Browser Toolkit の design token layers、theme switching、ShadowRoot stylesheet integration を説明する。
resource: urn:browser-toolkit:docs:style-management
tags:
  - category/design-system
  - audience/developer
timestamp: 2026-06-29
audience: developer
owner: browser-toolkit
---

# Style Management (Design Tokens)

This project manages UI styling via **Design Tokens** (CSS custom properties) and a `data-theme` attribute for runtime theme switching.

The same token system is used for:

- The extension popup (document-level CSS)
- ShadowRoot UIs injected by the content script (overlay + toasts)

## Token Layers

The token system is structured in 3 layers:

1. Primitive tokens (`src/styles/tokens/primitives.css`)
   - Physical values (palette, spacing, radii, shadows, typography)
2. Semantic tokens (`src/styles/tokens/semantic.css`)
   - Meaning-based values (surface/text/border/primary/etc), theme-aware
3. Component tokens (`src/styles/tokens/components.css`)
   - Component-specific values (button/input/card tokens) and shared component styles (toast/overlay)

## Theme Switching (`data-theme`)

Theme switching is done via `data-theme="dark" | "light"`.

Additionally, when `data-theme` is **absent**, the UI follows the system theme via `prefers-color-scheme` (Auto).

- Popup: applied to `document.documentElement`
- ShadowRoot: applied to `shadowRoot.host`

Implementation:

- `src/ui/theme.ts` exports `applyTheme()` and `Theme`
- `src/popup.ts` loads the stored theme (defaults to `auto`) and applies it at startup
- `src/popup/panes/SettingsPane.tsx` provides an Auto/Dark/Light selector and persists it to `chrome.storage.local`
- `src/content.ts` loads the stored theme (defaults to `auto`) and applies it to injected ShadowRoot surfaces (overlay + toasts)

## Stylesheet Layout

Popup styles are split by responsibility:

- `src/styles/base.css`: document base (reset + base variables that depend on layout)
- `src/styles/layout.css`: popup layout (app shell, sidebar, drawer, header)
- `src/styles/utilities.css`: small utility classes (`.stack`, `.row-between`, etc)

Shared component styles (used by both popup and ShadowRoot) live in:

- `src/styles/tokens/components.css`

## ShadowRoot Integration

`src/ui/shadow-host.ts` (`ensureShadowHost`) finds-or-creates the host `<div>` and its
`ShadowRoot`, with no style or i18n imports of its own. `src/content/shadow_mount.ts`
(`ensureShadowMount`) and `src/image-zoom/mount.ts` (`ensureViewerShadowMount`) both build on
it, then apply styles and theme as below.

ShadowRoot UIs load the same token/stylesheets via:

- `src/ui/styles.ts` (`ensureShadowUiBaseStyles`): primitives + semantic + all component CSS, for overlay/toast/popup-style ShadowRoot UIs.
- `src/ui/styles-tokens.ts` (`ensureShadowTokenStyles`): primitives + semantic only, plus a caller-supplied `extraCss`/id. Used where the full component CSS would bloat the bundle (e.g. `src/image-zoom/mount.ts`). Caller contract: the same `extraCss` id must always carry the same CSS text — the constructed sheet is cached per id, so a second call with that id and different CSS is silently ignored.

Each token/component/extra CSS text has exactly one constructed `CSSStyleSheet` instance,
built once at module scope (or lazily cached per `extraCss` id). That single instance is
adopted into every ShadowRoot that calls these functions via `adoptedStyleSheets` — it is
not re-created per shadow root. When constructed stylesheets are unsupported (e.g. jsdom),
both functions inject the same CSS as inline `<style>` tags instead. Even when constructed
stylesheets ARE supported and adopted, `shadowHasTokens` re-checks the host's computed
`--mbu-surface` value (skipped as "ok" while the host is disconnected or `getComputedStyle`
is unavailable); if that check still comes back empty, the `<style>` fallback runs as a
belt-and-suspenders layer on top of the already-adopted sheets. Neither path attaches
`<link rel="stylesheet">` tags — that mechanism is only used by the document-level
popup/options path (`ensurePopupUiBaseStyles`).

Keyboard/focus behavior for modal ShadowRoot UIs (Tab trap, Escape-to-close, page key
isolation, focus restore on close) is centralized in `src/ui/modal-controller.ts`
(`activateModal`), used by both `src/content/qrcode-overlay.ts` and
`src/image-zoom/viewer.ts`. Since those two files ship in separate bundles
(`content.js` / `image-zoom.js`) that still run in the same extension isolated
world, `activateModal` tracks which modal is topmost via a `globalThis` stack
(`__MBU_MODAL_STACK__`, declared in `src/types/globals.d.ts`) rather than
module-scope state. Key isolation covers document/element listeners and any
window-capture listener registered after the modal opened; a window-capture
listener registered before the modal opened still receives the event first
and is not isolated.

Base UI's `Portal` renders to `document.body` by default, which escapes the ShadowRoot and
loses styling. Any Base UI component with a portal (`Dialog`, `Toast`, etc.) rendered inside a
ShadowRoot must pass an explicit `container` pointing at the ShadowRoot. See
`src/ui/toast.tsx` (`Toast.Portal container`) and `src/components/shared/Dialog.tsx`
(`portalContainer` prop) for the established pattern.

## Legacy Alias Variables

`src/styles/tokens/semantic.css` still exposes a small set of legacy aliases (e.g. `--bg`, `--panel`, `--text`, and `--mbu-*`) to keep incremental refactors stable while migrating older styles.
