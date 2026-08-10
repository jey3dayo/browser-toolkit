# Plan 017: 重複している OpenAI legacy モデルマップを 1 箇所に統合する

> **Executor instructions**: この計画を上から順に実行してください。各ステップの検証コマンドを必ず実行し、
> 期待結果を確認してから次に進んでください。「STOP conditions」に該当したら、勝手に工夫せず停止して報告して
> ください。完了したら `plans/README.md` の当該行の Status を更新してください（レビュアーが index を管理する
> と明示された場合は不要）。
>
> **Drift check (最初に実行)**:
> `git diff --stat 9c49e9b..HEAD -- src/constants/models.ts src/schemas/openai.ts src/schemas/provider.ts tests/openai.schema.test.ts tests/schemas.provider.test.ts`
> 差分があれば、下記「Current state」の抜粋と実コードを比較し、一致しない場合は STOP condition として扱って
> ください。

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9c49e9b`, 2026-08-10

## Why this matters

OpenAI の旧モデル ID を現行モデルへ読み替えるテーブルが、**逐語的に同じ内容で 2 ファイルに存在します**:
`src/schemas/openai.ts` の `DEPRECATED_MODEL_MAP` と `src/schemas/provider.ts` の `LEGACY_OPENAI_MODEL_MAP`
（どちらも 12 エントリ、キーも値も完全一致）。

これは仮定ではなく実測された保守コストです。直近のコミット `c4aa820`（"feat(openai): update model options to
GPT-5.6 Terra and Luna"）は、モデルを更新するために**両方のファイルを同じ差分で編集しています**。片方を忘れれば、
保存済み設定の移行が経路によって成功/失敗に分かれます — 具体的には `src/openai/settings.ts` 経由（`safeParseOpenAiModel`）
では旧 ID がパース失敗し、`src/ai/settings.ts` / popup 経由（`normalizeAiModel`）では default へ落ちる、という
非対称なバグになります。

統合すれば、OpenAI モデルを追加・改名するときに触るファイルが 1 つになります。挙動は一切変えません。

## Current state

### 関係するファイルと役割

- `src/constants/models.ts` — 各プロバイダのモデル ID 定数の**正本**（`OPENAI_MODELS`、`OPENAI_MODEL_LIST` など）。今回、共有マップの置き場所にします。
- `src/schemas/openai.ts` — valibot による OpenAI モデルの厳格パース（`safeParseOpenAiModel`）。未知値は**失敗**します。
- `src/schemas/provider.ts` — プロバイダ設定と `normalizeAiModel`。未知値は**そのプロバイダの default にフォールバック**します。
- `src/openai/settings.ts:11` — `safeParseOpenAiModel` の唯一の呼び出し元。
- `src/ai/settings.ts:48`、`src/popup/panes/settings/useSettingsState.ts:127,202`、`src/popup/panes/settings/SettingsModelSection.tsx:38` — `normalizeAiModel` の呼び出し元。
- `tests/openai.schema.test.ts` — `safeParseOpenAiModel` のテスト（legacy ID の読み替えを含む）。
- `tests/schemas.provider.test.ts` — `normalizeAiModel` のテスト（legacy ID の読み替えを含む）。

### `src/schemas/openai.ts`（現在の全文）

```ts
import { picklist, pipe, safeParse, string, transform, trim } from "valibot";
import { OPENAI_MODEL_LIST, OPENAI_MODELS } from "@/constants/models";

export const OPENAI_MODEL_OPTIONS = OPENAI_MODEL_LIST;

export type OpenAiModelOption = (typeof OPENAI_MODEL_OPTIONS)[number];

const DEPRECATED_MODEL_MAP: Record<string, OpenAiModelOption> = {
  default: OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-nano": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-pro": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.1": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2-chat-latest": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4-2026-03-05": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.5": OPENAI_MODELS.GPT_5_6_TERRA,
};

const OpenAiModelSchema = pipe(
  string(),
  trim(),
  transform((value) => DEPRECATED_MODEL_MAP[value] ?? value),
  picklist(OPENAI_MODEL_OPTIONS)
);

