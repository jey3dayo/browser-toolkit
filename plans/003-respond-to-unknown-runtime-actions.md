# Plan 003: 未知の runtime action に対して即座に失敗応答を返す

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8ec023e..HEAD -- src/background/runtime.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `8ec023e`, 2026-07-12

## Why this matters

`chrome.runtime.onMessage` リスナーで `return true` は「非同期で応答する」という宣言だが、現在の実装は **handler が見つからない場合に `sendResponse` を一度も呼ばずに `true` を返す**。その結果、promise 化された `sendMessage` の呼び出し元（popup / content script）はポートが閉じるまでハングし、action 名の typo や拡張のバージョン差異（更新直後の service worker と旧 content script の共存）が、原因の分からない汎用 disconnect エラーとして現れる。未知 action には同期的に構造化された失敗を返し、静かな劣化を明示的なエラーに変える。

## Current state

- `src/background/runtime.ts`（全 23 行）:
  ```ts
  export function registerRuntimeMessageHandlers(): void {
    chrome.runtime.onMessage.addListener(
      (
        request: RuntimeRequest,
        _sender: chrome.runtime.MessageSender,
        sendResponse: RuntimeSendResponse,
      ) => {
        const handler =
          runtimeHandlers[request.action as keyof typeof runtimeHandlers];
        if (!handler) {
          return true; // ← 応答しないまま「非同期応答あり」を宣言している
        }
        return handler(request as never, sendResponse);
      },
    );
  }
  ```
- 応答の規約: 各 handler は `@praha/byethrow` の `Result` を `sendResponse` に渡す。失敗例は `src/background/runtime_handlers.ts` の `sendResponse(Result.fail(...))`（例: 283-289行）を手本にする。
- UI 文言は `src/i18n/resources.ts` の `t()` キーで解決する規約。既存キー `background.runtime.actionFailed` が近い用途で存在する（`runtime_handlers.ts:256`）。この応答はユーザー向け表示に直結しない開発者向けエラーだが、既存 handler の流儀に合わせ i18n キーを使うか、`Unknown action: <action>` の固定文字列にするかは、**既存キーを流用しつつ action 名を含めない**形が最小: `Result.fail(t("background.runtime.actionFailed"))` でも可。ただしデバッグ性のため新規キー追加が望ましい（下記 Step 1）。
- テストの手本: `tests/popup.runtime.dom.test.ts` や `tests/background.context_menu_builder.test.ts` の chrome モックパターン。

## Commands you will need

| Purpose     | Command                                     | Expected on success |
| ----------- | ------------------------------------------- | ------------------- |
| Typecheck   | `pnpm typecheck`                            | exit 0              |
| Tests       | `pnpm test`                                 | all pass            |
| i18n test   | `pnpm test:unit:node -- tests/i18n.test.ts` | all pass            |
| Lint/Format | `pnpm format && pnpm lint`                  | exit 0              |

## Scope

**In scope** (the only files you should modify):

- `src/background/runtime.ts`
- `src/i18n/resources.ts`（新規キー 1 件のみ）
- `tests/background.runtime_unknown_action.test.ts`（新規作成）

**Out of scope** (do NOT touch, even though they look related):

- `src/background/runtime_handlers.ts` — 各 handler の応答挙動は正しい。
- `src/content/` 側のメッセージリスナー — 別経路であり今回の対象外。
- `RuntimeRequest` 型の見直しや action の網羅性チェック（exhaustiveness）導入 — 価値はあるがスコープ外。

## Git workflow

- Branch: `advisor/003-respond-to-unknown-runtime-actions`
- Conventional Commits（例: `fix(background): respond with failure for unknown runtime actions`）
- push / PR は指示がない限り行わない。

## Steps

### Step 1: i18n キーを追加

`src/i18n/resources.ts` の `background.runtime` 配下に、既存キー（`actionFailed`、`tokenTestFailed` 等）と同じ形式で `unknownAction`（日本語文言例: 「不明なアクションです」）を追加する。ja がプライマリの構造に倣うこと（ファイル内の既存 `background.runtime.*` の並びを確認して同じ場所に置く）。

**Verify**: `pnpm test:unit:node -- tests/i18n.test.ts` → all pass（リソース整合性テストが通る）。

### Step 2: 未知 action への応答

`src/background/runtime.ts` の `if (!handler)` 分岐を変更:

```ts
if (!handler) {
  sendResponse(Result.fail(t("background.runtime.unknownAction")));
  return false;
}
```

必要な import（`Result` は `@praha/byethrow`、`t` は既存 handler ファイルと同じ import 元 — `src/background/runtime_handlers.ts` の import を確認して同じパスを使う）を追加する。同期応答なので戻り値は `false`。

**Verify**: `pnpm typecheck` → exit 0。

### Step 3: テスト追加

新規 `tests/background.runtime_unknown_action.test.ts`（`tests/background.context_menu_builder.test.ts` のモック構造を手本に）:

1. `chrome.runtime.onMessage.addListener` をモックし、`registerRuntimeMessageHandlers()` で登録されたリスナーを取得。
2. `{ action: "definitelyNotARealAction" }` で呼び出し、(a) `sendResponse` が同期的に 1 回呼ばれ、渡された値が `Result.isFailure` で真、(b) リスナーの戻り値が `false` であることを検証。
3. 既知 action（例: 任意の実在 handler）では従来どおり handler へ委譲されることの回帰テスト。

**Verify**: `pnpm test:unit:node -- tests/background.runtime_unknown_action.test.ts` → all pass。

### Step 4: 全体確認

**Verify**: `pnpm test` → all pass、`pnpm format && pnpm lint` → exit 0。

## Test plan

Step 3 の 3 ケース（未知 action の同期失敗応答、戻り値 `false`、既知 action の委譲回帰）。

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0（新規テストファイル含む）
- [ ] `src/background/runtime.ts` に「`sendResponse` を呼ばない `return true`」経路が存在しない
- [ ] `git status` で in-scope 3 ファイル以外に変更なし
- [ ] `plans/README.md` の status 行を更新

## STOP conditions

- Drift check 不一致。
- 呼び出し元のどこかが「未知 action = 応答なし」を意図的に利用している証拠が見つかった場合（`rg -n "sendMessage" src/ | rg -v test` の呼び出し元にタイムアウト前提のコードがある等）— 報告して判断を仰ぐ。
- i18n リソースの構造が想定（`background.runtime.*` ネスト）と異なる場合。

## Maintenance notes

- 今後 action を追加するときは `runtimeHandlers` への登録漏れがこの失敗応答で即座に可視化される。レビューでは新規 action の登録と型の同期を確認すること。
- `RuntimeRequest` union と `runtimeHandlers` のキーの網羅性チェック（コンパイル時）は有益なフォローアップだが本プランでは意図的に見送り。
