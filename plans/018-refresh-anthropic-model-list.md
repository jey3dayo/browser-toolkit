# Plan 018: Anthropic のモデル一覧を現行世代（Claude 5 系）へ更新する

> **Executor instructions**: この計画を上から順に実行してください。各ステップの検証コマンドを必ず実行し、
> 期待結果を確認してから次に進んでください。「STOP conditions」に該当したら、勝手に工夫せず停止して報告して
> ください。完了したら `plans/README.md` の当該行の Status を更新してください（レビュアーが index を管理する
> と明示された場合は不要）。
>
> **Drift check (最初に実行)**:
> `git diff --stat 9c49e9b..HEAD -- src/constants/models.ts src/schemas/provider.ts src/ai/anthropic-adapter.ts src/background/openai.ts tests/schemas.provider.test.ts tests/ai.settings.test.ts tests/ai.adapter.test.ts tests/popup.settings_pane.dom.test.ts`
> 差分があれば、下記「Current state」の抜粋と実コードを比較し、一致しない場合は STOP condition として扱って
> ください。

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED（モデル ID の差し替えと adapter のリクエストパラメータ変更を同時に行うため。片方だけのマージは不可）
- **Depends on**: none（順序の推奨のみ: 017 と同じファイルを触るため、017 も実行する場合は 017 → 018 の順にすると衝突が少ない）
- **Category**: bug
- **Planned at**: commit `9c49e9b`, 2026-08-10

## Why this matters

直近のコミット `c4aa820` で OpenAI のモデル一覧は GPT-5.6 世代へ更新されましたが、**Anthropic は前世代のまま
取り残されています**。ユーザーが popup の設定画面で選べる Claude モデルは `claude-sonnet-4-5-20250929` /
`claude-haiku-4-5-20251001` / `claude-opus-4-6` の 3 つで、default は `claude-sonnet-4-5-20250929` です。

現行世代は Claude 5 系（`claude-opus-5`、`claude-sonnet-5`）で、Sonnet 4.5 / Opus 4.6 はいずれも旧世代です。
結果として、Anthropic を選んだユーザーは他の 2 プロバイダより明確に劣る（そして高い）モデルで要約・翻訳を
実行しています。これは機能的な劣化であり、プロバイダ間の選択が公平でない状態です。

加えて `claude-sonnet-4-5-20250929` / `claude-haiku-4-5-20251001` は**日付サフィックス付きの完全 ID** で
書かれています。Anthropic の現行ガイダンスはエイリアス（`claude-haiku-4-5` のような日付なしの ID）を使うこと
なので、書式も揃えます。

**ID を差し替えるだけでは動きません（ここが本プランの要点）。** Claude 5 系（`claude-opus-5` /
`claude-sonnet-5`）は `temperature` / `top_p` / `top_k` を受け付けず、送ると HTTP 400 を返します。
しかし `src/background/openai.ts` は全リクエストに `temperature` を載せており（要約 `0.2`、トークン
health check `0`）、`src/ai/anthropic-adapter.ts` はそれをそのまま Anthropic のボディへ転記しています。
つまり ID だけを更新すると、**Anthropic を選んだユーザーの要約・翻訳が全て 400 になり、トークン検証も
「無効なトークン」と誤報告します**。この 400 は typecheck / lint / vitest では検出できません（ネットワーク
呼び出しをモックしているため）。したがってこのプランは ID 更新（Part A）と adapter 互換性修正（Part B）を
**必ずセットで**行います。片方だけをマージしてはいけません。

## Current state

### 変更する対象

`src/constants/models.ts:15-22`（現在のコード）:
```ts
/**
 * Anthropic (Claude) モデル定数
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5-20251001",
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
} as const;
```

同ファイル内で一覧が導出されています（この行は変更しません）:
```ts
/**
 * Anthropicモデル一覧（配列）
 */
export const ANTHROPIC_MODEL_LIST = Object.values(ANTHROPIC_MODELS);
```

`src/schemas/provider.ts:32-37`（現在のコード。`defaultModel` が旧世代を指しています）:
```ts
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
    models: ANTHROPIC_MODEL_LIST,
    baseUrl: "https://api.anthropic.com/v1",
  },
```

### 更新後の目標状態

`ANTHROPIC_MODELS` を次の 3 エントリにします。**この ID 文字列はそのまま使ってください。日付サフィックスを
付けたり、別の ID を推測して足したりしないこと。**

