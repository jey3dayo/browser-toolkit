# Plan 016: 期限切れの `minimumReleaseAgeExclude` エントリを全削除して supply-chain gate を復活させる

> **Executor instructions**: この計画を上から順に実行してください。各ステップの検証コマンドを必ず実行し、
> 期待結果を確認してから次に進んでください。「STOP conditions」に該当したら、勝手に工夫せず停止して報告して
> ください。完了したら `plans/README.md` の当該行の Status を更新してください（レビュアーが index を管理する
> と明示された場合は不要）。
>
> **Drift check (最初に実行)**: `git diff --stat 9c49e9b..HEAD -- pnpm-workspace.yaml package.json pnpm-lock.yaml`
> 差分があれば、下記「Current state」の抜粋と実ファイルを比較し、一致しない場合は STOP condition として扱って
> ください。

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies
- **Planned at**: commit `9c49e9b`, 2026-08-10

## Why this matters

`pnpm-workspace.yaml` は `minimumReleaseAge: 10080`（= 7 日）を設定し、公開直後のパッケージを install しない
supply-chain 対策を敷いています。しかし `minimumReleaseAgeExclude` に **34 エントリ**が積まれており、これらは
すべて「当時 soak 期間を待てなかったので一時的に除外した」ものです。

2026-08-10 現在、除外対象のバージョンはすべて公開から 1 か月以上経過しており、**除外は 1 つも機能上必要ありません**:

| 除外エントリ | 公開日 | soak 明け |
|---|---|---|
| `typescript@7.0.2` + `@typescript/typescript-*@7.0.2`（20 件） | 2026-07-08 | 2026-07-15 |
| `react@19.2.7` / `react-dom@19.2.7` | 2026-06-01 | 2026-06-08 |
| `@types/react@19.2.16` | 2026-06-01 | 2026-06-08 |
| `storybook@10.4.2` および `@storybook/*@10.4.2`（9 件） | 2026-06-02 | 2026-06-09 |

さらに Storybook 系の除外は**バージョン自体が古い**（現在 install されているのは `storybook@10.4.6`）ため、
すでに何にもマッチしていない死んだエントリです。

放置するコストは具体的です。`plans/README.md` の plan 014 の記録どおり、この除外方式は「version-pin して
将来の版には soak を維持する」設計です。つまり除外を消さないと、リストが単調増加し、次に誰かが
「typescript のバージョンを上げる」ときに 21 エントリを機械的に書き換える負債が発生します。全削除すれば
`minimumReleaseAge` gate が全依存に対して素直に効く状態へ戻ります。

## Current state

対象ファイルは `pnpm-workspace.yaml` の 1 ファイルだけです。

`pnpm-workspace.yaml`（全文。これが現在の中身です）:
```yaml
allowBuilds:
  "@swc/core": false
  esbuild: true
  lefthook: true
  unrs-resolver: true
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - "@types/react@19.2.16"
  - react-dom@19.2.7
  - react@19.2.7
  - "@storybook/addon-a11y@10.4.2"
  - "@storybook/addon-docs@10.4.2"
  - "@storybook/addon-vitest@10.4.2"
  - "@storybook/builder-vite@10.4.2"
  - "@storybook/csf-plugin@10.4.2"
  - "@storybook/react-dom-shim@10.4.2"
  - "@storybook/react-vite@10.4.2"
  - "@storybook/react@10.4.2"
  - storybook@10.4.2
  - typescript@7.0.2
  - "@typescript/typescript-aix-ppc64@7.0.2"
  - "@typescript/typescript-darwin-arm64@7.0.2"
  - "@typescript/typescript-darwin-x64@7.0.2"
  - "@typescript/typescript-freebsd-arm64@7.0.2"
  - "@typescript/typescript-freebsd-x64@7.0.2"
  - "@typescript/typescript-linux-arm@7.0.2"
  - "@typescript/typescript-linux-arm64@7.0.2"
  - "@typescript/typescript-linux-loong64@7.0.2"
  - "@typescript/typescript-linux-mips64el@7.0.2"
  - "@typescript/typescript-linux-ppc64@7.0.2"
  - "@typescript/typescript-linux-riscv64@7.0.2"
  - "@typescript/typescript-linux-s390x@7.0.2"
  - "@typescript/typescript-linux-x64@7.0.2"
  - "@typescript/typescript-netbsd-arm64@7.0.2"
  - "@typescript/typescript-netbsd-x64@7.0.2"
  - "@typescript/typescript-openbsd-arm64@7.0.2"
  - "@typescript/typescript-openbsd-x64@7.0.2"
  - "@typescript/typescript-sunos-x64@7.0.2"
  - "@typescript/typescript-win32-arm64@7.0.2"
  - "@typescript/typescript-win32-x64@7.0.2"
trustPolicy: no-downgrade
trustPolicyExclude:
  - semver@6.3.1
```

