# Plan 015: Playwright e2e スイートを列挙・実行可能な状態に戻す

> **Executor instructions**: この計画を上から順に実行してください。各ステップの検証コマンドを必ず実行し、
> 期待結果を確認してから次に進んでください。「STOP conditions」に該当したら、勝手に工夫せず停止して報告して
> ください。完了したら `plans/README.md` の当該行の Status を更新してください（レビュアーが index を管理する
> と明示された場合は不要）。
>
> **Drift check (最初に実行)**: `git diff --stat 9c49e9b..HEAD -- tests/e2e playwright.config.ts package.json`
> 差分があれば、下記「Current state」の抜粋と実コードを比較し、一致しない場合は STOP condition として扱って
> ください。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `9c49e9b`, 2026-08-10

## Why this matters

Playwright の e2e スイートは現在**テストの列挙すらできない**状態です。`pnpm exec playwright test --list` は
`SyntaxError: Cannot use 'import.meta' outside a module` で失敗し、`Total: 0 tests in 0 files` を返します。
原因は `package.json` に `"type": "module"` がないため Playwright の TypeScript ローダが `tests/e2e/*.ts` を
CommonJS として扱い、`import.meta` が構文エラーになることです。

CI（`.github/workflows/ci.yml`）は e2e を実行していないため、この故障は誰にも気づかれません。結果として
「e2e スイートがある」という前提が虚偽になっており、拡張機能のロード・popup 遷移・テーブルソートという
最も回帰しやすい経路に自動検証が一切ありません。このプランのゴールは **列挙と実行が成立する状態に戻すこと**
であり、テストの中身を書き換えることではありません。

## Current state

対象ファイルと役割:

- `tests/e2e/setup.ts` — Playwright fixture。拡張機能を `launchPersistentContext` でロードし `extensionId` を解決する。
- `tests/e2e/table-sort.spec.ts` — テーブルソートの e2e。ローカル fixture HTML を `file://` で開く。
- `tests/e2e/popup.spec.ts` — popup UI の e2e。`./setup` から `test`/`expect` を import する。plan 013 で 2 テストが `test.skip` 済み。
- `playwright.config.ts` — `testDir: "./tests/e2e"`、`workers: 1`、`projects: [chromium]`。
- `package.json` — `"type"` フィールドは**存在しない**（＝CommonJS 扱い）。

`import.meta` を使っている箇所は正確に 3 箇所です:

`tests/e2e/setup.ts:8-11`
```ts
  context: async ({}, use) => {
    const pathToExtension = path.join(import.meta.dirname, "../../");
    const context = await chromium.launchPersistentContext("", {
      headless: false,
```

`tests/e2e/table-sort.spec.ts:12`
```ts
    const testPagePath = `file://${path.join(import.meta.dirname, "fixtures/test-table.html")}`;
```

`tests/e2e/table-sort.spec.ts:66`
```ts
    const testPagePath = `file://${path.join(import.meta.dirname, "fixtures/test-table.html")}`;