```ts
/**
 * Anthropic (Claude) モデル定数
 *
 * ID は日付サフィックスなしのエイリアスを使う（Anthropic の推奨形式）。
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_OPUS_5: "claude-opus-5",
  CLAUDE_SONNET_5: "claude-sonnet-5",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5",
} as const;
```

`defaultModel` は `ANTHROPIC_MODELS.CLAUDE_SONNET_5` にします。現状の default が Sonnet 世代なので、
価格と品質のバランスという意図を保ったまま世代だけを進める形になります。

- `claude-opus-5` — 最上位。複雑な要約・分析向け。
- `claude-sonnet-5` — 速度と知性のバランス。default。
- `claude-haiku-4-5` — 最速・最安。Haiku は 4.5 が現行世代なので、これはバージョンを上げません（`claude-haiku-5` は存在しません）。日付サフィックスだけを外します。

### 保存済み設定の扱い（重要 — ここを誤解しないこと）

既存ユーザーが `claude-sonnet-4-5-20250929` や `claude-opus-4-6` を保存している場合、`src/schemas/provider.ts`
の `normalizeAiModel` が**既存の実装のまま**新しい default（`claude-sonnet-5`）へフォールバックします。
該当ロジック（変更しません）:

```ts
  const normalizedValue =
    provider === "openai" ? (LEGACY_OPENAI_MODEL_MAP[value] ?? value) : value;
  const config = PROVIDER_CONFIGS[provider];
  if (config.models.includes(normalizedValue)) {
    return normalizedValue;
  }

  return config.defaultModel;
```

つまり **Anthropic 用の legacy 読み替えマップを新規に作る必要はありません**。既存の fallback で壊れずに
移行します（`tests/schemas.provider.test.ts:66` が「anthropic に未知値を渡すと default になる」ことを既に
検証しています）。Anthropic 用の読み替えマップを追加すると `normalizeAiModel` の分岐を変えることになるため、
このプランでは**やらないでください**（Maintenance notes に follow-up として記録済み）。

### Part B が触る箇所（adapter 互換性）

`src/ai/anthropic-adapter.ts:24-42`（現在のコード）:
```ts
    // Anthropic APIのボディ形式に変換
    const anthropicBody: Record<string, unknown> = {
      model: body.model,
      messages: otherMessages,
      max_tokens: body.max_completion_tokens ?? 4096,
    };

    // systemメッセージがあれば追加
    if (systemMessages.length > 0) {
      anthropicBody.system = systemMessages.map((m) => m.content).join("\n\n");
    }

    // temperatureがあれば追加
    if (body.temperature !== undefined) {
      anthropicBody.temperature = body.temperature;
    }
```

`temperature` を載せてくる呼び出し元（`src/background/openai.ts`。プロバイダ非依存の共通経路です）:
- `:74`、`:138`、`:245`、`:320` — 要約・翻訳などの本処理。`temperature: 0.2`
- `:207-208` — トークン health check。`max_completion_tokens: 5`, `temperature: 0`

比較のため、OpenAI 側は既に同種のガードを持っています（`src/ai/openai-compatible-adapter.ts:8-16`）:
```ts
function buildOpenAiRequestBody(body: ChatRequestBody): ChatRequestBody {
  if (!body.model.startsWith("gpt-5")) {
    return body;
  }

  const { temperature: _temperature, ...rest } = body;
  return rest;
}
```

**Part B の方針（2 点。これ以上のことはしないでください）**

1. **Anthropic adapter は `temperature` を送らない。** モデル ID による条件分岐（`startsWith` 等）は
   **入れないでください**。理由: 更新後の一覧（`claude-opus-5` / `claude-sonnet-5` / `claude-haiku-4-5`）は
   すべて `temperature` の省略が有効であり、条件分岐は将来のモデル追加時に壊れる分岐を増やすだけです
   （OpenAI 側の `startsWith("gpt-5")` はまさにその脆さを抱えています）。`temperature` を単に落とすのが
   最も単純で、全モデルで正しい選択です。

2. **health check の `max_completion_tokens: 5` を `1024` に上げる。** Claude 5 系は `thinking` を省略すると
   adaptive thinking が既定で有効になり、`max_tokens` は thinking と応答テキストの**合計**上限になります。
   5 トークンでは thinking だけで枯渇し、応答テキストが空になって health check が誤って失敗します。
   これは `src/background/openai.ts` の 1 行の変更で、OpenAI / z.ai にとっても無害です（`max_tokens` は
   上限であって消費量ではないため、health check の実コストはほぼ変わりません）。

