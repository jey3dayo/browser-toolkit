# Plan 019: version の二重管理を解消し、content script の preload listener を idempotent に戻す

> **Executor instructions**: この計画を上から順に実行してください。独立した 2 つの小さな修正（Part A / Part B）
> から成ります。各ステップの検証コマンドを必ず実行し、期待結果を確認してから次に進んでください。
> 「STOP conditions」に該当したら、勝手に工夫せず停止して報告してください。完了したら `plans/README.md` の
> 当該行の Status を更新してください（レビュアーが index を管理すると明示された場合は不要）。
>
> **Drift check (最初に実行)**:
> `git diff --stat 9c49e9b..HEAD -- manifest.json package.json src/content.ts`
> 差分があれば、下記「Current state」の抜粋と実コードを比較し、一致しない場合は STOP condition として扱って
> ください。

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9c49e9b`, 2026-08-10

## Why this matters

独立した衛生上の欠陥が 2 つあります。どちらも小さいですが、放置すると誤解を生みます。

**Part A — version が 2 箇所で食い違っている。** `manifest.json` は `"version": "0.2.2"`、`package.json` は
`"version": "1.0.2"` です。Chrome 拡張として実際に出荷されるのは `manifest.json` の値だけで、`package.json`
の `version` はどのビルドスクリプトにも CI にも読まれていません（`scripts/*.mjs` と `.github/` を確認済み）。
つまり片方は「意味のない、しかし本物に見える数字」で、リリース時に取り違える余地があります。同期する仕組みも
食い違いを検出する仕組みもありません。

**Part B — plan 009 で追加した preload listener が idempotency ガードの外に置かれている。** `src/content.ts`
は同一ページに複数回注入されうるため `globalState.initialized` による冪等ガードを持っています。しかし
`pointerdown` リスナの登録がそのガードの**手前**にあり、注入ごとに新しい関数参照のリスナが増えます。
`{ once: true }` は同じリスナを 1 回に制限しますが、毎回別の関数オブジェクトが渡されるため重複登録を防げません。
plan 009 の変更で「2回目以降の初期化では副作用を追加しない（idempotent）」というコメントが削除されており、
不変条件が文書からも消えています。

実害は現状小さい（重複リスナはすでにキャッシュ済みの動的 import を再度呼ぶだけ）ですが、これは
「content script は再注入に対して副作用を増やさない」という設計上の不変条件の破れであり、後から別の副作用が
同じ位置に追加されたときに実バグになります。

## Current state

### Part A — version

`manifest.json:1-5`:
```json
{
  "manifest_version": 3,
  "name": "Browser Toolkit",
  "version": "0.2.2",
  "description": "個人用のブラウザユーティリティ集（テーブルソート、AI連携など）",
```

`package.json:1-5`:
```json
{
  "name": "browser-toolkit",
  "version": "1.0.2",
  "description": "個人用のツールキット Chrome拡張機能（テーブルソート、AI連携など）",
  "main": "dist/background.js",
```

確認済みの事実:
- `scripts/bundle.mjs`、`scripts/copy-styles.mjs`、`scripts/clean.mjs`、`scripts/dev-server.mjs` はいずれも `version` を読みません。
- `.github/workflows/ci.yml` と `.github/actions/setup-node-env/action.yml` が `package.json` を参照するのは `engines.node` と `packageManager` だけです。
- `src/**` は `package.json` の `version` を import していません。
- `README.md` と `docs/e2e-test-checklist.md` は「manifest.json の version を確認する」と書いており、`manifest.json` 側を出荷バージョンとして扱っています。
- `manifest.json` の version を最後に触ったのは `1786117 chore: bump version` です。

**採用する方針**: `manifest.json` を出荷バージョンの単一の正本とし、`package.json` の `version` をそれに
**合わせます**（`1.0.2` → `0.2.2`）。理由は、`manifest.json` を `1.0.2` に上げると「変更がないのに出荷
バージョンが上がる」ことになり、拡張の更新扱いが変わるためです。`package.json` の `version` は誰も読んで
いないので、下げても何も壊れません。

### Part B — preload listener

`src/content.ts:95-121`（現在のコード。前後の文脈を含む）:
```ts
  // overlay/toastのpreloadは最初のユーザー操作をトリガーに行う（HTMLドキュメントのみ）
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

  if (globalState.initialized) {
    return;
  }
  globalState.initialized = true;
  themeManager.refreshThemeFromStorage().catch(() => {
    // no-op
  });
  themeManager.setupStorageListener();
```

冪等ガードが依存している共有状態（同ファイル `src/content.ts:55-61`）:
```ts
    globalContainer.__MBU_CONTENT_STATE__ = {
      initialized: false,
      overlayMount: null,
      toastMount: null,
    };
  }
  const globalState = globalContainer.__MBU_CONTENT_STATE__;
```

plan 009 が削除した元のコメント（`git show ca644a6` で確認できます）:
```
  // 2回目以降の初期化では副作用を追加しない（idempotent）
```

**採用する方針**: リスナ登録を `if (globalState.initialized) return;` の**後ろ**へ移動します。関数定義は
巻き上げ（hoisting）されるので宣言位置は変えなくても動きますが、読みやすさのため関数定義もガードの後ろへ
まとめて移動してください。あわせて、削除された不変条件のコメントを（現在の実装に即した形で）復活させます。

なお `preloadInteractiveModules` 内の `if (!supportsHtmlDocument) return;` は冗長になりますが、**残して
ください**（関数単体の安全性を保つガードで、削除は挙動を変えないが防御を減らします）。

### リポジトリの規約

- TypeScript strict mode。`any` と型アサーションの導入は禁止（`CLAUDE.md`）。
- コメントは「コードだけでは読み取れない非自明な制約・判断理由・意図」のみを書きます（`CLAUDE.md`）。冪等性の不変条件はまさにこれに該当します。
- content script は「ページの DOM 操作、オーバーレイ表示、テーブルソート」を担い、background とは独立した実行環境です（`docs/architecture.md`）。
- フォーマットは Ultracite（Biome）。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Unit tests | `pnpm run test` | 63 files / 402 tests pass |
| content 関連テスト | `pnpm exec vitest run --project=dom` | すべて pass |
| Lint | `pnpm run lint` | exit 0 |
| Format | `pnpm exec ultracite fix src/content.ts` | exit 0 |
| JSON format | `pnpm exec ultracite fix manifest.json package.json` | exit 0 |
| Build | `pnpm run build` | exit 0 |
| Full gate | `mise run ci` | `✅ RTK CI checks completed` |

## Scope

**In scope**（変更してよいファイル）:
- `package.json`（`version` フィールドのみ）
- `src/content.ts`（preload listener の登録位置とコメントのみ）
- `tests/` に新規テストファイル 1 つ（Part A の同期を固定するテスト）

**Out of scope**（関連して見えても触らないこと）:
- **`manifest.json`** — version を上げないでください。他のフィールド（`permissions`、`host_permissions`、`content_security_policy` 等）も一切変更しません。権限の変更は `CLAUDE.md` の「Release / Permission Review」に従う別作業です。
- `package.json` の `version` 以外のフィールド（`scripts`、`dependencies`、`engines`、`packageManager` など）。
- `scripts/**` — version を自動同期するスクリプトを新設しないでください（Part A のゴールは「食い違いの解消と検出」であり、自動化ではありません）。
- `src/content.ts` の他のロジック — `themeManager`、`createLazyLoader`、テーブルソート、message handler、`__MBU_CONTENT_STATE__` の形。
- `preloadInteractiveModules` が preload するモジュールの内訳（`loadNotificationModule` / `loadOverlayModule`）と、`{ once: true, passive: true }` オプション。
- plan 009 の Group B（content 専用 icon 分割）— `plans/README.md` で REJECTED 済みです。

## Git workflow

- ブランチ: `advisor/019-version-sync-and-preload-idempotency`
- Part A と Part B は独立なので、コミットを 2 つに分けてください:
  - `chore: align package.json version with shipped manifest version`
  - `fix(content): register preload listener behind the idempotency guard`
- 署名やフッターは付けません。
- 指示がない限り push / PR 作成はしないでください。

## Steps

### Step 1: ベースラインを取る

```
pnpm run test
```

**Verify**: exit 0。pass 数（402 tests / 63 files が期待値）をメモしてください。

---

## Part A — version の同期

### Step 2: version が本当にどこからも読まれていないことを確認する

```
grep -rn "\"version\"" manifest.json package.json
grep -rn "version" scripts/
grep -rn "pkg.version\|package.json" src/
```

**Verify**: `manifest.json` が `0.2.2`、`package.json` が `1.0.2`。`scripts/` と `src/` のいずれからも
`package.json` の `version` を読む箇所が**見つからない**こと。

読んでいる箇所が見つかった場合は STOP condition です（version を下げると壊れる可能性があるため、方針の
再検討が必要になります）。

### Step 3: `package.json` の version を manifest に合わせる

`package.json` の 3 行目を変更します:

```json
  "version": "0.2.2",
```

**`manifest.json` は変更しません。** 他のフィールドも変更しません。

**Verify**:
```
grep -n "\"version\"" manifest.json package.json
```
→ 両方が `0.2.2` を示すこと。

### Step 4: 食い違いを検出するテストを追加する

新規ファイル `tests/manifest.version_sync.test.ts` を作成します。既存の node プロジェクト向けテストの
書き方に倣ってください（`tests/ui.shared_primitives.test.ts` が `node:fs` でリポジトリのファイルを読む
良い手本です — `import.meta.dirname` のフォールバック処理を含む先頭部分をそのまま参考にできます）。

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname =
  typeof import.meta.dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;
const projectRoot = path.join(dirname, "..");

function readJsonVersion(relativePath: string): unknown {
  const raw = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  return (JSON.parse(raw) as { version?: unknown }).version;
}

describe("extension version", () => {
  // manifest.json が出荷バージョンの正本。package.json の version は
  // どのビルド経路にも読まれないため、放置すると静かに食い違う。
  it("keeps package.json in sync with the shipped manifest version", () => {
    expect(readJsonVersion("package.json")).toBe(
      readJsonVersion("manifest.json")
    );
  });
});
```

型アサーション（`as`）は `JSON.parse` の戻り値を扱うために 1 箇所だけ使っています。`CLAUDE.md` は
`any` と型アサーションの導入を禁じているため、**lint がこれを拒否する場合は** `valibot` で
`safeParse(object({ version: string() }), JSON.parse(raw))` を使う形に書き換えてください（`valibot` は
既に依存にあります）。`any` は使わないでください。

**Verify**:
```
pnpm exec vitest run --project=node tests/manifest.version_sync.test.ts
```
→ **`Test Files 1 passed (1)` と `Tests 1 passed (1)` の両方が出力されること。**
`no test files found` や `Tests 0 passed` は失敗として扱ってください（vitest の `node` プロジェクトは
`tests/**/*.test.ts` を include するのでこのファイル名はマッチしますが、収集 0 件を pass と読み違えるのが
この種のテスト追加でいちばん多い事故です）。

さらに、このテストが**本当に検出できる**ことを確認します: 一時的に `package.json` の version を
`"0.2.3"` に変えてテストを実行し、**失敗すること**を確認してから `0.2.2` に戻してください。

**Verify**: 意図的な不一致でテストが fail し、戻すと pass すること。

### Step 5: Part A をコミットする

```
pnpm exec ultracite fix package.json tests/manifest.version_sync.test.ts
pnpm run lint
pnpm run typecheck
pnpm exec vitest run --project=node
git add package.json tests/manifest.version_sync.test.ts
git commit -m "chore: align package.json version with shipped manifest version"
```

**Verify**: すべて exit 0。

---

## Part B — preload listener の冪等化

### Step 6: 現在の登録位置を確認する

```
grep -n "pointerdown\|globalState.initialized" src/content.ts
```

**Verify**: `pointerdown` の `addEventListener` 行が `if (globalState.initialized) {` の行より
**小さい行番号**にあること（＝ガードの手前にある）。既に後ろにあるなら STOP condition です（別の変更で
解決済み）。

### Step 7: リスナ登録をガードの後ろへ移動する

`src/content.ts` の該当ブロックを次の形に組み替えます。`preloadInteractiveModules` の関数定義と
`if (supportsHtmlDocument) { document.addEventListener(...) }` のブロックを、両方とも
`globalState.initialized = true;` の**後ろ**へ移動してください:

```ts
  if (globalState.initialized) {
    return;
  }
  globalState.initialized = true;

  // ここから下は content script の再注入時に実行されない。
  // 再注入ごとにリスナやタイマーを増やさないため、副作用の登録はすべてこの
  // ガードより後ろに置く（plan 009 の preload gating を含む）。

  // overlay/toastのpreloadは最初のユーザー操作をトリガーに行う（HTMLドキュメントのみ）
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

  themeManager.refreshThemeFromStorage().catch(() => {
    // no-op
  });
  themeManager.setupStorageListener();
```

注意点:
- `themeManager.refreshThemeFromStorage()` と `themeManager.setupStorageListener()` の**呼び出し順は変えないでください**。
- `preloadInteractiveModules` の中身（`supportsHtmlDocument` ガード、2 つの `loadXxxModule().catch()`）は変更しません。
- `addEventListener` のオプション `{ once: true, passive: true }` は変更しません。
- Biome が関数宣言の位置について警告する場合は、`const preloadInteractiveModules = (): void => { ... }` の形（アロー関数の const 束縛）に変えて構いません。挙動は同じです。

**Verify**:
```
grep -n "pointerdown\|globalState.initialized = true" src/content.ts
```
→ `pointerdown` の行番号が `globalState.initialized = true` の行番号より**大きい**こと。

### Step 8: typecheck / lint / test を通す

```
pnpm exec ultracite fix src/content.ts
pnpm run lint
pnpm run typecheck
pnpm run test
```

**Verify**: すべて exit 0。`pnpm run test` の pass 数 = Step 1 の記録 + 1（Part A の新規テスト分）。
既存の content 系テスト（`tests/content.table_sort_a11y.dom.test.ts` など）が 1 つも fail していないこと。

### Step 9: build を通し、bundle が壊れていないことを確認する

```
pnpm run build
```

**Verify**: exit 0。`dist/content.js` が生成されること（`ls -la dist/content.js`）。

### Step 10: full gate を通してコミットする

```
mise run ci
git add src/content.ts
git commit -m "fix(content): register preload listener behind the idempotency guard"
```

**Verify**: `✅ RTK CI checks completed` で終了、exit 0。

`mise` が使えない環境なら:
```
pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run test:storybook && pnpm run build
```

### Step 11: 手動確認の可否を報告する（実施は任意）

content script の再注入時の挙動は自動テストで直接検証できていません（`src/content.ts` は IIFE で、
テストからは `__MBU_TEST_HOOKS__` 経由の一部関数しか触れません）。

Chrome で手動確認できる環境があれば、次を試して結果を報告してください:
1. `pnpm run build` 後、`chrome://extensions/` からリポジトリ直下を「パッケージ化されていない拡張機能」として読み込む。
2. 任意のページを開き、DevTools Console で `getEventListeners(document).pointerdown?.length` を確認する。
3. popup の focus-override などから content script が再注入される操作を行い、再度 2 を確認する。
4. リスナ数が増えないことを確認する。

**この手動確認はこのプランの完了条件ではありません。** 実施できない場合は「未実施」と報告してください。
実施して問題が見つかった場合は、修正せず報告してください。

## Test plan

- **新規テスト（Part A）**: `tests/manifest.version_sync.test.ts` に 1 件。`manifest.json` と `package.json` の `version` が一致することを検証します。これは食い違いの再発防止そのものです。
  - 構造の手本: `tests/ui.shared_primitives.test.ts`（`node:fs` でリポジトリのファイルを読み、境界不変条件をアサートするパターン）。
  - Step 4 で「わざと壊して fail することを確認する」手順を含めています。通らないテストを追加してしまう事故を防ぐためです。
- **Part B のテスト**: 新規テストは書きません。content script は IIFE として即時実行され、再注入をテストから再現するには `__MBU_CONTENT_STATE__` と `document` を含む実行環境の作り直しが必要で、テスト用の足場を新設する規模の作業になります。このプランの効果は既存の DOM テスト群による回帰なしの確認（Step 8）と、任意の手動確認（Step 11）で担保します。
- **既存テストの扱い**: 変更しません。1 つでも fail したら STOP condition です。
- **検証**: `pnpm run test` → 全 pass、pass 数 = Step 1 +1、skip 0。

## Done criteria

すべて満たすこと:

- [ ] `manifest.json` と `package.json` の `version` がどちらも `0.2.2`
- [ ] `git diff -- manifest.json` が空（manifest を一切変更していない）
- [ ] `git diff -- package.json` の変更が `version` の 1 行のみ
- [ ] `tests/manifest.version_sync.test.ts` が存在し pass する
- [ ] Step 4 の「わざと壊すと fail する」確認を実施済み
- [ ] `src/content.ts` で `pointerdown` の `addEventListener` が `globalState.initialized = true` より後ろにある
- [ ] `src/content.ts` に冪等性の不変条件を説明するコメントが存在する
- [ ] `pnpm run typecheck` が exit 0
- [ ] `pnpm run lint` が exit 0
- [ ] `pnpm run test` が exit 0、pass 数 = Step 1 の記録 + 1、skip 0
- [ ] `pnpm run build` が exit 0、`dist/content.js` が生成されている
- [ ] `mise run ci` が `✅ RTK CI checks completed` で終了（または同等の個別コマンドがすべて exit 0）
- [ ] `git status` で In scope 以外のファイルが変更されていない
- [ ] コミットが 2 つに分かれている（Part A / Part B）
- [ ] Step 11 の実施可否を報告済み
- [ ] `plans/README.md` の 019 の Status を更新済み

## STOP conditions

以下に該当したら停止して報告してください:

- Step 2 で `package.json` の `version` を読んでいる箇所が見つかった（下げると壊れる可能性があるため、方針の再検討が必要）。
- Step 4 で、意図的に不一致にしてもテストが pass する（テストが実際には何も検証していない）。
- Step 6 で `pointerdown` の登録が既にガードの後ろにある。
- Part B の移動後に既存の content 系テストが fail する。
- 通すために `manifest.json` を変更する必要があるように見える。
- 通すために `src/content.ts` の `themeManager` 関連や `__MBU_CONTENT_STATE__` の形を変える必要があるように見える。
- version の同期のために `scripts/` に新しい自動化スクリプトを書きたくなった（Out of scope です。必要だと判断した理由を報告して停止してください）。
- ステップの検証が、合理的な修正を 1 度試した後もなお失敗する。

## Maintenance notes

将来この周辺を触る人向け:

- **リリース時にバージョンを上げる手順**: `manifest.json` の `version` を上げ、`package.json` の `version` を同じ値に合わせます。`tests/manifest.version_sync.test.ts` が片方だけの更新を検出します。`manifest.json` が出荷バージョンの正本であることを忘れないでください。
- **Chrome Web Store へ配布する場合**、`manifest.json` の version は単調増加でなければなりません。`0.2.2` から始まっている点に注意してください（`package.json` の `1.0.2` は出荷履歴を意味しません）。
- **`src/content.ts` に新しい副作用（イベントリスナ、タイマー、MutationObserver、storage listener など）を追加するときは、必ず `if (globalState.initialized) return;` より後ろに置いてください。** 手前に置くと再注入ごとに副作用が積み上がります。今回コメントを残したのはこの不変条件を明文化するためです。
- **レビューで注視すべき点**: (a) `manifest.json` が無変更であること、(b) `src/content.ts` の diff が「ブロックの移動 + コメント追加」だけで、ロジックの書き換えを含まないこと（`git diff` を目で追って確認できる規模です）、(c) `themeManager` の 2 つの呼び出しの順序が保たれていること。
- **意図的に先送りした follow-up**:
  1. content script の再注入シナリオを自動テストで直接検証すること。現在 `src/content.ts` は IIFE で、テストは `__MBU_TEST_HOOKS__` 経由の一部関数にしか到達できません。テスト可能にするには初期化処理を export された関数へ切り出すリファクタが必要で、それは挙動変更のリスクを伴う別作業です。
  2. version 同期の自動化（`manifest.json` から `package.json` を生成する等）。現在は 2 箇所を手で揃え、テストで検出する方式にとどめています。リリース頻度が上がったら再検討してください。