```

`tests/e2e/setup.ts` の先頭（変更しない部分）:
```ts
import path from "node:path";
import { type BrowserContext, test as base, chromium } from "@playwright/test";
```

### 採用する方針（重要）

**`package.json` に `"type": "module"` を追加してはいけません。** このリポジトリは `scripts/*.mjs`、
`biome.jsonc`、`vitest.config.ts`、`.storybook/**` など多数のツールが現在の CommonJS 前提で動いており、
`"type": "module"` は build / lint / storybook / vitest すべてに波及します。

代わりに **`import.meta` の使用を e2e から除去**します。パスの起点は次の優先順で選んでください:

1. **`__dirname` が使えるならそれを使う。** Playwright は問題のファイルを CommonJS へトランスパイルしているので、`__dirname` が定義されている可能性が高いです。定義されていれば、パスはファイル位置に固定され、元の `import.meta.dirname` と同じ意味になります。これが最良です。
2. `__dirname` が使えない場合は `process.cwd()` を使う。Playwright は通常 `playwright.config.ts` のあるディレクトリ（＝リポジトリ直下）を cwd として実行されるため実用上は一致しますが、シェルの起動位置に依存する弱い前提です。

**どちらを選んだ場合も、解決したパスに `manifest.json` が実在することを実行時に検証してください**（Step 2 で
具体的に指示します）。`process.cwd()` は誤ったディレクトリを返しても例外を投げず、`playwright test --list` は
fixture の本体を評価しないため、**検証がないと「列挙は通るがパスは間違っている」状態を見逃します**。

### リポジトリの規約

- TypeScript strict mode。`any` と型アサーションの導入は禁止です（`CLAUDE.md`）。
- Node 組み込みモジュールは `node:` プレフィックス付きで import します（既存の `import path from "node:path"` に倣う）。
- フォーマットは Ultracite（Biome）。シングルクォートではなく、既存ファイルの引用符スタイル（ダブルクォート）に合わせ、最後に `pnpm exec ultracite fix` を通します。
- コメントは「コードから読み取れない制約・意図」だけを書きます（`CLAUDE.md`）。cwd 前提は非自明なのでコメントを 1 行残す価値があります。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| e2e 列挙 | `pnpm exec playwright test --list` | exit 0、`Total: N tests in 3 files`（N ≥ 1）、`SyntaxError` が出ない |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Lint | `pnpm run lint` | exit 0 |
| Unit tests | `pnpm run test` | 63 files / 402 tests すべて pass |
| Format | `pnpm exec ultracite fix tests/e2e` | exit 0 |

## Scope

**In scope**（変更してよいファイル）:
- `tests/e2e/setup.ts`
- `tests/e2e/table-sort.spec.ts`

**Out of scope**（関連して見えても触らないこと）:
- `package.json` — 特に `"type": "module"` の追加。build / vitest / storybook を壊します。
- `tsconfig.json`、`vitest.config.ts`、`playwright.config.ts` — この不具合の原因ではありません。
- `tests/e2e/popup.spec.ts` — `import.meta` を使っていません。plan 013 で skip された 2 テストの skip 解除もこのプランの対象外です。
- `.github/workflows/ci.yml` — e2e を CI に追加するかはメンテナ判断です。このプランは「ローカルで列挙・実行できる」までが範囲です。
- e2e テストの内容・アサーションの書き換え。

## Git workflow

- ブランチ: `advisor/015-restore-e2e-enumeration`
- コミットメッセージは Conventional Commits に合わせます（例: 直近の `fix(context-menu): update duplicate menu items in place`）。このプランなら `fix(e2e): resolve extension path without import.meta`。
- 署名やフッターは付けません（`CLAUDE.md` の Git コミット規約）。
- 指示がない限り push / PR 作成はしないでください。

## Steps

### Step 1: 現状の失敗を再現し記録する

```
pnpm exec playwright test --list
```

`SyntaxError: Cannot use 'import.meta' outside a module` と `Total: 0 tests in 0 files` が出ることを確認します。
出ない（既に列挙できる）場合は STOP condition です。

### Step 2: `tests/e2e/setup.ts` の拡張機能パス解決を書き換える（実行時検証つき）

まず `__dirname` が使えるかを確認します。`tests/e2e/setup.ts` の先頭に一時的に
`console.log(typeof __dirname);` を入れて `pnpm exec playwright test --list` を実行し、`string` と出るか
`undefined`（または `ReferenceError`）になるかを見てください。確認後、その `console.log` は削除します。

`__dirname` が使える場合（推奨）:
```ts
import fs from "node:fs";
import path from "node:path";
import { type BrowserContext, test as base, chromium } from "@playwright/test";

// 拡張機能ルート = manifest.json があるリポジトリ直下。
// Playwright は e2e ファイルを CJS へ変換するため import.meta は使えない。
const extensionRoot = path.resolve(__dirname, "../../");

function resolveExtensionRoot(): string {
  const manifestPath = path.join(extensionRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Extension root does not contain manifest.json: ${extensionRoot}`
    );
  }
  return extensionRoot;
}
```

`__dirname` が使えない場合のみ、`path.resolve(__dirname, "../../")` を `process.cwd()` に置き換え、
コメントを「Playwright は playwright.config.ts のあるディレクトリを cwd として実行される」に差し替えて
ください。それ以外の構造は同じです。

fixture 本体は次のようになります:
```ts
  context: async ({}, use) => {
    const pathToExtension = resolveExtensionRoot();
    const context = await chromium.launchPersistentContext("", {
      headless: false,
```

`resolveExtensionRoot()` が投げる例外が、この修正の要点です。パスが間違っていれば e2e の初回実行時に
明確なメッセージで落ちます（黙って別ディレクトリを拡張機能として読み込ませない）。

`biome-ignore` コメントを含む既存行や `launchPersistentContext` の引数は変更しないでください。

**Verify**:
```
grep -n "import.meta" tests/e2e/setup.ts
```
→ 出力なし（exit 1）

```
grep -n "manifest.json" tests/e2e/setup.ts
```
→ 1 件以上マッチ（実行時検証が入っている）

### Step 3: `tests/e2e/table-sort.spec.ts` の fixture パス解決を書き換える

2 箇所（12 行目付近と 66 行目付近）を、Step 2 で選んだ起点に合わせて置き換えます。同じ式が 2 回出るので、
ファイル先頭のトップレベルに定数を 1 つ置き、両方から参照する形にしてください。

`__dirname` が使える場合:
```ts
const TEST_PAGE_URL = `file://${path.resolve(__dirname, "fixtures/test-table.html")}`;
```

`process.cwd()` を使う場合:
```ts
const TEST_PAGE_URL = `file://${path.join(process.cwd(), "tests/e2e/fixtures/test-table.html")}`;
```

どちらの場合も、同じファイルのトップレベルに実在チェックを 1 つ加えてください（起点を取り違えたときに
無言で空白ページを開くのを防ぎます）:
```ts
if (!fs.existsSync(new URL(TEST_PAGE_URL).pathname)) {
  throw new Error(`Missing e2e fixture page: ${TEST_PAGE_URL}`);
}
```
`import fs from "node:fs";` を先頭に追加してください。

テスト本体の `testPagePath` 参照を `TEST_PAGE_URL` に差し替えてください。テストのアサーションは変更しません。

`path` の import が残っていることを確認してください。

**Verify**:
```
grep -rn "import.meta" tests/e2e/
```
→ 出力なし（exit 1）

### Step 4: 列挙が通ることを確認する

```
pnpm exec playwright test --list
```

**Verify**: exit 0、`Total: N tests in 3 files`（N ≥ 1）、`SyntaxError` なし。
`popup.spec.ts` / `table-sort.spec.ts` / `setup.ts` に起因するエラーが出ないこと。

### Step 5: fixture ファイルが実際に存在することを確認する

```
ls tests/e2e/fixtures/
```

**Verify**: `test-table.html` が存在する。存在しない場合は STOP condition（パスの前提が誤っている）。

### Step 6: format / lint / typecheck / unit test を通す

```
pnpm exec ultracite fix tests/e2e
pnpm run lint
pnpm run typecheck
pnpm run test
```

**Verify**: すべて exit 0。unit test は 402 tests pass（数が変わっている場合は Step 1 時点の値と一致すること）。

### Step 7: e2e の実際の実行を 1 度試す（ベストエフォート）

```
pnpm exec playwright test --project=chromium
```

このステップは**成否がこのプランの完了条件ではありません**。Chrome 拡張の e2e は `headless: false` で
実ブラウザを起動するため、ヘッドレス環境では起動自体ができないことがあります。また `dist/` が未ビルドだと
拡張がロードできません。事前に `pnpm run build` を実行してから試してください。

**Verify**: 実行結果（pass / fail / 起動不能）を**そのまま報告**してください。失敗した場合はその出力を報告し、
テストの中身を修正しようとしないでください（それは follow-up の範囲です）。

## Test plan

新規テストは書きません。このプランは既存 e2e スイートの実行基盤の修復です。

検証は次の 2 点です:
1. `pnpm exec playwright test --list` が exit 0 で 3 ファイル分のテストを列挙する（Step 4）。
2. `pnpm run test` / `pnpm run lint` / `pnpm run typecheck` が既存どおり通る（Step 6）。回帰がないことの確認。

## Done criteria

すべて満たすこと:

- [ ] `grep -rn "import.meta" tests/e2e/` が何もマッチしない
- [ ] `pnpm exec playwright test --list` が exit 0、`Total: 0 tests in 0 files` ではない、`SyntaxError` を出さない
- [ ] `tests/e2e/setup.ts` が解決後のパスに `manifest.json` が存在することを実行時に検証し、無ければ明示的に throw する（`--list` は fixture 本体を評価しないため、この検証がないとパス誤りを見逃します）
- [ ] `tests/e2e/table-sort.spec.ts` が fixture HTML の実在をトップレベルで検証する
- [ ] 一時的に入れた `console.log(typeof __dirname)` を削除済み
- [ ] `pnpm run typecheck` が exit 0
- [ ] `pnpm run lint` が exit 0
- [ ] `pnpm run test` が exit 0（402 tests pass）
- [ ] `git status` で `tests/e2e/setup.ts` と `tests/e2e/table-sort.spec.ts` 以外が変更されていない
- [ ] `package.json` が変更されていない（`git diff --stat -- package.json` が空）
- [ ] Step 7 の実行結果を報告済み（成功していなくてもよい）
- [ ] `plans/README.md` の 015 の Status を更新済み

## STOP conditions

以下に該当したら停止して報告してください:

- Step 1 で `SyntaxError` が再現しない（＝既に別の変更で解決済み、または前提が違う）。
- Step 5 で `tests/e2e/fixtures/test-table.html` が存在しない。
- 列挙を通すために `package.json` / `tsconfig.json` / `playwright.config.ts` を変更する必要があるように見える。
- `process.cwd()` に置き換えても `import.meta` 以外の理由で列挙が失敗する（別のエラーメッセージが出る）。
- Step 6 の検証が、合理的な修正を 1 度試した後もなお失敗する。
- `pnpm run test` の pass 数が Step 1 時点から減っている。

## Maintenance notes

将来この周辺を触る人向け:

- **`"type": "module"` を将来入れる場合**、ここで導入したパス解決は `import.meta.dirname` に戻せます。ただし戻す必要はありません。
- **`process.cwd()` を採用した場合**、それは「Playwright をリポジトリ直下から起動する」ことに依存します。将来 `playwright.config.ts` をサブディレクトリへ移動する場合や、別ディレクトリから `playwright` を起動する運用を入れる場合は、この箇所を再確認してください。`__dirname` を採用できていればこの依存はありません。
- **`--list` が通ることは「パスが正しいこと」を意味しません。** Playwright はテストの列挙時に fixture の本体を評価しません。だからこそ実行時の `manifest.json` 実在チェックを入れています。このチェックを「冗長だから」と削除しないでください。
- **レビューで注視すべき点**: `pathToExtension` が `dist/` ではなくリポジトリ直下を指していること（`manifest.json` があるのはリポジトリ直下。`README.md:125` にもその旨の記述あり）。
- **意図的に先送りした follow-up**: (a) e2e を CI に載せるか（現在 `.github/workflows/ci.yml` は lint/test/build のみ、storybook は merge_group / workflow_dispatch 限定）、(b) plan 013 で `test.skip` された 2 テストを現行 URL パターンモデル向けに書き直すこと。どちらもインタラクティブな検証が必要なため、このプランには含めていません。