`anthropic-adapter.ts` の `max_tokens: body.max_completion_tokens ?? 4096` の式自体は**変更しません**
（既存テスト `tests/ai.adapter.test.ts:124-133` が「`max_completion_tokens: 100` → `max_tokens: 100`」の
素通しを固定しており、adapter 側に下限を入れるとそのテストと衝突します）。

`thinking` フィールドは**送らないでください**（既定の adaptive thinking のままにします）。
`thinking: { type: "disabled" }` を送ると、Claude 5 で `<thinking>` タグが応答テキストへ漏れる既知の
失敗モードを踏む可能性があり、要約結果が汚れます。

### モデル ID を参照している箇所

`ANTHROPIC_MODELS.CLAUDE_SONNET_4_5` というシンボル参照が以下にあります。定数名を変えるので、これらの
参照も差し替える必要があります:

- `src/schemas/provider.ts:34` — `defaultModel`
- `tests/schemas.provider.test.ts:45,46,57,67`
- `tests/ai.settings.test.ts:13,23,127`
- `tests/popup.settings_pane.dom.test.ts:278,287`

なお `tests/ai.adapter.test.ts:97,112,126` には `model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5"` という
**文字列リテラル**があります（定数参照ではなく、置換ミスで残った文字列です）。これはリクエストボディの
組み立てを検証するテストで、モデル ID の内容には依存していないため**このプランでは触りません**。

### リポジトリの規約

- モデル ID 定数の正本は `src/constants/models.ts`（`CLAUDE.md` の Source Of Truth 表）。
- TypeScript strict mode。`any` と型アサーションの導入は禁止（`CLAUDE.md`）。
- JSDoc スタイルの日本語コメント。
- フォーマットは Ultracite（Biome）。
- テストは「実装詳細ではなく振る舞い」を検証します。ただし**モデル ID の一覧そのものが明示された契約である場合は固定してよく、その根拠をテスト名かコメントで示す**のが方針です（`CLAUDE.md`）。設定画面に出る選択肢は利用者向けの契約なので、一覧の固定は妥当です。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| 対象テスト | `pnpm exec vitest run --project=node --project=dom tests/schemas.provider.test.ts tests/ai.settings.test.ts tests/popup.settings_pane.dom.test.ts` | すべて pass |
| Unit tests（全体） | `pnpm run test` | 63 files / 402 tests pass |
| Storybook tests | `pnpm run test:storybook` | 57 tests pass |
| Lint | `pnpm run lint` | exit 0 |
| Format | `pnpm exec ultracite fix src/constants/models.ts src/schemas/provider.ts` | exit 0 |
| Build | `pnpm run build` | exit 0 |
| Full gate | `mise run ci` | `✅ RTK CI checks completed` |

## Scope

**In scope**（変更してよいファイル）:
- `src/constants/models.ts`（`ANTHROPIC_MODELS` の中身のみ）
- `src/schemas/provider.ts`（`PROVIDER_CONFIGS.anthropic.defaultModel` の参照のみ）
- `src/ai/anthropic-adapter.ts`（`temperature` を送らないようにする。Part B-1）
- `src/background/openai.ts`（health check の `max_completion_tokens: 5` → `1024` の 1 行のみ。Part B-2）
- `tests/schemas.provider.test.ts`（シンボル参照の差し替え + 一覧の固定テスト）
- `tests/ai.settings.test.ts`（シンボル参照の差し替え）
- `tests/popup.settings_pane.dom.test.ts`（シンボル参照の差し替え）
- `tests/ai.adapter.test.ts`（Anthropic ボディに `temperature` が載らないことのテストを追加）

