---
type: reference
title: Knip
description: Browser Toolkit で Knip を report-only で使うための entry 設定と、指摘の分類記録。
resource: urn:browser-toolkit:docs:knip
tags:
  - category/quality
  - audience/developer
timestamp: 2026-10-16
audience: developer
owner: browser-toolkit
---

# Knip

Knip は report-only のレビュー用ツールで、ゲートではない。`mise run report:knip` で実行し、指摘は人がトリアージする。
`mise` の環境で `pnpm install` 済みの状態で動かすこと。依存が入っていないと Vitest / Storybook / Playwright の plugin が設定を読めず、誤検知が大量に出る。

## Entry

設定は `package.json#knip`。esbuild とブラウザ拡張の読み込み経路は Knip から追えないので、entry として明示している。

| Entry | 参照元 |
| --- | --- |
| `src/{background,content,popup,options,focus-override,search-blocklist,image-zoom}.ts` | `scripts/build-shared.mjs` の `entryPoints`（`manifest.json` と各 HTML が `dist/*.js` を読む） |
| `{popup,options}_bootstrap.js` | `popup.html` / `options.html` の `<script>` |
| `scripts/*.mjs` | `package.json` の scripts（`bundle` / `clean` / `copy:styles` / `dev`） |
| `tests/fixtures/tsx/*.tsx` | `tests/build/typecheck_tsx_support.test.ts` がパスで渡して型チェックする fixture |

`ignoreDependencies` の `vite` は、`vitest.config.ts` と `.storybook/main.ts` の型だけの import。バージョンは vitest / storybook が持っている transitive 依存なので、直接は宣言しない。

## 2026-10-16 の分類

導入時の指摘：entry を設定する前は 20 件（ファイル 8、devDependency 1、unlisted 2、export 2、型 8）。entry を設定した後は 11 件。トリアージ後は 1 件。

| 対象 | 分類 | 対応 |
| --- | --- | --- |
| `src/components/shared/Separator.tsx`（未使用ファイル） | accepted-risk | 共有 primitive の一つで、`tests/ui/shared_primitives.test.ts` の Base UI import 許可リストに載っている。いまは使う側がないが、primitive 群の一部として残す。使う予定がないと決まったら、許可リストと一緒に削除する |
| `@types/encoding-japanese`（未使用 devDependency） | remove | `encoding-japanese` 自体が `index.d.ts` を同梱しているので不要 |
| `selectValue`（`tests/helpers/forms.ts`） | remove | どのテストからも呼ばれていない helper |
| `ChatGptAuthStatus`（`src/popup/runtime.ts`） | narrow | 同じファイルの `ChatGptAuthState` でだけ使う |
| `RunContextActionResponse` の re-export（`src/popup/runtime.ts`） | narrow | 使う側はすべて `@/background/types` から直接 import している |
| `AiProviderSettings` / `ChatGptAuthSettings` / `LocalUiSettings` / `LocalUserData` / `TableSortConfig` / `ContextMenuConfig`（`src/storage/types.ts`） | remove | `LocalStorageData` / `SyncStorageData` の `Pick` 別名で、参照がどこにもない（自ファイル内も含む）。ストレージの形は元の 2 型が持っている |
