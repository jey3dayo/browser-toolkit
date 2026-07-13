# Plan 002: API トークンが debug ログ・コンソール・エクスポートに平文で出ないようにする

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8ec023e..HEAD -- src/background/runtime_handlers.ts src/utils/debug_log.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- Priority: P1
- Effort: S
- Risk: LOW
- Depends on: none
- Category: security
- Planned at: commit `8ec023e`, 2026-07-12

## Why this matters

ポップアップの「トークンをテスト」機能が例外で失敗すると、background の `handleTestAiTokenRequest` が **リクエスト全体（生の API トークンを含む）を `debugLog` に渡す**。`debugLog` はレベルを問わず必ず `console.*` に data ごと出力し、debugMode が ON なら `chrome.storage.local` の `debugLogs` に永続化、さらに `downloadDebugLogs` でユーザーがサポート用に共有しうる `.log` ファイルへ JSON のまま書き出す。つまり一時的なネットワークエラー 1 回で、トークンが「local のみ保存」というプロジェクトのセキュリティ方針（`.claude/rules/security.md`）の外へ漏れる。呼び出し箇所の修正に加え、`debugLog` 側に共有の redaction を入れて再発を構造的に防ぐ。

## Current state

- `src/background/runtime_handlers.ts:264-293` — 問題の呼び出し:
  ```ts
  } catch (error) {
    await debugLog(
      "handleTestAiTokenRequest",
      "Failed to test AI token",
      { error, request },   // request.token = 生の API キー
      "error"
    );
  ```
  `request.token` はポップアップ `src/popup/panes/settings/useSettingsState.ts:160-166` で入力値から渡される（`{ action: "testAiToken", token: tokenOverride }`）。
- `src/utils/debug_log.ts`:
  - `formatConsoleMessage` (27-33行): `entry.data` を `safeStringify` してコンソール文字列に含める。
  - `debugLog` (38-122行): コンソール出力は「常に実行」（62行のコメント通り）。debugMode ON なら `chrome.storage.local` の `DEBUG_LOG_KEY` 配下へ `logEntry`（data 含む）を保存。
  - `downloadDebugLogs` (180-200行): `log.data` を `JSON.stringify(log.data, null, 2)` でファイル内容に展開し `chrome.downloads.download` する。
- 規約: TypeScript strict、`any` 禁止。テストは `tests/utils.debug_log.test.ts` が既存（構造の手本にする）。フォーマットは Ultracite。
- 注意: `.claude/rules/security.md` の方針「機密情報をコンソールログに出力しない」。

## Commands you will need

| Purpose     | Command                                                | Expected on success |
| ----------- | ------------------------------------------------------ | ------------------- |
| Typecheck   | `pnpm typecheck`                                       | exit 0              |
| Tests       | `pnpm test:unit:node -- tests/utils.debug_log.test.ts` | all pass            |
| All tests   | `pnpm test`                                            | all pass            |
| Lint/Format | `pnpm format && pnpm lint`                             | exit 0              |

## Scope

#### In scope (the only files you should modify)

- `src/utils/debug_log.ts`
- `src/background/runtime_handlers.ts`
- `tests/utils.debug_log.test.ts`

#### Out of scope (do NOT touch, even though they look related)

- `src/popup/panes/settings/useSettingsState.ts` — トークンの送信自体は正当（テストに必要）。
- トークンの保存経路（`storage.local`）の変更 — 既に正しい。
- debugLog の呼び出し元の全数書き換え — redactor を debug_log.ts 内に置くことで呼び出し元の変更は runtime_handlers.ts の 1 箇所に限定する。

## Git workflow

- Branch: `advisor/002-redact-api-token-in-debug-logs`
- Conventional Commits（例: `fix(security): redact sensitive fields in debug logs`）
- push / PR は指示がない限り行わない。

## Steps

### Step 1: debug_log.ts に共有 redactor を追加

`src/utils/debug_log.ts` に module-scope の純関数を追加する:

```ts
const SENSITIVE_KEY_PATTERN =
  /token|apikey|api_key|authorization|secret|password/i;

function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveData);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) =>
        SENSITIVE_KEY_PATTERN.test(key)
          ? [
              key,
              typeof v === "string"
                ? `[REDACTED len=${v.length}]`
                : "[REDACTED]",
            ]
          : [key, redactSensitiveData(v)],
      ),
    );
  }
  return value;
}
```

`debugLog` 内で `logEntry` を作る際に `data: redactSensitiveData(data)` を適用する（コンソール・storage 保存・ダウンロードのすべてが `logEntry.data` 経由なので一点で塞がる）。`Error` インスタンスは object 扱いだが列挙可能プロパティが少ないため既存の `safeStringify` 挙動を壊さないこと（既存テストが緑のままであることを確認）。

Verify: `pnpm typecheck` → exit 0。

### Step 2: runtime_handlers.ts の呼び出しからトークンを外す

`handleTestAiTokenRequest` の `debugLog(..., { error, request }, "error")` を、トークン本体を含まない形へ変更:

```ts
{ error, action: request.action, hasToken: typeof request.token === "string" }
```

（redactor は防御第二層。第一層としてそもそも渡さない。）

Verify: `rg -n "request \}" src/background/runtime_handlers.ts` で `handleTestAiTokenRequest` 内のマッチが消えている。

### Step 3: テスト追加

`tests/utils.debug_log.test.ts` に追加（既存テストのモックパターンに倣う）:

1. `debugLog("ctx", "msg", { token: "sk-dummy-value-000" }, "error")` 後、console 出力文字列・storage 保存内容の両方に `sk-dummy-value-000` が含まれず `[REDACTED` が含まれる。
2. ネストしたオブジェクト（`{ request: { token: "..." } }`）でも redact される。
3. 機微でないフィールド（`{ url: "https://example.com" }`）はそのまま残る。

Verify: `pnpm test:unit:node -- tests/utils.debug_log.test.ts` → all pass（新規 3 本含む）。

### Step 4: 全体確認

Verify: `pnpm test` → all pass、`pnpm format && pnpm lint` → exit 0。

## Test plan

上記 Step 3 の 3 ケース。手本: `tests/utils.debug_log.test.ts` の既存 describe/mock 構造。テスト内のダミートークンは明らかに偽の値（`sk-dummy-...`）のみ使用し、実トークンをテストに書かない。

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0（redaction テスト 3 本を含む）
- [ ] `handleTestAiTokenRequest` の debugLog 呼び出しに `request` オブジェクト全体が渡っていない
- [ ] `git status` で in-scope 3 ファイル以外に変更なし
- [ ] `plans/README.md` の status 行を更新

## STOP conditions

- Drift check 不一致。
- redactor 適用で既存の `tests/utils.debug_log.test.ts` が壊れ、2 回の修正試行で直らない（`safeStringify` との相互作用に想定外がある可能性）。
- `debugLog` に `request` を丸ごと渡す**別の**呼び出し元が `rg -n "debugLog\(" src/ | rg request` で見つかり、token 系フィールドを含む場合 — その一覧を報告して指示を仰ぐ（勝手にスコープ拡大しない）。

## Maintenance notes

- 以後、`debugLog` へ渡す data はハンドラー側で最小化するのが第一原則。redactor はセーフティネットであり、キー名ベースなので値だけがトークンのケース（例: 文字列を直接渡す）は防げない — レビュー観点として残す。
- ユーザーが過去に debug ログをエクスポート・共有した可能性がある場合、該当プロバイダーの API キーのローテーションを README 等で案内するか検討（本プランのスコープ外、人間判断）。