**Out of scope**（関連して見えても触らないこと）:
- **`ZAI_MODELS`（z.ai / GLM のモデル一覧）** — `glm-5` / `glm-4.7` / `glm-4.6` / `glm-4.5` が現行かどうかを裏付ける一次情報がないため、推測で更新してはいけません。メンテナ確認待ちの項目として残します。
- **`OPENAI_MODELS` と `LEGACY_OPENAI_MODEL_MAP`** — `c4aa820` で更新済みです。触りません。
- `normalizeAiModel` の実装 — Anthropic 用の legacy 読み替え分岐を追加しないでください。
- `src/ai/openai-compatible-adapter.ts` — OpenAI / z.ai の `temperature` 扱いは現状のままにします。`startsWith("gpt-5")` の脆さは別途の検討事項です。
- `src/ai/anthropic-adapter.ts` の `extractText` / `extractError` / `max_tokens` の式 / headers / `system` 分離ロジック — Part B-1 の `temperature` 削除以外は変更しません。
- `src/background/openai.ts` の `temperature: 0.2` を書いている 4 箇所（`:74`、`:138`、`:245`、`:320`）— OpenAI / z.ai では有効なパラメータなので残します。Anthropic 向けの除去は adapter 側で行います。
- `thinking` / `output_config` / `effort` などの Anthropic 固有パラメータの新規送信。
- `manifest.json` の `host_permissions` / `connect-src`、`src/constants/api-endpoints.ts` — endpoint は変わりません（`https://api.anthropic.com/v1`）。
- `tests/ai.adapter.test.ts` の既存アサーション — 特に `:124-133` の `max_tokens` 素通しテスト。追加のみ行います。上記のとおり `model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5"` という文字列リテラルの残骸もありますが、このプランでは直しません。
- `src/prompts/**`、`src/i18n/resources.ts` — モデル名を表示文言として持っていません。

## Git workflow

- ブランチ: `advisor/018-refresh-anthropic-model-list`
- コミットメッセージ例: `feat(anthropic): update model options to Claude 5 family`（`c4aa820` の書式に倣う）
- 署名やフッターは付けません。
- 指示がない限り push / PR 作成はしないでください。

## Steps

### Step 1: ベースラインを取る

```
pnpm run test
```

**Verify**: exit 0。pass 数（402 tests / 63 files が期待値）をメモしてください。

### Step 2: 現在の参照箇所を洗い出す

```
grep -rn "CLAUDE_SONNET_4_5\|CLAUDE_OPUS_4_6\|CLAUDE_HAIKU_4_5" src tests
```

**Verify**: 出力が「Current state」に列挙した箇所と一致すること（`src/constants/models.ts`、
`src/schemas/provider.ts:34`、`tests/schemas.provider.test.ts`、`tests/ai.settings.test.ts`、
`tests/popup.settings_pane.dom.test.ts`、および `tests/ai.adapter.test.ts` の文字列リテラル 3 件）。

想定外のファイルが出てきたら、そのファイルも参照の差し替えが必要かを判断してください。判断できない場合は
STOP condition です。

### Step 3: `ANTHROPIC_MODELS` を更新する

`src/constants/models.ts` の `ANTHROPIC_MODELS` を「Current state」の「更新後の目標状態」に示したとおりに
置き換えます。`ANTHROPIC_MODEL_LIST` の定義行は変更しません（`Object.values` なので自動的に追従します）。

`OPENAI_MODELS` と `ZAI_MODELS` は 1 文字も変更しないでください。

**Verify**:
```
grep -n "claude-" src/constants/models.ts
```
→ `claude-opus-5`、`claude-sonnet-5`、`claude-haiku-4-5` の 3 行のみ。日付サフィックス（`-2025...`）を
含む行が残っていないこと。

この時点で `pnpm run typecheck` は**失敗します**（旧シンボルを参照している箇所が残っているため）。
それは想定どおりです。Step 4 以降で解消します。

### Step 4: `src/schemas/provider.ts` の default を更新する

```ts
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: ANTHROPIC_MODELS.CLAUDE_SONNET_5,
    models: ANTHROPIC_MODEL_LIST,
    baseUrl: "https://api.anthropic.com/v1",
  },
```

`label`、`models`、`baseUrl` は変更しません。`openai` / `zai` のブロックも変更しません。

**Verify**: `grep -n "CLAUDE_SONNET_4_5" src/` → 出力なし（exit 1）

### Step 5: テストのシンボル参照を差し替える

`tests/schemas.provider.test.ts`、`tests/ai.settings.test.ts`、`tests/popup.settings_pane.dom.test.ts` の
`ANTHROPIC_MODELS.CLAUDE_SONNET_4_5` を `ANTHROPIC_MODELS.CLAUDE_SONNET_5` に置き換えます。

**これはシンボル名の差し替えだけです。** テストのアサーションの構造・意図を変えないでください。たとえば
`tests/schemas.provider.test.ts:66-68` の「anthropic に `"gpt-4"` を渡すと default になる」というテストは、
期待値が `CLAUDE_SONNET_5` に変わるだけで、検証している振る舞い（未知値 → default フォールバック）は同じです。