export function safeParseOpenAiModel(value: unknown) {
  return safeParse(OpenAiModelSchema, value);
}
```

### `src/schemas/provider.ts:63-97`（現在のコード）

```ts
const LEGACY_OPENAI_MODEL_MAP: Record<string, string> = {
  default: OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-nano": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-pro": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.1": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2-chat-latest": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4-2026-03-05": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.5": OPENAI_MODELS.GPT_5_6_TERRA,
};

/**
 * プロバイダーに応じたモデルの正規化
 */
export function normalizeAiModel(
  provider: AiProvider,
  value: string | undefined
): string {
  if (!value) {
    return PROVIDER_CONFIGS[provider].defaultModel;
  }

  const normalizedValue =
    provider === "openai" ? (LEGACY_OPENAI_MODEL_MAP[value] ?? value) : value;
  const config = PROVIDER_CONFIGS[provider];
  if (config.models.includes(normalizedValue)) {
    return normalizedValue;
  }

  return config.defaultModel;
}
```

### `src/constants/models.ts`（現在の該当部分）

```ts
/**
 * OpenAI モデル定数
 */
export const OPENAI_MODELS = {
  GPT_5_6_TERRA: "gpt-5.6-terra",
  GPT_5_6_LUNA: "gpt-5.6-luna",
} as const;
```
…（Anthropic / z.ai 定数が続く）…
```ts
/**
 * OpenAIモデル一覧（配列）
 */
export const OPENAI_MODEL_LIST = Object.values(OPENAI_MODELS);
```

### 重要な設計上の注意（挙動を変えないための前提）

2 つの利用側は**未知値の扱いが意図的に違います**。マップを共有しても、この差は維持してください:

- `safeParseOpenAiModel`: マップで読み替えた後 `picklist` に通すため、マップにも一覧にもない値は**パース失敗**（`success: false`）。
- `normalizeAiModel`: マップで読み替えた後、一覧に含まれなければ**default モデルを返す**（例外を投げない）。

このプランは「重複の除去」だけを行います。どちらの関数のシグネチャ・戻り値・エラー挙動も変えません。

### リポジトリの規約

- モデル ID 定数の正本は `src/constants/models.ts`（`CLAUDE.md` の Source Of Truth 表: 「Context Actions implementation / prompts」「Storage schema / migrations」と分けて、モデル定数はここに集約されています）。既存データ互換のための読み替えテーブルは、それを所有する実装モジュールに置くのが方針です。
- TypeScript strict mode。`any` と型アサーションの導入は禁止（`CLAUDE.md`）。
- JSDoc スタイルの日本語コメント（`src/constants/models.ts` の既存コメントに倣う）。
- フォーマットは Ultracite（Biome）。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| 対象テストのみ | `pnpm exec vitest run --project=node tests/openai.schema.test.ts tests/schemas.provider.test.ts` | すべて pass |
| Unit tests（全体） | `pnpm run test` | 63 files / 402 tests pass |
| Lint | `pnpm run lint` | exit 0 |
| Format | `pnpm exec ultracite fix src/constants/models.ts src/schemas/openai.ts src/schemas/provider.ts` | exit 0 |
| Build | `pnpm run build` | exit 0 |

## Scope

**In scope**（変更してよいファイル）:
- `src/constants/models.ts`（共有マップを追加）
- `src/schemas/openai.ts`（重複マップを削除し import に置き換え）
- `src/schemas/provider.ts`（重複マップを削除し import に置き換え）
- `tests/openai.schema.test.ts`（必要ならテストを追加。既存アサーションは変えない）
- `tests/schemas.provider.test.ts`（必要ならテストを追加。既存アサーションは変えない）

**Out of scope**（関連して見えても触らないこと）:
- **モデル ID の追加・削除・変更** — `OPENAI_MODELS`、`ANTHROPIC_MODELS`、`ZAI_MODELS` の中身は 1 文字も変えません。Anthropic のモデル一覧の更新は別プラン（018）の担当です。
- `safeParseOpenAiModel` / `normalizeAiModel` のシグネチャ・戻り値の型・未知値の扱い。
- `src/openai/settings.ts`、`src/ai/settings.ts`、`src/popup/**` の呼び出し側 — 呼び出しシグネチャが変わらないので触る必要はありません。
- `src/storage/migrations.ts` — 保存値の移行は既存の仕組みのままです。
- Anthropic / z.ai 用の legacy マップの**新規追加** — 現在存在せず、必要性も未検証です。作らないでください。

## Git workflow

- ブランチ: `advisor/017-dedupe-openai-legacy-model-map`
- コミットメッセージ例: `refactor(models): share one OpenAI legacy model map`
- 署名やフッターは付けません。
- 指示がない限り push / PR 作成はしないでください。

## Steps

### Step 1: ベースラインを取る

```
pnpm exec vitest run --project=node tests/openai.schema.test.ts tests/schemas.provider.test.ts
pnpm run test
```

**Verify**: どちらも exit 0。`pnpm run test` の pass 数（402 tests / 63 files が期待値）をメモしてください。

### Step 2: 2 つのマップが本当に同一であることを自分で確認する

```
grep -n "gpt-" src/schemas/openai.ts
grep -n "gpt-" src/schemas/provider.ts
```

**Verify**: 両方に同じ 12 個のキー（`default`, `gpt-4o`, `gpt-4o-mini`, `gpt-5-mini`, `gpt-5-nano`,
`gpt-5-pro`, `gpt-5.1`, `gpt-5.2`, `gpt-5.2-chat-latest`, `gpt-5.4`, `gpt-5.4-2026-03-05`, `gpt-5.5`）が
現れ、値がすべて `OPENAI_MODELS.GPT_5_6_TERRA` であること。

**差異が 1 つでもあれば STOP condition です。** 差異があるなら、それは「重複」ではなく意図的に分かれた
2 つのテーブルである可能性があり、統合は挙動を変えてしまいます。

### Step 3: `src/constants/models.ts` に共有マップを追加する

`OPENAI_MODEL_LIST` の定義より**後ろ**に、次を追加します（`OPENAI_MODEL_LIST` の型を使うため）:

```ts
/**
 * 廃止された OpenAI モデル ID から現行モデルへの読み替え表
 *
 * 既存ユーザーの保存済み設定を壊さないために必要。OpenAI モデルを更新する際は
 * ここだけを編集すれば `src/schemas/openai.ts` と `src/schemas/provider.ts` の
 * 両方に反映される。
 */
