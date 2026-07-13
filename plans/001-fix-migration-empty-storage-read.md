# Plan 001: Migration バックアップ/リストアを実 Chrome の storage API で正しく動作させる

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8ec023e..HEAD -- src/storage/migrations.ts src/background/storage.ts tests/storage.migrations.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- Priority: P1
- Effort: S
- Risk: LOW
- Depends on: none
- Category: bug (+ tests)
- Planned at: commit `8ec023e`, 2026-07-12

## Why this matters

Chrome の `chrome.storage.{sync,local}.get(keys, cb)` は、**空配列 `[]` を渡すと空オブジェクト `{}` を返す**（全件取得は `null` を渡す必要がある — 公式 API 仕様）。現在のコードは「全件取得」のつもりで `[]` を渡しているため、migration 前バックアップは常に空スナップショットになり、`listBackups` / `cleanOldBackups` は何も見えず、`restoreFromBackup` は「現在のデータ = 空」と誤認したうえで空バックアップを適用し、**リストア実行時に search engines・AI 設定・カスタムプロンプト等の非予約キーを全削除しうる**。テストは Chrome と異なる挙動のモック（`[]` を全件取得として扱う）で通っており、この欠陥を覆い隠している。本プランでモックを実挙動に合わせて欠陥を赤くし、本体を修正する。

## Current state

- `src/storage/migrations.ts` — migration ランナーとバックアップ/リストア。全件取得のつもりの `[]` 読みが 6 箇所:
  - `backupBeforeMigration` (273-274行):
    ```ts
    const syncData = await storageSyncGet([]);
    const localData = await storageLocalGet([]);
    ```
  - `cleanOldBackups` (300行): `const allData = await storageLocalGet([]);`
  - `listBackups` (320行): `const allData = await storageLocalGet([]);`
  - `restoreFromBackup` (347-354行): `storageSyncGet([])` / `storageLocalGet([])` で「現在データ」を取得し、バックアップに無いキーを削除対象にする。
- `src/background/storage.ts` — Promise ラッパー。キーをそのまま Chrome API へ渡す:
  - `storageSyncGet` (223-270行): 型は `createStorageWrapper<[string[]], unknown>`。取得後、`STORAGE_RESERVED_KEYS.FALLBACK_KEYS_MARKER` を見て fallback キーを local から補完 merge する。248行に `const keysInLocal = keys.filter((key) => fallbackKeySet.has(key));` があり、**`null` を渡すとここが落ちる**ので分岐が必要。
  - `storageLocalGet` (337-348行): 型は `createStorageWrapper<[string[]], unknown>`、`chrome.storage.local.get(keys, ...)` へ素通し。
- `tests/storage.migrations.test.ts` — Chrome モック (17-90行あたり)。`sync.get` / `local.get` とも `keys.length === 0 || keys[0] === null || keys[0] === undefined` を「全件取得」として同一扱いしており、実 Chrome（`[]` → `{}`）と矛盾する。
- 規約: TypeScript strict、`any` 禁止。エラーは `@praha/byethrow` の Result パターン（ただし migrations.ts は throw ベースの既存スタイル — 既存に合わせる）。フォーマットは Ultracite（Biome）。

## Commands you will need

| Purpose   | Command                                                   | Expected on success |
| --------- | --------------------------------------------------------- | ------------------- |
| Install   | `pnpm install`                                            | exit 0              |
| Typecheck | `pnpm typecheck`                                          | exit 0, no errors   |
| Tests     | `pnpm test:unit:node -- tests/storage.migrations.test.ts` | all pass            |
| All tests | `pnpm test`                                               | all pass            |
| Lint      | `pnpm lint`                                               | exit 0              |
| Format    | `pnpm format`                                             | exit 0              |

## Scope

#### In scope (the only files you should modify)

- `src/storage/migrations.ts`
- `src/background/storage.ts`
- `tests/storage.migrations.test.ts`

#### Out of scope (do NOT touch, even though they look related)

- `storageSyncGet` / `storageLocalGet` の**他の呼び出し元**（`rg -n "storageSyncGet\(|storageLocalGet\(" src/` で見えるもの）— 具体的なキー配列を渡しており挙動は正しい。シグネチャ変更は後方互換（union 型追加）にとどめ、既存呼び出しを書き換えない。
- `src/background/storage.ts` の fallback-marker ロジック自体の再設計。
- migration の各ステップ定義やスキーマバージョン管理。

## Git workflow

- Branch: `advisor/001-fix-migration-backup-empty-read`
- Conventional Commits（例: `fix(storage): read all keys with null instead of empty array`、リポジトリの `git log --oneline` スタイルに一致）
- push / PR は指示がない限り行わない。