関連する事実:
- `package.json` の該当依存: `typescript: "^7.0.2"`、`react: "^19.2.7"`、`storybook: "^10.4.6"`、`@types/react: "^19.2.17"`。
- `packageManager: "pnpm@11.9.0"`。pnpm 11.9 は `pnpm exec`・lefthook フック・CI を含む全操作で lockfile を `minimumReleaseAge` 検査します（plan 014 の記録）。したがって「除外を消しても本当に通るか」は `pnpm install` だけでなく `pnpm exec` 系まで確認する必要があります。
- `trustPolicy` / `trustPolicyExclude` / `allowBuilds` は**このプランの対象外**です。

### リポジトリの規約

- 依存・設定・生成物の変更は「早めに full gate へ昇格」する対象です（ユーザーのグローバル DoD）。このプランでは `mise run ci` 相当を通します。
- `mise.toml` に `[tasks.ci]` があり、`format → lint → test → test:storybook → build` を実行します。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install（lockfile 検査を含む） | `pnpm install` | exit 0、`minimumReleaseAge` 関連のエラーが出ない |
| Frozen install（CI 相当） | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Lint | `pnpm run lint` | exit 0 |
| Unit tests | `pnpm run test` | 63 files / 402 tests pass |
| Storybook tests | `pnpm run test:storybook` | 57 tests pass |
| Build | `pnpm run build` | exit 0、`dist/` が生成される |
| Full gate | `mise run ci` | 最後に `✅ RTK CI checks completed` |
| TOML format | `taplo fmt mise.toml` | exit 0（`mise.toml` を触った場合のみ） |

## Scope