export const LEGACY_OPENAI_MODEL_MAP: Record<
  string,
  (typeof OPENAI_MODEL_LIST)[number]
> = {
  default: OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-4o-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-mini": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-nano": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5-pro": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.1": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.2-chat-latest": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.4-2026-03-05": OPENAI_MODELS.GPT_5_6_TERRA,
  "gpt-5.5": OPENAI_MODELS.GPT_5_6_TERRA,
};
```

キーと値は Step 2 で確認した既存の内容を**そのままコピー**してください。この機会に増減させないこと。

**Verify**: `pnpm run typecheck` → exit 0

### Step 4: `src/schemas/openai.ts` の重複マップを削除する

`DEPRECATED_MODEL_MAP` の定義（12 行 + 括弧）を削除し、import と参照を差し替えます:

```ts
import { picklist, pipe, safeParse, string, transform, trim } from "valibot";
import {
  LEGACY_OPENAI_MODEL_MAP,
  OPENAI_MODEL_LIST,
} from "@/constants/models";

export const OPENAI_MODEL_OPTIONS = OPENAI_MODEL_LIST;

export type OpenAiModelOption = (typeof OPENAI_MODEL_OPTIONS)[number];

const OpenAiModelSchema = pipe(
  string(),
  trim(),
  transform((value) => LEGACY_OPENAI_MODEL_MAP[value] ?? value),
  picklist(OPENAI_MODEL_OPTIONS)
);

