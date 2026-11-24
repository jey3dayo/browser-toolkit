---
type: reference
title: Knip
description: Browser Toolkit で Knip を report-only として運用するためのエントリ設定と指摘の分類記録。
resource: urn:browser-toolkit:docs:knip
tags:
  - category/quality
  - audience/developer
timestamp: 2026-10-16
audience: developer
owner: browser-toolkit
---

# Knip

Knip は report-only のレビュー用ツールとして運用しており、CI ゲートには組み込んでいません。`mise run report:knip` で実行し、検出された指摘を人がトリアージします。

実行する際は、`mise` の環境で `pnpm install` を済ませた状態にしてください。依存関係が入っていないと Vitest・Storybook・Playwright のプラグインが設定を読み込めず、大量の誤検知が発生します。

## エントリ設定

設定は `package.json` の `knip` フィールドに置いています。esbuild と Chrome 拡張機能の読み込み経路は Knip から自動で追跡できないため、エントリとして明示しています。

| Entry | 参照元 |
| --- | --- |
| `src/{background,content,popup,options,focus-override,search-blocklist,image-zoom}.ts` | `scripts/build-shared.mjs` の `entryPoints`（`manifest.json` と各 HTML が `dist/*.js` を読み込み） |
| `{popup,options}_bootstrap.js` | `popup.html` / `options.html` の `<script>` |
| `scripts/*.mjs` | `package.json` の scripts（`bundle` / `clean` / `copy:styles` / `dev`） |
| `tests/fixtures/tsx/*.tsx` | `tests/build/typecheck_tsx_support.test.ts` がパス指定で型チェックする fixture |

`ignoreDependencies` に含めている `vite` は、`vitest.config.ts` と `.storybook/main.ts` での型のみの import に対する設定です。バージョンは Vitest と Storybook 側の間接依存に任せているため、直接の依存としては宣言していません。

## 2026-10-16 の分類記録

導入時の指摘数は、エントリ設定前が 20 件（ファイル 8、devDependency 1、unlisted 2、export 2、型 8）、エントリ設定後が 11 件、トリアージ後が 1 件でした。

| 対象 | 分類 | 対応 |
| --- | --- | --- |
| `src/components/shared/Separator.tsx`（未使用ファイル） | accepted-risk | 共有プリミティブの一つで、`tests/ui/shared_primitives.test.ts` の Base UI import 許可リストに含まれている。現時点で呼び出し元は無いが、プリミティブ群の一部として残す。不要と確定した際に許可リストごと削除する |
| `@types/encoding-japanese`（未使用 devDependency） | remove | `encoding-japanese` 本体に `index.d.ts` が同梱されているため不要 |
| `selectValue`（`tests/helpers/forms.ts`） | remove | いずれのテストからも呼ばれていないヘルパー |
| `ChatGptAuthStatus`（`src/popup/runtime.ts`） | narrow | 同一ファイル内の `ChatGptAuthState` でのみ使用 |
| `RunContextActionResponse` の re-export（`src/popup/runtime.ts`） | narrow | 呼び出し側はすべて `@/background/types` から直接 import している |
| `AiProviderSettings` / `ChatGptAuthSettings` / `LocalUiSettings` / `LocalUserData` / `TableSortConfig` / `ContextMenuConfig`（`src/storage/types.ts`） | remove | `LocalStorageData` / `SyncStorageData` の `Pick` 別名で、自ファイル内を含め参照元が無い。ストレージ構造は元の 2 型で表現されている |