`tests/ai.adobter.test.ts` ではなく `tests/ai.adapter.test.ts` の**文字列リテラル**（`model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5"`）は
**変更しないでください**（Out of scope）。

**Verify**:
```
grep -rn "CLAUDE_SONNET_4_5\|CLAUDE_OPUS_4_6" src tests | grep -v "tests/ai.adapter.test.ts"
```
→ 出力なし（exit 1）

```
pnpm run typecheck
```
→ exit 0

### Step 6: モデル一覧を契約として固定するテストを追加する

`tests/schemas.provider.test.ts` に次のテストを追加します。設定画面に表示される選択肢は利用者向けの契約なので、
一覧と default を明示的に固定します（`CLAUDE.md` の「数・順序・version 自体が明示された契約であるときは固定して
よく、その根拠をテスト名またはコメントで示す」に該当）。

既存の `describe` 群と同じ階層に追加してください:

```ts
describe("anthropic provider config", () => {
  // 設定画面に出る選択肢と default は利用者向けの契約なので固定する。
  // モデル世代を更新するときは、この期待値も同じ差分で更新すること。
  it("offers the current Claude generation", () => {
    expect(PROVIDER_CONFIGS.anthropic.models).toEqual([
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-haiku-4-5",
    ]);
  });

  it("defaults to claude-sonnet-5", () => {
    expect(PROVIDER_CONFIGS.anthropic.defaultModel).toBe("claude-sonnet-5");
  });

  it("migrates a stored previous-generation model to the default", () => {
    expect(normalizeAiModel("anthropic", "claude-sonnet-4-5-20250929")).toBe(
      "claude-sonnet-5"
    );
    expect(normalizeAiModel("anthropic", "claude-opus-4-6")).toBe(
      "claude-sonnet-5"
    );
  });
});
```

`PROVIDER_CONFIGS` が既に import されていなければ、ファイル先頭の既存 import 群に追加してください
（Biome が順序を整えます）。

3 番目のテストが特に重要です — **既存ユーザーの保存済み設定が壊れないこと**（クラッシュや空モデルではなく、
現行の default へ移行すること）を実証します。

**Verify**:
```
pnpm exec vitest run --project=node tests/schemas.provider.test.ts
```
→ すべて pass。新規テストが 3 件増えていること。

### Step 6b: Part B-1 — Anthropic adapter が `temperature` を送らないようにする

`src/ai/anthropic-adapter.ts` から `temperature` を載せるブロックを削除します:

```ts
    // temperatureがあれば追加
    if (body.temperature !== undefined) {
      anthropicBody.temperature = body.temperature;
    }
```

削除し、ファイル冒頭の JSDoc（`src/ai/anthropic-adapter.ts:1-9` の「Anthropic APIの特徴」）に理由を 1 行
追記してください:

```
 * - temperature / top_p / top_k は非対応（Claude 4.6 以降で削除。送ると 400）
```

`ChatRequestBody` 型（`src/ai/adapter.ts:14`）から `temperature` を削除しては**いけません** — OpenAI と
z.ai がまだ使っています。Anthropic adapter が受け取っても無視する、という形にします。

**Verify**:
```
grep -n "temperature" src/ai/anthropic-adapter.ts
```
→ JSDoc のコメント行のみがマッチし、`anthropicBody.temperature` への代入が存在しないこと。

### Step 6c: Part B-2 — health check の `max_completion_tokens` を上げる

`src/background/openai.ts:207` を変更します:

```ts
      max_completion_tokens: 1024,
```

同ブロックの `temperature: 0`（`:208`）は**そのまま残します**（OpenAI / z.ai では有効。Anthropic では
Step 6b の adapter が落とします）。`messages` の内容も変更しません。

**Verify**:
```
grep -n "max_completion_tokens: 5" src/background/openai.ts
```
→ マッチなし（exit 1）。かつ `grep -n "max_completion_tokens: 1024" src/background/openai.ts` が 1 件マッチ。

### Step 6d: adapter の互換性をテストで固定する

`tests/ai.adapter.test.ts` の `describe("anthropicAdapter", ...)` ブロック内に追加します。既存の
`it("converts max_completion_tokens to max_tokens", ...)` の書き方（`JSON.parse(init.body as string)` して
ボディを検査する形）に倣ってください:

```ts
    it("omits sampling params rejected by current Claude models", () => {
      // Claude 4.6 以降は temperature / top_p / top_k を受け付けず 400 を返す。
      // 共通呼び出し元（src/background/openai.ts）は temperature を常に載せるため、
      // adapter 側で落とす必要がある。
      const { init } = anthropicAdapter.buildRequest("test-token", {
        model: "claude-sonnet-5",
        messages: [{ role: "user", content: "test" }],
        temperature: 0.2,
      });

      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("top_p");
      expect(body).not.toHaveProperty("top_k");
      expect(body.model).toBe("claude-sonnet-5");
    });
```

**Verify**:
```
pnpm exec vitest run --project=node tests/ai.adapter.test.ts
```
→ すべて pass。新規テストが 1 件増え、既存の `max_tokens` 素通しテスト（`max_completion_tokens: 100` →
`max_tokens: 100`）が引き続き pass すること。

### Step 6e: Anthropic 向けリクエストボディを実際に組んで目視確認する

自動テストは Step 6d でカバーしましたが、health check 経路のボディも実際に確認しておきます。
一時的なスクリプトは書かず、既存のテストランナー経由で確認できる範囲で構いません。少なくとも次を
`grep` で確認してください:

```
grep -rn "temperature" src/ai/
```

**Verify**: `src/ai/openai-compatible-adapter.ts`（OpenAI / z.ai 用の既存ガード）と
`src/ai/adapter.ts`（型定義）にのみマッチし、`src/ai/anthropic-adapter.ts` にはボディへの代入が存在しない
こと。

### Step 7: 設定画面の DOM テストと storybook を確認する

モデル選択 UI は `src/popup/panes/settings/SettingsModelSection.tsx` が `PROVIDER_CONFIGS` から選択肢を
描画しています。UI コードの変更は不要ですが、表示が壊れていないことを確認します:

```
pnpm exec vitest run --project=dom tests/popup.settings_pane.dom.test.ts
pnpm run test:storybook
```

**Verify**: どちらも pass。storybook は 57 tests pass。

### Step 8: full gate を通す

モデル一覧は永続データ（`chrome.storage`）に保存される値の妥当集合を変えるため、full gate を実行します:

```
pnpm exec ultracite fix src/constants/models.ts src/schemas/provider.ts src/ai/anthropic-adapter.ts src/background/openai.ts tests/schemas.provider.test.ts tests/ai.settings.test.ts tests/ai.adapter.test.ts tests/popup.settings_pane.dom.test.ts
mise run ci
```

**Verify**: `✅ RTK CI checks completed` で終了、exit 0。unit test の pass 数が Step 1 の記録 +4
（Step 6 の 3 件 + Step 6d の 1 件）であること。skip 0。

`mise` が使えない環境なら:
```
pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run test:storybook && pnpm run build
```

### Step 9: 実際の Anthropic API に対する手動確認（可能な場合のみ）

Part B が本当に 400 を解消したかは、有効な Anthropic API トークンがないと確認できません。トークンを
用意できる環境なら次を実施し、結果を報告してください:

1. `pnpm run build` の後、`chrome://extensions/` からリポジトリ直下を読み込む。
2. popup の設定で provider を Anthropic にし、API トークンを入力して**トークン検証が成功すること**を確認する（Part B-2 の health check 経路）。
3. 任意のページでテキストを選択し、context menu から要約を実行して**結果が返ること**を確認する（Part B-1 の本処理経路）。
4. Service Worker の DevTools Console にエラーが出ていないことを確認する。

**この手動確認はこのプランの完了条件ではありません。** トークンを用意できない場合は「未実施」と報告して
ください。400 やエラーが出た場合は、その内容（ステータスコードとレスポンスボディ）を報告し、勝手に
`thinking` や `output_config` などのパラメータを追加して回避しようとしないでください。

### Step 10: z.ai の状況を報告する（コードは変更しない）

`ZAI_MODELS`（`glm-5` / `glm-4.7` / `glm-4.6` / `glm-4.5`、default は `glm-4.7`）が現行かどうかは、この
プランでは検証しません。**推測で変更しないでください。**

**Verify**: `git diff -- src/constants/models.ts` に `ZAI_MODELS` の変更が含まれていないこと。
最終報告に「z.ai のモデル一覧は未検証のため据え置いた」と 1 行明記してください。

## Test plan