export function safeParseOpenAiModel(value: unknown) {
  return safeParse(OpenAiModelSchema, value);
}
```

`OPENAI_MODELS` の import が不要になる（他で使っていない）場合は import から外してください。lint が
未使用 import を検出します。`OPENAI_MODEL_OPTIONS` と `OpenAiModelOption` の export は**維持**してください
（`tests/openai.schema.test.ts` と `src/openai/settings.ts` が使っています）。

**Verify**:
```
grep -n "DEPRECATED_MODEL_MAP" src/
```
→ 出力なし（exit 1）

### Step 5: `src/schemas/provider.ts` の重複マップを削除する

ローカルの `LEGACY_OPENAI_MODEL_MAP` 定義を削除し、`@/constants/models` からの import に切り替えます。
既存の import 文に追加してください:

```ts
import {
  ANTHROPIC_MODEL_LIST,
  ANTHROPIC_MODELS,
  LEGACY_OPENAI_MODEL_MAP,
  OPENAI_MODEL_LIST,
  OPENAI_MODELS,
  ZAI_MODEL_LIST,
  ZAI_MODELS,
} from "@/constants/models";
```

`normalizeAiModel` の本体は**一切変更しません**。参照する識別子の名前が偶然同じなので、関数内の
`LEGACY_OPENAI_MODEL_MAP[value] ?? value` はそのまま動きます。

`OPENAI_MODELS` は `PROVIDER_CONFIGS.openai.defaultModel` で使われているので import から外さないでください。

**Verify**:
```
grep -c "^const LEGACY_OPENAI_MODEL_MAP" src/schemas/provider.ts
```
→ マッチ 0 件（exit 1）。かつ:
```
grep -c "LEGACY_OPENAI_MODEL_MAP" src/constants/models.ts
```
→ 1 以上

### Step 6: マップ定義が 1 箇所だけになったことを確認する

```
grep -rn "gpt-5.4-2026-03-05" src/
```

**Verify**: マッチするのは `src/constants/models.ts` の 1 行のみ。`src/schemas/` に残っていたら Step 4/5 が
未完了です。

### Step 7: テストで「1 箇所編集すれば両経路に効く」ことを固定する

`tests/schemas.provider.test.ts` は既に legacy ID の読み替え（`gpt-5.1`、`gpt-5.4`、`gpt-5.4-2026-03-05`、
`gpt-5.2-chat-latest`、`gpt-4o`）を検証しています。`tests/openai.schema.test.ts` も legacy 読み替えを
検証しています。**既存のアサーションは変更しないでください。**

追加するのは「2 経路が同じ legacy テーブルを見ている」ことを示す 1 つのテストです。
`tests/schemas.provider.test.ts` の `describe("normalizeAiModel", ...)` の隣に、次の構造で追加します
（既存テストの書き方に倣い、`describe` / `it` / `expect` を使う）:

```ts
import { LEGACY_OPENAI_MODEL_MAP } from "@/constants/models";
import { safeParseOpenAiModel } from "@/schemas/openai";

describe("legacy OpenAI model aliases", () => {
  // 読み替え表は src/constants/models.ts が単一の正本。
  // strict パース経路と fallback 経路が同じ表を参照していることを固定する。
  it("resolves every legacy alias identically through both entry points", () => {
    for (const [legacyId, expected] of Object.entries(
      LEGACY_OPENAI_MODEL_MAP
    )) {
      const parsed = safeParseOpenAiModel(legacyId);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.output).toBe(expected);
      }
      expect(normalizeAiModel("openai", legacyId)).toBe(expected);
    }
  });
});
```

import はファイル先頭の既存 import 群にまとめてください（Biome が import 順を整えます）。

**Verify**:
```
pnpm exec vitest run --project=node tests/openai.schema.test.ts tests/schemas.provider.test.ts
```
→ すべて pass。新規テストが 1 つ増えていること。

### Step 8: format / lint / typecheck / test / build を通す

```
pnpm exec ultracite fix src/constants/models.ts src/schemas/openai.ts src/schemas/provider.ts tests/openai.schema.test.ts tests/schemas.provider.test.ts
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

**Verify**: すべて exit 0。`pnpm run test` の pass 数が Step 1 の記録 +1（新規テスト分）であること。
既存テストが 1 つも fail / skip になっていないこと。

## Test plan