**In scope**（変更してよいファイル）:
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`（`pnpm install` による自動更新のみ。手で編集しないこと）

**Out of scope**（関連して見えても触らないこと）:
- `package.json` の依存バージョン — このプランは**依存のアップグレードではありません**。バージョンは 1 つも変えません。
- `pnpm-workspace.yaml` の `minimumReleaseAge: 10080` 自体、`allowBuilds`、`trustPolicy`、`trustPolicyExclude` — 除外リスト以外は不変です。
- `lefthook.yml`、`.github/workflows/ci.yml`、`mise.toml`。
- `src/**` のあらゆるコード。

## Git workflow

- ブランチ: `advisor/016-prune-minimum-release-age-excludes`
- コミットメッセージ例: `build(deps): drop expired minimumReleaseAge exclusions`
- 署名やフッターは付けません。
- 指示がない限り push / PR 作成はしないでください。

## Steps

### Step 1: ベースラインを記録する

```
pnpm install --frozen-lockfile
pnpm run test
```

**Verify**: どちらも exit 0。`pnpm run test` の pass 数（402 tests / 63 files が期待値）をメモしてください。
Step 5 でこの数と比較します。

### Step 2: 除外エントリの soak 明けを実測で確認する

除外リストは「もう不要」という前提に立っています。その前提を自分で確認してください:

```
npm view typescript time --json | grep '"7.0.2"'
npm view react time --json | grep '"19.2.7"'
npm view storybook time --json | grep '"10.4.2"'
npm view @types/react time --json | grep '"19.2.16"'
npm view @typescript/typescript-darwin-arm64 time --json | grep '"7.0.2"'
```

**Verify**: 返ってくる公開日時がいずれも**今日より 7 日以上前**であること（`minimumReleaseAge: 10080` 分 = 7 日）。
7 日以内のものが 1 つでもあれば STOP condition です。

ネットワークが使えず `npm view` が失敗する場合も STOP condition です（前提を確認できないまま gate を
締めると install が壊れます）。

### Step 3: `minimumReleaseAgeExclude` を丸ごと削除する

`pnpm-workspace.yaml` から `minimumReleaseAgeExclude:` のキーと、その配下の 34 行すべてを削除します。
削除後のファイルはちょうど次の内容になります:

```yaml
allowBuilds:
  "@swc/core": false
  esbuild: true
  lefthook: true
  unrs-resolver: true
minimumReleaseAge: 10080
trustPolicy: no-downgrade
trustPolicyExclude:
  - semver@6.3.1
```

キーを空配列（`minimumReleaseAgeExclude: []`）にするのではなく、**キーごと削除**してください。空リストを
残すと「何か除外する意図がある」という誤ったシグナルになります。

**Verify**:
```
grep -c "minimumReleaseAgeExclude" pnpm-workspace.yaml
```
→ `0`（grep は exit 1 を返します。それが期待動作です）

### Step 4: install が gate を通ることを確認する

環境変数の override は**使わないでください**。`PNPM_CONFIG_MINIMUM_RELEASE_AGE` を設定してはいけません
（plan 014 で一時的に使われた手段ですが、このプランの目的はまさにそれを不要にすることです）。

```
pnpm install
```

**Verify**: exit 0。`minimumReleaseAge` / release age に関する警告やエラーが出ないこと。
`pnpm-lock.yaml` に差分が出るかもしれません（`pnpm install` が正規化する場合）。出た場合はその差分が
**依存バージョンの変更を含まないこと**を `git diff pnpm-lock.yaml` で確認してください。バージョンが動いて
いたら STOP condition です。

続けて CI 相当の frozen install も確認します:

```
pnpm install --frozen-lockfile
```

**Verify**: exit 0。

### Step 5: full gate を通す

依存・設定の変更なので focused check では不十分です。full gate を実行します:

```
mise run ci
```

**Verify**: 最後に `✅ RTK CI checks completed` が出力され、exit 0。内訳は次を満たすこと:
- typecheck: エラーなし
- lint: exit 0
- unit tests: Step 1 と同じ pass 数（402 tests / 63 files）
- storybook tests: 57 tests pass
- build: exit 0

`mise` が使えない環境なら、同等の個別コマンドを順に実行してください:
```
pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run test:storybook && pnpm run build
```

### Step 6: pnpm exec 経路も確認する

plan 014 の記録によると pnpm 11.9 は `pnpm exec` でも lockfile の release age を検査します。Step 5 の
`mise run ci` は `pnpm exec` を経由するので実質カバーされていますが、明示的にも確認してください:

```
pnpm exec tsc --version
```

**Verify**: exit 0 でバージョンが表示され、release age 関連のエラーが出ない。

## Test plan

新規テストは書きません。このプランはビルド設定の変更で、コードの振る舞いは一切変わりません。

検証は既存の full gate（Step 5）に完全に依存します。特に重要なのは:
- **unit test の pass 数が Step 1 と一致すること** — install が変わっていないことの実証。
- **build が通ること** — TypeScript 7 が引き続き解決できることの実証。
- **`pnpm install --frozen-lockfile` が通ること** — CI（`.github/workflows/ci.yml` の setup-node-env）と同じ経路の実証。

## Done criteria

すべて満たすこと:

- [ ] `grep -c "minimumReleaseAgeExclude" pnpm-workspace.yaml` がマッチ 0 件
- [ ] `grep -n "minimumReleaseAge: 10080" pnpm-workspace.yaml` が 1 件マッチする（gate 自体は残っている）
- [ ] `grep -n "trustPolicyExclude" pnpm-workspace.yaml` が 1 件マッチする（別設定を消していない）
- [ ] `pnpm install` が環境変数 override なしで exit 0
- [ ] `pnpm install --frozen-lockfile` が exit 0
- [ ] `mise run ci` が `✅ RTK CI checks completed` で終了（または同等の個別コマンドがすべて exit 0）
- [ ] unit test の pass 数が Step 1 の記録と一致
- [ ] `git diff --stat` の変更が `pnpm-workspace.yaml` と（あれば）`pnpm-lock.yaml` のみ
- [ ] `git diff -- package.json` が空（依存バージョンを変えていない）
- [ ] `pnpm-lock.yaml` の差分に依存バージョンの変更が含まれていない
- [ ] `plans/README.md` の 016 の Status を更新済み

## STOP conditions

以下に該当したら停止して報告してください:

- Step 2 で、除外対象のいずれかが公開から 7 日以内である、または `npm view` がネットワーク不通などで実行できない。
- Step 4 の `pnpm install` が release age 関連のエラーで失敗する（＝まだ soak 中のパッケージがある。どのパッケージかを報告してください）。
- `pnpm install` が `pnpm-lock.yaml` の依存バージョンを動かす。
- Step 5 の full gate が、合理的な修正を 1 度試した後もなお失敗する。
- 通すために `package.json` の依存バージョンを変える必要があるように見える（それはこのプランの範囲外の別作業です）。
- 通すために `PNPM_CONFIG_MINIMUM_RELEASE_AGE` などの環境変数 override が必要になる（それはこのプランの目的の否定です）。

## Maintenance notes

将来この設定を触る人向け:

- **これ以降、依存を上げるたびに除外を追加しないでください。** 除外は「soak 期間を待てない緊急時だけの一時措置」であり、追加したら soak 明け後に消すのが前提です。消し忘れが 34 エントリまで積み上がったのが今回の負債です。
- どうしても除外が必要な場合は、(a) 必ず version-pin 形式（`pkg@x.y.z`）で書き、(b) soak 明けの日付をコメントで残し、(c) 明けたら削除する、の 3 点を守ってください。バージョン無指定の除外はそのパッケージの soak を恒久的に無効化します。
- **レビューで注視すべき点**: `minimumReleaseAge: 10080` 自体が消えていないこと、`trustPolicy` / `trustPolicyExclude` / `allowBuilds` が無変更であること、`pnpm-lock.yaml` の差分に依存バージョンの変動がないこと。
- **意図的に先送りした follow-up**: `pnpm audit` が報告する minimatch / rollup の high advisory は dev/test 専用で本番バンドル（esbuild）に到達しないため、`plans/README.md` の Round 1 記録どおり housekeeping 扱いのままです。このプランでは扱いません。
