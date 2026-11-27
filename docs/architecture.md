---
type: reference
title: Browser Toolkit アーキテクチャ
description: Chrome Extension Manifest V3 としての Browser Toolkit の設計原則、ランタイム境界、主要コンポーネントを説明する。
resource: urn:browser-toolkit:docs:architecture
tags:
  - category/architecture
  - audience/developer
timestamp: 2026-11-27
audience: developer
owner: browser-toolkit
---

# Browser Toolkit アーキテクチャ

Browser Toolkit の設計原則、ランタイム境界、主要コンポーネントの構成をまとめています。

## 目次

- [全体アーキテクチャ](#全体アーキテクチャ)
- [ランタイム境界](#ランタイム境界)
- [ID 生成システム](#id-生成システム)
- [AI 統一インターフェース](#ai-統一インターフェース)
- [エラーハンドリング](#エラーハンドリング)
- [ストレージ書き込みとクォータフォールバック](#ストレージ書き込みとクォータフォールバック)
- [ストレージマイグレーション運用](#ストレージマイグレーション運用)
- [設計原則](#設計原則)

## 全体アーキテクチャ

Browser Toolkit は、Chrome Extension（Manifest V3）として構築した個人用のブラウザユーティリティ集です。

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│                    (Manifest V3)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Background  │  │   Content    │  │ Popup / Options  │ │
│  │    Worker    │  │    Script    │  │       UI         │ │
│  │ (Service     │  │  (Page DOM)  │  │     (React)      │ │
│  │  Worker)     │  │              │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
│        │                  │                    │            │
│        │    chrome.       │    chrome.         │            │
│        │   runtime.       │   runtime.         │            │
│        │  sendMessage     │  sendMessage       │            │
│        │                  │                    │            │
│        └──────────────────┼────────────────────┘            │
│                           │                                 │
│                 ┌─────────▼──────────┐                      │
│                 │  Message Passing   │                      │
│                 │   (Type-safe)      │                      │
│                 └────────────────────┘                      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Search Blocklist (Content Script #2)             │      │
│  │  (src/search-blocklist.ts, document_start, no UI) │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Image Zoom (Content Script #3)                   │      │
│  │  (src/image-zoom.ts, x.com / twitter.com only)    │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Focus Override (Dynamic Content Script)          │      │
│  │  (src/focus-override.ts, registered per pattern)  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## ランタイム境界

Browser Toolkit には独立した実行環境（ランタイム境界）があり、それぞれ異なる責務を担います。

### 1. Background Worker (`src/background.ts`)

**役割**: 特権 API へのアクセスと、ページ間で共有される状態の管理

- 主な機能:
  - コンテキストメニューの管理（`chrome.contextMenus`）
  - OpenAI / ChatGPT プラン / Anthropic / z.ai 向け API リクエストの送信（`fetch`）
  - ChatGPT プランの OAuth サインイン・リフレッシュ・サインアウト
  - ストレージ管理（`chrome.storage.sync`、`chrome.storage.local`）とマイグレーション実行
  - フォーカス維持スクリプトの動的登録（`src/background/focus_override_registration.ts`）
  - メッセージハンドリング（`chrome.runtime.onMessage`）と元画像ダウンロードの URL 検証
- API へのアクセス範囲:
  - 利用可能: `chrome.contextMenus`、`chrome.storage`、`chrome.tabs`、`chrome.scripting`、`chrome.downloads`、CORS 制限のない `fetch`
  - 利用不可: Web ページの DOM

### 2. Content Script (`src/content.ts`)

**役割**: 全ページ共通の DOM 操作と、ユーザー操作の検出

- 主な機能:
  - テーブルソート機能の注入と `MutationObserver` による動的テーブル検出
  - オーバーレイ UI（Context Actions の結果表示、フォローアップ質問、QR コード表示）
  - 選択テキストの取得と一時キャッシュ、テンプレートのプレーンテキスト貼り付け
  - Google 検索ページでの検索結果ブロックリスト UI（`src/content/search-blocklist-ui/`）の遅延ロード

テーブル機能の有効化と監視のライフサイクルは `src/content/table-auto-exec.ts` が管理します。`setupTableAutoExec` が返す `enable()` は既存テーブルへの適用と動的テーブルの監視を重複なく開始します。手動実行の呼び出し側はこの 1 操作だけを使い、URL 設定に基づく自動実行、タブの表示状態の変化、`pagehide` 時の監視停止は同モジュール内に閉じています。`table-observer.ts` の監視終了関数は `MutationObserver` と未実行のデバウンスタイマーをまとめて停止し、ソートや行フィルタリングの DOM 処理自体は `table-sort.ts` に残しています。

- API へのアクセス範囲:
  - 利用可能: ページ DOM の読み書き、Shadow DOM（スタイル隔離）、`chrome.runtime.sendMessage`
  - 利用不可: `chrome.contextMenus`、CORS 制限のない `fetch`

### 3. Popup UI (`src/popup.ts`) と Options UI (`src/options.ts`)

**役割**: 日常操作（ポップアップ）と管理操作（オプションページ）のユーザーインターフェース

どちらも `src/popup/App.tsx` の `PopupApp` を `surface` prop 付きで描画し、`src/popup/bootstrap.ts` で共通の初期化（テーマ、スタイル、React root の構築）を行います。`src/popup/panes.ts` の `getPaneSurface` が各ペインの所属先（`popup` または `options`）を決め、`canSurfaceRender` がその画面で描画できるかを判定します。

ポップアップは日常操作の 5 ペイン（アクション、カレンダー、リンク作成、検索ブロック、サイト別機能）を描画し、オプションページは管理系の 5 ペイン（検索エンジン、まとめて検索、テンプレート、履歴、設定）を加えた全 10 ペインを描画します。ポップアップ側で描画できないペインのハッシュが渡された場合は既定ペイン（`pane-actions`）へフォールバックします（オプションページ側は全ペインを受け付けるため `options.html#pane-actions` も有効です）。ポップアップから管理系ペインへ移るときは、`PopupRuntime.openOptionsPane` が `options.html#<pane>` を別タブで開いてポップアップを閉じます。

- API へのアクセス範囲:
  - 利用可能: `chrome.runtime.sendMessage`、`chrome.storage`、`chrome.tabs`（限定的）
  - 利用不可: ページ DOM への直接アクセス

### 4. Search Blocklist Content Script (`src/search-blocklist.ts`)

**役割**: Google 検索結果ページでのブロック判定と非表示処理

`content_scripts` の 2 本目のエントリとして `document_start` で注入されます。既存の `content.ts` は `document_idle` で読み込み、`src/content/table-observer.ts` が `document.body` を監視する前提になっているため `document_start` へ移せません。その制約を避けるため、このエントリを分離しています。

バンドルに React は含めません。esbuild の設定（`scripts/bundle.mjs`）が `format: "iife"` で code splitting に対応していないため、UI コンポーネントをここに混ぜると Google 検索を開くたびに React が余分にパースされます。判定・非表示・状態管理だけをこのエントリに置き、浮動ボタン・ダイアログ・件数バーの UI は `src/content/search-blocklist-ui/` として既存の `content.js` 側から遅延ロードしています。

- API へのアクセス範囲:
  - 利用可能: ページ DOM の読み書き（対象検索ページのみ）、`chrome.storage.local`
  - 利用不可: `chrome.contextMenus`、CORS 制限のない `fetch`

### 5. Image Zoom Content Script (`src/image-zoom.ts`)

**役割**: X（`x.com` / `twitter.com`）の写真表示でのズーム表示と元画像のダウンロード

`content_scripts` の 3 本目のエントリとして、X に限定して既定の `document_idle` で注入されます。X の写真表示（`/status/<id>/photo/<n>`）で画像をクリックすると、Shadow DOM の全画面ビューアが開きます。ビューア本体はサイト非依存のモジュールとして `src/image-zoom/` に配置し、対象画像の判定や元画像 URL への変換は X 専用アダプターに切り出しています。

画像のダウンロードはコンテンツスクリプトから `downloadImage` メッセージで background へ依頼します。URL はページ側から操作され得るため、background 側で `https://pbs.twimg.com/media/` のみを許可し、ファイル名もメディア ID と許可リストの拡張子から組み立てます。

X の全ページ読み込み時に注入されるためパース負荷を抑える必要があり、`dist/image-zoom.js` に含まれるモジュールでは `@/i18n`（i18next）、`@/ui/styles`（全コンポーネント CSS）、`@/content/*` の import を禁止しています。代わりに `@/i18n/lite` と `@/ui/styles-tokens` を使用します。`src/image-zoom/download-url.ts` は background と共有しており、background 側では `@/i18n` を使いますが、image-zoom 側（`src/image-zoom/download-request.ts`）はそこから型 `DownloadImagePayload` だけを `import type` することで境界を維持しています。この制約は `tests/build/image_zoom_bundle.test.ts` が metafile の入力一覧を denylist で検証し、minify 後 90KB 以下のサイズ上限とあわせて自動でチェックしています。

### 6. Focus Override Script (`src/focus-override.ts`)

**役割**: 登録された URL パターンのタブを、非アクティブ時でも表示中として扱わせるスクリプト

`src/background/focus_override_registration.ts` が登録済みパターンに応じて `chrome.scripting` 経由で動的に登録します。check-then-act 競合を避けるため、登録・解除処理は Promise キューで直列化しています。

### メッセージパッシング

ランタイム間の通信は、Union 型（`src/background/runtime_types.ts`）で定義した型安全なメッセージパッシングで行います。

```typescript
// src/background/runtime_types.ts
type RuntimeRequest =
  | { action: "testAiToken"; token?: string }
  | { action: "summarizeEvent"; target: SummaryTarget }
  | { action: "openPopupPane"; paneId: string };

// 送信側（Content Script）
chrome.runtime.sendMessage(
  { action: "summarizeEvent", target: { text, source, title, url } },
  (response) => {
    /* 結果処理 */
  },
);

// 受信側（Background Worker）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarizeEvent") {
    handleSummarizeEventRequest(request, sendResponse);
    return true; // 非同期レスポンス
  }
});
```

- すべてのメッセージ形式を Union 型で定義し、未知の action には即座に失敗応答を返す
- 非同期応答を行うリスナーは `return true` を返し、メッセージチャネルを閉じないようにする

## ID 生成システム

検索エンジングループやテキストテンプレートなど、ユーザーが作成する項目には `src/utils/id_generator.ts` の `generateId(name, prefix)` で一意な ID を付与しています。

- 形式: `{prefix}:{slug}-{hash}`（非 ASCII 文字のみで slug が空になる場合は `{prefix}:{hash}`）
- 特徴:
  - 同じ名前から常に同じ ID を返す（べき等）
  - ASCII 名から可読な slug を残しつつ、32bit ハッシュの先頭 8 桁で衝突を避ける
  - UTF-16 のコード単位で計算し、日本語など非 ASCII 文字にも対応する

```typescript
generateId("日用品系", "group"); // → "group:<8桁ハッシュ>"
generateId("Shopping", "group"); // → "group:shopping-<8桁ハッシュ>"
generateId("LGTM", "template");  // → "template:lgtm-0023a134"
```

## AI 統一インターフェース

Browser Toolkit は 4 つの AI プロバイダー（OpenAI、ChatGPT プラン、Anthropic、z.ai）に対応しています。

ChatGPT プラン（プロバイダー ID `chatgpt`）だけは API キーではなく [Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source) の OAuth 認証を使い、Chat Completions API ではなく Responses API（`store: false` / `stream: true` 必須）へリクエストを送信します。

### 処理の流れ

```
prepareAiInput()   設定読み込み・20,000 文字クリップ・メタ情報構築
       │
       ▼
requestAiText()    プロバイダーに依存しない実行フロー
       │
       ▼
ai_credentials.ts  送信経路の振り分け
       ├── API キー系 ──▶ getAdapter(provider)
       │                     ├── OpenAI Adapter
       │                     ├── Anthropic Adapter
       │                     └── z.ai Adapter
       └── chatgpt ─────▶ chatgpt_session + Responses API (SSE)
```

### Context Actions の実行フロー

`src/background/action_executor.ts` の `executeContextAction({ action, target })` が、解決済みの対象テキストに対する `text` / `event` アクションの実行を担当します。プロンプトの検証、イベント抽出用の追加指示テンプレート、プロバイダー呼び出し、イベント結果の表示用整形をここに集約し、`Result<ContextActionOutput, string>` を返します。成功時は共通の `text`・`source`・`kind` を持ち、`kind: "event"` の場合のみ構造化された `event` も含みます。

対象テキストの解決、通知、ランタイム間メッセージのペイロード整形は呼び出し側が担当します。ランタイムのイベント応答は `eventText` のみを返し、右クリックからの直接実行では構造化された `event` もオーバーレイへ渡します。専用のカレンダー登録経路とプロバイダーアダプターはそれぞれ独立した構成を保っています。

### 型定義

```typescript
// src/background/ai_input.ts
export type PreparedAiInput = {
  settings: AiSettings; // プロバイダー、モデル、トークン、追加指示
  clippedText: string;  // 20,000 文字に制限されたテキスト
  meta: string;         // タイトル、URL 情報
};

// src/ai/settings.ts
export type AiSettings =
  | (AiSettingsCommon & { provider: ApiKeyProvider; token: string }) // "openai" | "anthropic" | "zai"
  | (AiSettingsCommon & { provider: "chatgpt" }); // トークンは送信直前に非同期で解決する
```

### AI リクエストまわりのモジュール責務

- `src/background/ai_requests.ts`: 要約・イベント抽出・会話など、プロバイダーに依存しない実行フロー
- `src/background/ai_input.ts`: 入力テキストの整形と設定の読み込み
- `src/background/ai_credentials.ts`: プロバイダーごとの送信経路の振り分け。API キー系プロバイダーはアダプター経由、`chatgpt` はアクセストークンを解決して Responses API へ送り、401 応答時は 1 回だけリフレッシュして再送する
- `src/ai/chat-completion-client.ts`: アダプター経由の HTTP 送信、許可オリジンの検証、タイムアウト、JSON パースと `Result` 変換
- `src/ai/openai-compatible-adapter.ts`: Chat Completions 互換の通信形式（Bearer 認証 / POST / `choices` / エラー抽出）のみ
- `src/ai/openai-adapter.ts` / `zai-adapter.ts`: 各プロバイダーの設定と送信前処理の組み立て
- `src/ai/openai-request-policy.ts`: OpenAI 固有のパラメータ制約（UI のモデル選択肢とは独立して管理）
- `src/ai/anthropic-adapter.ts`: Anthropic Messages API 向けの形式変換（Claude 5 系との互換性のため `temperature` は送信しない）
- `src/ai/chatgpt/oauth.ts`: Sign in with ChatGPT（SIWC）の認可 URL 生成、コールバック解析、トークン応答および ID トークンクレームの検証（純粋関数）
- `src/ai/chatgpt/responses.ts`: Chat 形式から Responses 形式への変換、`response.completed` までの SSE 読み取り、SIWC 固有エラーのメッセージ化
- `src/background/chatgpt_session.ts`: サインイン・リフレッシュ・サインアウト（トークン失効）。リフレッシュトークンが回転する仕様のため、リフレッシュ処理は直列化する

#### ChatGPT プランのサインイン経路

SIWC はリダイレクト URI にループバック（`http://127.0.0.1:1455/auth/callback`）しか許可せず、Chrome 拡張機能側でそのポートを待ち受けることはできません。そのため、background が認可タブを開き、`chrome.tabs.onUpdated` で遷移先のタブ URL を読み取って認可コードを取得します。

タブを開いた時点でポップアップは閉じるため、PKCE・state・nonce は `chrome.storage.session` の `chatgptSignIn` に一時保存します。サインイン完了は `chrome.notifications` で通知し、ポップアップの表示は `storage.onChanged` で追従させます。

認証情報、発行済みのクライアント ID と登録時アカウント（`sub`）、および host ID は `chrome.storage.local` に保存し、`sync` には置きません。別アカウントでサインインし直された場合は既存トークンを失効させて再登録します。端末ごとに異なる host ID を使う必要があり、回転するリフレッシュトークンを複数端末で共有すると失効してしまうためです。ID トークンの署名検証は行わず、TLS 経由でトークンエンドポイントから直接受け取る経路に限定して `iss`・`aud`・`exp`・`nonce` とスコープを照合します。

`src/constants/models.ts` の選択肢にモデルを追加しても、リクエスト時のパラメータ制約は自動では切り替わりません。`src/ai/openai-request-policy.ts` では `gpt-6-luna`・`gpt-6.1-sol` と `gpt-5*` で `temperature` を省略し、その他のモデル文字列はそのまま送信します。z.ai には OpenAI 固有の送信制約を適用しません。

### プロバイダー別アダプター

```typescript
// src/ai/get-adapter.ts
export function getAdapter(provider: ApiKeyProvider): ChatCompletionAdapter {
  switch (provider) {
    case "openai":
      return openaiAdapter;
    case "anthropic":
      return anthropicAdapter;
    case "zai":
      return zaiAdapter;
  }
}

// 各アダプターが実装する共通インターフェース
export type ChatCompletionAdapter = {
  buildRequest: (token: string, body: ChatRequestBody) => {
    url: string;
    init: RequestInit;
  };
  extractText: (json: unknown) => string | null;
  extractError: (json: unknown, status: number) => string;
};
```

## エラーハンドリング

Browser Toolkit では、`@praha/byethrow` の `Result` / `ResultAsync` 型でエラーハンドリングを統一しています。

- 内部関数では例外を握りつぶさず `Result.succeed(value)` / `Result.fail(error)` を返す
- 呼び出し側では `Result.isFailure(result)` で分岐し、エラーをそのまま上位へ伝播する
- ランタイム間のメッセージ境界でも `Result` 形式のまま応答し、UI 側で一貫して扱えるようにする

```typescript
// src/background/ai_input.ts
export async function prepareAiInput(params: {
  target: SummaryTarget;
  missingTextMessage: string;
  includeMissingMeta?: boolean;
}): Promise<Result.Result<PreparedAiInput, string>> {
  const settingsResult = loadAiSettings(storage);
  if (Result.isFailure(settingsResult)) {
    return Result.fail(settingsResult.error);
  }

  const clippedText = clipInputText(params.target.text);
  if (!clippedText) {
    return Result.fail(params.missingTextMessage);
  }

  return Result.succeed({ settings, clippedText, meta });
}
```

## ストレージ書き込みとクォータフォールバック

`storageSyncSet`（`src/background/storage.ts`）は保存前に `checkStorageQuota` を実行します。1 キーあたりの容量上限（`QUOTA_BYTES_PER_ITEM` = 8KB）を超えるキーが見つかった場合は、そのキーを `chrome.storage.local` へ退避し、予約キー `__storage_fallback_keys__` に記録したうえで警告ログと通知を出します。`sync` が上限に達しても保存自体は失敗しませんが、**退避したキーはデバイス間で同期されなくなります**。

増え続ける配列データを `sync` に置くと、上限到達時に意図せずローカル退避へ切り替わります。サイズが増え続けることが想定されるデータは、設計段階から保存先と件数上限を決めてください。

## ストレージマイグレーション運用

`src/storage/migrations.ts` は、拡張機能のインストール・更新時に `runMigrations()` から順番に実行されます。スキーマバージョン（`schemaVersion`）と実行ログ（`migrationLog`）は `chrome.storage.local` の予約キーで管理しており、マイグレーション実行前には `backupBeforeMigration()` で `chrome.storage.sync` と `chrome.storage.local` のスナップショットを `chrome.storage.local` に保存します。

### 失敗時の確認と復旧方針

- background のコンソールで `[migrations]` または `Failed to run storage migrations` のログを確認します。
- マイグレーション履歴は `getMigrationLog()` で取得できます。
- バックアップは `backup_<version>_<timestamp>` のキー名で `chrome.storage.local` に直近 3 件まで保持されます（古いバックアップは `cleanOldBackups()` で自動削除）。自動リストア用の UI や関数は設けていないため、復旧が必要な場合は Service Worker の DevTools から `chrome.storage.local` の該当バックアップを直接参照して手動で戻します。
- 新しいマイグレーションを追加する際は、複数回実行されてもデータが重複しないべき等な実装にしてください。

### 変更時の検証

- ストレージスキーマやマイグレーションを変更したら、旧データ相当の fixture または手動データで `runMigrations()` を実行し、バックアップの作成、スキーマバージョンの更新、再実行時に変化が起きないことを確認してください。
- API トークンや OAuth 認証情報など `chrome.storage.local` に置いている機密データは、決して `chrome.storage.sync` へ移さないでください。

## 設計原則

1. **型安全性を優先する**: `tsconfig.json` で `"strict": true` を有効にし、`any` や安易な型アサーションを避けます。外部境界の入力は Valibot でスキーマ検証します。
2. **モジュラーに設計する**: 各モジュールは単一責任で小さく保ち、ランタイム境界をまたぐ不要な依存を持ち込みません。
3. **セキュリティを守る**: ユーザー入力は DOM へ挿入する前にエスケープし、`innerHTML` を使わず `textContent` や `createElement` を使います。入力値の長さ・文字種・形式を検証します。
4. **テストの役割を分ける**: 純粋ロジックは Node 環境、DOM・React 依存ロジックは jsdom 環境、UI の振る舞いは Storybook（Playwright）、重要なユーザーフローは E2E テストで検証します。
5. **パフォーマンスを意識する**: esbuild で高速にバンドルし、ページ読み込み時に常駐するコンテンツスクリプト（`search-blocklist.js`、`image-zoom.js`）のバンドルサイズを抑えます。重い UI は初回操作時まで遅延ロードします。

## 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [`@praha/byethrow` Result 型](https://github.com/praha-inc/byethrow)
- [esbuild](https://esbuild.github.io/)
- [Valibot](https://valibot.dev/)