- **新規テスト**: `tests/schemas.provider.test.ts` に 1 件追加（Step 7）。`LEGACY_OPENAI_MODEL_MAP` の全エントリについて、`safeParseOpenAiModel` と `normalizeAiModel` が同じ現行モデル ID を返すことを検証します。これがまさに今回の重複が引き起こしていた「経路によって挙動が分かれる」不具合の再発防止です。
- **構造の手本にするテスト**: `tests/schemas.provider.test.ts` の既存の `describe("normalizeAiModel", ...)` ブロック。
- **既存テストの扱い**: `tests/openai.schema.test.ts` と `tests/schemas.provider.test.ts` の既存アサーションは characterization test として機能します。**書き換えないでください。** 通らなくなった場合は挙動を変えてしまった証拠であり、STOP condition です。
- **検証**: `pnpm run test` → 全 pass、pass 数は Step 1 +1。

## Done criteria

すべて満たすこと:

- [ ] `grep -rn "DEPRECATED_MODEL_MAP" src/ tests/` がマッチ 0 件
- [ ] `grep -rn "gpt-5.4-2026-03-05" src/` のマッチが `src/constants/models.ts` の 1 行のみ
- [ ] `src/constants/models.ts` が `LEGACY_OPENAI_MODEL_MAP` を export している
- [ ] `src/schemas/openai.ts` と `src/schemas/provider.ts` の両方が `@/constants/models` から `LEGACY_OPENAI_MODEL_MAP` を import している
- [ ] `pnpm run typecheck` が exit 0
- [ ] `pnpm run lint` が exit 0
- [ ] `pnpm run test` が exit 0、pass 数 = Step 1 の記録 + 1、skip 0
- [ ] `pnpm run build` が exit 0
- [ ] `git diff -- src/constants/models.ts` に `OPENAI_MODELS` / `ANTHROPIC_MODELS` / `ZAI_MODELS` の**中身の変更が含まれていない**（追加した定数以外は無変更）
- [ ] `git status` で In scope 以外のファイルが変更されていない
- [ ] `plans/README.md` の 017 の Status を更新済み

## STOP conditions

以下に該当したら停止して報告してください:

- Step 2 で 2 つのマップの内容が一致しない（キーまたは値に差がある）。差分の内容を報告してください。
- 既存の `tests/openai.schema.test.ts` または `tests/schemas.provider.test.ts` のアサーションが失敗する。
- 統合のために `safeParseOpenAiModel` または `normalizeAiModel` のシグネチャ・戻り値の型・未知値の扱いを変える必要があるように見える。
- `src/constants/models.ts` → `src/schemas/*` の import で循環参照エラーが出る。
- `src/openai/settings.ts` / `src/ai/settings.ts` / `src/popup/**` を変更する必要があるように見える。
- ステップの検証が、合理的な修正を 1 度試した後もなお失敗する。

## Maintenance notes

将来この周辺を触る人向け:

- **OpenAI モデルを更新するときの手順が変わります。** 今後は `src/constants/models.ts` の `OPENAI_MODELS` と `LEGACY_OPENAI_MODEL_MAP` だけを編集すれば、strict パース経路と fallback 経路の両方に反映されます。`src/schemas/` 側にマップを再度書かないでください。
- **`OPENAI_MODELS` からモデルを削除するときは `LEGACY_OPENAI_MODEL_MAP` にそのモデル ID を追加**してください。そうしないと、そのモデルを保存していたユーザーの設定が（`safeParseOpenAiModel` 経路では）パース失敗、（`normalizeAiModel` 経路では）default に落ちます。
- **未知値の扱いが 2 経路で違うこと自体は残っています**（strict パース = 失敗、normalize = default フォールバック）。これは呼び出し側の要求が違うためで、意図的です。将来統一を検討する場合は `src/openai/settings.ts:11` と `src/ai/settings.ts:48` の両方の期待を確認してから行ってください。
- **レビューで注視すべき点**: (a) マップのキー・値が 12 件のまま増減していないこと、(b) `normalizeAiModel` の関数本体が無変更であること、(c) `OPENAI_MODEL_OPTIONS` / `OpenAiModelOption` の export が維持されていること。
- **意図的に先送りした follow-up**: `plans/README.md` の DIR-04（OpenAI model shim の集約 — model 処理が複数ファイルに分散）はより広い範囲のリファクタです。このプランはその中で最も明確かつ低リスクな一歩だけを実行し、registry 化などの設計変更には踏み込みません。