- **新規テスト**: `tests/schemas.provider.test.ts` に 3 件追加（Step 6）。
  1. Anthropic の選択肢一覧が現行 3 モデルであること（利用者向け契約の固定）。
  2. default が `claude-sonnet-5` であること。
  3. 旧世代の保存値（`claude-sonnet-4-5-20250929`、`claude-opus-4-6`）が現行 default へ移行すること — 既存ユーザーの設定が壊れないことの回帰防止。
- **新規テスト（Part B）**: `tests/ai.adapter.test.ts` に 1 件追加（Step 6d）。Anthropic 向けに組まれた
  リクエストボディに `temperature` / `top_p` / `top_k` が含まれないことを検証します。これが本プランで最も
  重要な回帰防止です — ここが崩れると Anthropic ユーザーの要約・翻訳が全て 400 になり、しかもその故障は
  ネットワークをモックしている他のテストでは検出できません。
- **構造の手本にするテスト**: `tests/schemas.provider.test.ts` の既存 `describe("normalizeAiModel", ...)` ブロック、`tests/openai.schema.test.ts:7` の「一覧を `toEqual` で固定する」パターン、および `tests/ai.adapter.test.ts:38-51` の「OpenAI で GPT-5 のとき temperature が落ちる」テスト（Part B のテストはこれの Anthropic 版です）。
- **既存テストの扱い**: シンボル名の差し替えのみ。アサーションの構造は変えません。特に `tests/ai.adapter.test.ts:124-133` の `max_tokens` 素通しテストは維持してください。構造を変えないと通らないテストが出たら STOP condition です。
- **検証**: `pnpm run test` → 全 pass、pass 数 = Step 1 +4、skip 0。加えて `pnpm run test:storybook` が 57 pass。
- **自動テストで担保できない範囲**: 実際に Anthropic API を叩いて 400 が出ないことは、有効な API トークンなしには検証できません。Step 9 に手動確認の手順を用意しています（任意）。

## Done criteria

すべて満たすこと:

- [ ] `grep -n "claude-" src/constants/models.ts` の出力が `claude-opus-5` / `claude-sonnet-5` / `claude-haiku-4-5` の 3 行のみ
- [ ] `grep -rn "claude-sonnet-4-5\|claude-opus-4-6\|-20250929\|-20251001" src/` がマッチ 0 件
- [ ] `grep -rn "CLAUDE_SONNET_4_5\|CLAUDE_OPUS_4_6" src tests | grep -v "tests/ai.adapter.test.ts"` がマッチ 0 件
- [ ] `PROVIDER_CONFIGS.anthropic.defaultModel` が `claude-sonnet-5`
- [ ] `src/ai/anthropic-adapter.ts` に `anthropicBody.temperature` への代入が存在しない
- [ ] `grep -n "max_completion_tokens: 5" src/background/openai.ts` がマッチ 0 件
- [ ] `tests/ai.adapter.test.ts` に「Anthropic ボディに `temperature` / `top_p` / `top_k` が載らない」テストが存在し pass する
- [ ] `tests/ai.adapter.test.ts:124-133` の `max_tokens` 素通しテストが引き続き pass する
- [ ] `pnpm run typecheck` が exit 0
- [ ] `pnpm run lint` が exit 0
- [ ] `pnpm run test` が exit 0、pass 数 = Step 1 の記録 + 4、skip 0
- [ ] `pnpm run test:storybook` が 57 tests pass
- [ ] `pnpm run build` が exit 0
- [ ] `git diff -- src/constants/models.ts` に `OPENAI_MODELS` / `ZAI_MODELS` / `LEGACY_OPENAI_MODEL_MAP` の変更が含まれていない
- [ ] `git diff -- src/schemas/provider.ts` の変更が `anthropic.defaultModel` の 1 行のみ
- [ ] `git diff -- src/background/openai.ts` の変更が `max_completion_tokens` の 1 行のみ（`temperature: 0.2` の 4 箇所は無変更）
- [ ] `git diff -- src/ai/openai-compatible-adapter.ts` が空
- [ ] `git status` で In scope 以外のファイルが変更されていない
- [ ] Step 9 の手動確認の実施可否（および実施した場合の結果）を報告済み
- [ ] 最終報告に「z.ai は未検証のため据え置き」を明記済み
- [ ] `plans/README.md` の 018 の Status を更新済み

## STOP conditions

以下に該当したら停止して報告してください:

- Step 2 で、「Current state」に列挙していないファイルがモデル定数を参照しており、その扱いを判断できない。
- 既存テストのアサーション**構造**を変えないと通らない（シンボル名の差し替えだけでは通らない）。
- 通すために `normalizeAiModel` の実装を変える必要があるように見える。
- 通すために `manifest.json`、`src/constants/api-endpoints.ts`、`src/ai/adapter.ts` の `ChatRequestBody` 型、`src/ai/openai-compatible-adapter.ts` を変える必要があるように見える。
- `src/ai/anthropic-adapter.ts` から `temperature` を落とすと既存テストが失敗する（想定では Anthropic の temperature を検証しているテストは存在しません）。
- Part A だけ、または Part B だけをマージしたくなった。**両方セットでなければマージしないでください**（Part A 単独は 400 を招き、Part B 単独は無意味です）。
- Step 9 の手動確認で 400 やエラーが出た。`thinking` / `output_config` / `effort` などのパラメータを追加して回避しようとせず、レスポンス内容を報告して停止してください。
- `pnpm run test:storybook` が Step 7 で失敗する（モデル一覧の変更が UI スナップショットを壊している可能性。出力を報告してください）。
- ステップの検証が、合理的な修正を 1 度試した後もなお失敗する。
- **モデル ID を推測したくなった場合**（「他にも Claude のモデルがあるはずだ」と思った場合）。このプランで指定した 3 つ以外を追加しないでください。

## Maintenance notes

将来この周辺を触る人向け:

- **モデル世代を更新する手順**: `src/constants/models.ts` の該当プロバイダの定数を書き換え、`src/schemas/provider.ts` の `defaultModel` を確認し、`tests/schemas.provider.test.ts` の一覧固定テストの期待値を同じ差分で更新します。3 箇所セットで動かすものだと考えてください。
- **モデル ID にはエイリアス（日付サフィックスなし）を使ってください。** 日付付きの完全 ID は特定スナップショットに固定したいときだけの手段で、通常運用では不要です。
- **旧モデルを一覧から外すと、その値を保存していたユーザーは default に移行します。** これは `normalizeAiModel` の既存挙動で、Step 6 のテストが固定しています。特定の旧モデルを「default ではなく対応する新モデル」へ移行させたい場合は、`normalizeAiModel` に Anthropic 用の読み替えマップ分岐を追加する必要があります — それは挙動変更なので別プランとして扱ってください（OpenAI 側の `LEGACY_OPENAI_MODEL_MAP` が参考実装になります。plan 017 でそのマップは `src/constants/models.ts` に集約されます）。
- **モデル世代を上げるときは、必ずそのモデルが受け付けるリクエストパラメータも確認してください。** 今回 Claude 5 系は `temperature` / `top_p` / `top_k` を拒否するため、ID の差し替えだけでは全リクエストが 400 になる状態でした。この種の非互換は typecheck / lint / vitest では検出できません（ネットワークをモックしているため）。adapter が送るボディを `tests/ai.adapter.test.ts` で固定してあるのが唯一の防波堤です。
- **Anthropic adapter は `thinking` を送っていません**（既定の adaptive thinking のまま）。`max_tokens` は thinking と応答テキストの合計上限なので、将来 `max_completion_tokens` を小さくする変更を入れると応答が空になりえます。health check を `1024` にしたのはこのためです。
- **レビューで注視すべき点**: (a) `ZAI_MODELS` / `OPENAI_MODELS` が無変更であること、(b) `defaultModel` 以外の `PROVIDER_CONFIGS` フィールドが無変更であること、(c) 旧世代の保存値が現行 default へ移行するテストが存在すること、(d) Anthropic ボディから `temperature` が消えていること、(e) `src/background/openai.ts` の diff が 1 行だけであること。
- **意図的に先送りした follow-up**:
  1. **z.ai（GLM）のモデル一覧の鮮度確認** — 一次情報が確認できなかったため据え置きました。メンテナが z.ai の現行モデルを確認したうえで、同じ手順で更新してください。
  2. **Anthropic 用 legacy 読み替えマップ** — 上記のとおり挙動変更を伴うため別作業。
  3. `tests/ai.adapter.test.ts` の `model: "ANTHROPIC_MODELS.CLAUDE_SONNET_4_5"` という文字列リテラル（置換ミスの残骸）。テストの検証内容には影響しませんが、いずれ普通のダミー ID（`"test-model"` など）に直すと読みやすくなります。