## Steps

### Step 1: テストモックを実 Chrome 挙動に合わせる（欠陥を赤くする）

`tests/storage.migrations.test.ts` の `sync.get` / `local.get` モックを修正する: 「全件取得」は **`keys === null || keys === undefined` のときのみ**。`Array.isArray(keys) && keys.length === 0` は空オブジェクト `{}` を返す。さらに、`local.get` に対し「`[]` を渡すと `{}` が返る」ことを直接主張する回帰テストを 1 本追加する。

Verify: `pnpm test:unit:node -- tests/storage.migrations.test.ts` → **backup/restore 系のテストが失敗する**（欠陥が露出した状態。失敗しない場合は STOP）。

### Step 2: ラッパーが `null`（全件取得）を受け付けるようにする

`src/background/storage.ts`:

- `storageLocalGet` の型を `createStorageWrapper<[string[] | null], unknown>` にし、`keys` をそのまま `chrome.storage.local.get(keys, ...)` へ渡す（Chrome API は `null` で全件を返す）。
- `storageSyncGet` も同様に `[string[] | null]` へ変更。248行付近の fallback merge を分岐:
  ```ts
  const keysInLocal =
    keys === null
      ? fallbackKeys
      : keys.filter((key) => fallbackKeySet.has(key));
  ```
  （`keys === null` のとき、sync へ fallback 退避された全キーを local から補完する — 既存意図の自然な拡張。）

Verify: `pnpm typecheck` → exit 0。

### Step 3: migrations.ts の 6 箇所を `null` に変更

`src/storage/migrations.ts` の `storageSyncGet([])` / `storageLocalGet([])`（273, 274, 300, 320, 347, 351行付近）をすべて `storageSyncGet(null)` / `storageLocalGet(null)` に変更する。

Verify: `rg -n "storage(Sync|Local)Get\(\[\]\)" src/storage/migrations.ts` → マッチ 0 件。

### Step 4: テスト全緑を確認

Verify: `pnpm test:unit:node -- tests/storage.migrations.test.ts` → all pass（Step 1 で追加した回帰テスト含む）。続けて `pnpm test` → all pass。

### Step 5: フォーマットと lint

Verify: `pnpm format && pnpm lint` → exit 0。

## Test plan

- 修正するモック: `tests/storage.migrations.test.ts` の `setupChromeMocks`（全件取得の条件を `null`/`undefined` のみへ）。
- 追加テスト（同ファイル、既存の `describe` スタイルに倣う）:
  1. `chrome.storage.local.get([])`（モック経由）が `{}` を返すことの回帰テスト。
  2. `backupBeforeMigration` 後のバックアップに、事前に投入した sync/local データが実際に含まれること（空スナップショットでないこと）。
  3. `restoreFromBackup` が、バックアップに存在するキーを復元し、バックアップ後に追加されたキーだけを削除すること（全消しにならないこと）。
- Verification: `pnpm test:unit:node -- tests/storage.migrations.test.ts` → all pass。

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0（新規テスト 3 本を含む）
- [ ] `rg -n "storage(Sync|Local)Get\(\[\]\)" src/` → マッチ 0 件
- [ ] モックの「全件取得」条件に `keys.length === 0` が含まれない（`rg -n "length === 0" tests/storage.migrations.test.ts` → backup 関連のモック分岐にマッチしない）
- [ ] `git status` で in-scope 3 ファイル以外に変更なし
- [ ] `plans/README.md` の status 行を更新

## STOP conditions

- Drift check で in-scope ファイルの差分があり、"Current state" の抜粋と実コードが一致しない。
- Step 1 でモックを直しても backup/restore テストが**失敗しない**（欠陥の前提が崩れている — 再調査が必要）。
- `storageSyncGet` の `null` 対応が fallback-marker ロジックの他の分岐（`clearFallbackStateForKeys` 等）に波及する必要が出た場合。
- 修正で out-of-scope ファイル（他の呼び出し元）を触る必要が出た場合。

## Maintenance notes

- 今後 `storageSyncGet` / `storageLocalGet` に「全件取得」用途が増える場合は必ず `null` を使うこと。レビューでは `get([])` の再発を見ること（lint ルール化は今回のスコープ外として見送り）。
- 既にユーザー環境に保存済みの「空バックアップ」（`backup_` プレフィックスのキー）は無害だが中身が空。クリーンアップは意図的にスコープ外（`cleanOldBackups` が世代交代で自然に押し出す）。
