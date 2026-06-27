# DESIGN_REVIEW.md

## Purpose

This file defines how Browser Toolkit UI design work is reviewed and where design decisions should live. Durable visual rules belong in `DESIGN.md`; implementation details belong in code; feature-local exceptions stay near the feature unless they are promoted intentionally.

## Scope

Use this guide for popup UI, shared React primitives, Storybook stories, Shadow DOM overlays, toasts, and content-script UI that appears on a web page.

This guide does not replace `CLAUDE.md`, `.kiro/steering/*`, `docs/style-management.md`, or the CSS token implementation in `src/styles/tokens/`.

## Routing Rules

Put reusable visual rules in `DESIGN.md` when they describe cross-screen color roles, typography, spacing, radius, elevation, component appearance, theme behavior, or Storybook reference expectations.

Put review operations in this file when they describe review order, promotion criteria, exception handling, or escalation.

Put implementation details in shared code when the same semantics, state model, accessibility behavior, and styling are needed by more than one surface. Visual similarity alone is not enough to promote code into `src/components/shared/`.

Keep feature-local UI local when the behavior is unique to one pane, one overlay state, or one experiment. If the local pattern repeats in another surface, re-check whether it should become a shared primitive, a CSS token, or a `DESIGN.md` rule.

Storybook UI reference is required for reusable visual behavior. A shared component, popup pane, overlay state, or toast state should have a representative story before reviewers treat it as stable design-system evidence.

## Review Flow

Review in this order:

1. `CLAUDE.md` and relevant `.kiro/steering/*` source-of-truth documents.
2. `DESIGN.md` for visual system rules.
3. `docs/style-management.md`, `src/styles/tokens/`, and shared primitives for implementation source.
4. Storybook stories for current rendered reference states.
5. Feature-local code and tests for the specific change.

For browser-visible changes, check at least one popup or overlay story, one dark/light theme pass when relevant, and keyboard-visible focus behavior for touched controls.

Before asking for a new UI reference tool, first check whether existing Storybook stories can cover the needed state. Add or adjust stories before adding another reference surface.

## Review Format

Use this format for design-system and Storybook reference reviews:

```md
総合判定: OK | 調整推奨 | 大幅修正推奨

- 構造: OK | 要修正 | 不足
  理由: ...
- 雰囲気記述: OK | 要修正 | 不足
  理由: ...
- 色: OK | 要修正 | 不足
  理由: ...
- タイポグラフィ: OK | 要修正 | 不足
  理由: ...
- コンポーネント: OK | 要修正 | 不足
  理由: ...
- レイアウト: OK | 要修正 | 不足
  理由: ...
- Storybook参照性: OK | 要修正 | 不足
  理由: ...
- Stitch再利用性: OK | 要修正 | 不足
  理由: ...

優先修正:

1. ...
2. ...
3. ...
```

When doing a code review instead of a design-system review, lead with concrete findings and cite files, lines, screenshots, Storybook states, or command output.

## Escalation

Escalate before changing code when:

- A rule could belong in both `DESIGN.md` and shared UI code, and promotion would change multiple surfaces.
- A new token, palette color, radius, shadow, or typography role is needed.
- A Storybook reference is missing and the intended state cannot be inferred from existing UI.
- A local exception appears in multiple screens.
- The change would alter accessibility behavior, data persistence, security boundaries, or Chrome Extension runtime boundaries.

When escalating, state the unresolved routing decision, the evidence already checked, and the smallest options available.

## Notes

Storybook is already the correct UI reference mechanism for this repository. Keep using the existing `@storybook/react-vite` setup, addon-docs, addon-a11y, and theme toolbar instead of introducing a separate visual reference format.

Do not duplicate full CSS token inventories here. Cite the token files and keep this document focused on review and routing.
