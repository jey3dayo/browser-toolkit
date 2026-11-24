---
type: reference
title: Browser Toolkit アーキテクチャ
description: Chrome Extension Manifest V3 としての Browser Toolkit の設計原則、ランタイム境界、主要コンポーネントを説明する。
resource: urn:browser-toolkit:docs:architecture
tags:
  - category/architecture
  - audience/developer
timestamp: 2026-06-29
audience: developer
owner: browser-toolkit
---

# Browser Toolkit アーキテクチャ

このドキュメントでは、Browser Toolkit の設計原則、アーキテクチャ構成、主要なコンポーネントについて説明します。

## 目次

- [全体アーキテクチャ](#全体アーキテクチャ)
- [ランタイム境界](#ランタイム境界)
- [ID 生成システム](#id-生成システム)
- [AI 統一インターフェース](#ai-統一インターフェース)
- [エラーハンドリング](#エラーハンドリング)
- [ストレージ書き込みとクォータフォールバック](#ストレージ書き込みとクォータフォールバック)
- [ストレージマイグレーション運用](#ストレージマイグレーション運用)
- [設計原則](#設計原則)

---

## 全体アーキテクチャ

Browser Toolkit は、Chrome Extension（Manifest V3）として構築した個人用の生産性向上ツールです。

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│                    (Manifest V3)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Background  │  │   Content    │  │    Popup     │     │
│  │    Worker    │  │    Script    │  │      UI      │     │
│  │ (Service     │  │  (Page DOM)  │  │   (React)    │     │
│  │  Worker)     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│        │                  │                  │              │
│        │    chrome.       │    chrome.       │              │
│        │   runtime.       │   runtime.       │              │
│        │  sendMessage     │  sendMessage     │              │
│        │                  │                  │              │
│        └──────────────────┼──────────────────┘              │
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
└─────────────────────────────────────────────────────────────┘
```

---

## ランタイム境界

Browser Toolkit には 5 つの独立した実行環境（ランタイム境界）があり、それぞれ異なる責務を担います。

### 1. Background Worker (`src/background.ts`)

**役割**: 特権 API へのアクセスと、ページ間で共有される状態の管理

#### 主な機能

- コンテキストメニューの管理（`chrome.contextMenus`）
- OpenAI / Anthropic / z.ai / ChatGPT プラン向け API リクエストの送信（`fetch`）
- ストレージ管理（`chrome.storage.sync`、`chrome.storage.local`）
- メッセージハンドリング（`chrome.runtime.onMessage`）

#### API へのアクセス範囲

- 利用可能: `chrome.contextMenus`、`chrome.storage`、`chrome.tabs`、CORS 制限のない `fetch`
- 利用不可: Web ページの DOM

### 2. Content Script (`src/content.ts`)

**役割**: Web ページの DOM 操作と、ユーザー操作の検出

#### 主な機能

- テーブルソート機能の注入
- オーバーレイ UI（Context Actions の結果表示など）
- 選択テキストの取得と送信
- `MutationObserver` による動的テーブルの検出

テーブル機能の有効化と監視のライフサイクルは `src/content/table-auto-exec.ts` が管理します。`setupTableAutoExec` が返す `enable()` は既存テーブルへの適用と動的テーブルの監視を重複なく開始します。手動実行の呼び出し側はこの 1 操作だけを使い、URL 設定に基づく自動実行、タブの表示状態の変化、`pagehide` 時の監視停止は同モジュール内に閉じています。`table-observer.ts` の監視終了関数は `MutationObserver` と未実行のデバウンスタイマーをまとめて停止し、ソートや行フィルタリングの DOM 処理自体は `table-sort.ts` に残しています。

#### API へのアクセス範囲

- 利用可能: ページ DOM の読み書き、Shadow DOM（スタイル隔離）、`chrome.runtime.sendMessage`
- 利用不可: `chrome.contextMenus`、CORS 制限のない `fetch`

### 3. Popup UI (`src/popup.ts`) と Options UI (`src/options.ts`)

**役割**: 日常操作（ポップアップ）と管理操作（オプションページ）のユーザーインターフェース

どちらも `src/popup/App.tsx` の `PopupApp` を `surface` prop 付きで描画し、`src/popup/bootstrap.ts` で共通の初期化（テーマ、スタイル、React root の構築）を行います。`src/popup/panes.ts` の `getPaneSurface` が各ペインの所属先（popup または options）を決め、`canSurfaceRender` がその画面で描画可能かを判定します。

ポップアップは日常操作のペインのみを描画し、オプションページはすべてのペインを描画します。ポップアップ側で描画できないペインのハッシュが渡された場合は既定ペイン（`pane-actions`）へフォールバックします（オプションページ側は全ペインを受け付けるため `options.html#pane-actions` も有効です）。ポップアップから管理系ペインへ移るときは、`PopupRuntime.openOptionsPane` が `options.html#<pane>` を別タブで開いてポップアップを閉じます。

#### 主な機能

- ポップアップ: Context Actions 実行、カレンダー登録、リンク作成、検索結果ブロックリスト、サイト別機能
- オプションページ: ポップアップの全機能に加え、設定管理（API トークン、プロバイダー選択、モデル選択）、カスタムアクション、テキストテンプレート、検索エンジングループ、履歴、デバッグ診断

#### API へのアクセス範囲

- 利用可能: `chrome.runtime.sendMessage`、`chrome.storage`、`chrome.tabs`（限定的）
- 利用不可: ページ DOM への直接アクセス

### 4. Search Blocklist Content Script (`src/search-blocklist.ts`)

**役割**: 検索結果ページ（v1 では Google のみ）でのブロック判定と非表示処理

`content_scripts` の 2 本目のエントリとして `document_start` で注入されます。既存の `content.ts` は `document_idle` で読み込み、`src/content/table-observer.ts` が `document.body` を監視する前提になっているため `document_start` へ移せません。その制約を避けるため、このエントリを分離しています。

バンドルに React は含めません。esbuild の設定（`scripts/bundle.mjs`）が `format: "iife"` で code splitting に対応していないため、UI コンポーネントをここに混ぜると Google 検索を開くたびに React が余分にパースされてしまいます。そのため、判定・非表示・状態管理だけをこのエントリに置き、浮動ボタン・ダイアログ・件数バーの UI は `src/content/search-blocklist-ui/` として既存の `content.js` 側から遅延ロードしています。

#### API へのアクセス範囲

- 利用可能: ページ DOM の読み書き（対象検索ページのみ）、`chrome.storage.local`
- 利用不可: `chrome.contextMenus`、CORS 制限のない `fetch`

### 5. Image Zoom Content Script (`src/image-zoom.ts`)

**役割**: X（`x.com` / `twitter.com`）の画像ビューアでのズーム表示と元画像のダウンロード

`content_scripts` の 3 本目のエントリとして、X に限定して既定の `document_idle` で注入されます。X の写真表示（`/status/<id>/photo/<n>`）で画像をクリックすると、Shadow DOM の全画面ビューアが開きます。ビューア本体はサイト非依存のモジュールとして `src/image-zoom/` に配置し、対象画像の判定や元画像 URL への変換は X 専用アダプターに切り出しています。

画像のダウンロードはコンテンツスクリプトから `downloadImage` メッセージで background へ依頼します。URL はページ側から操作され得るため、background 側で `https://pbs.twimg.com/media/` のみを許可し、ファイル名もメディア ID と許可リストの拡張子から安全に組み立てます。

X の全ページ読み込み時に注入されるためパース負荷を抑える必要があり、`dist/image-zoom.js` のバンドルに含まれるモジュールでは `@/i18n`（i18next）、`@/ui/styles`（全コンポーネント CSS）、`@/content/*` の import を禁止しています。代わりに `@/i18n/lite` と `@/ui/styles-tokens` を使用します。`src/image-zoom/download-url.ts` は background と共有しており、background 側では `@/i18n` を使いますが、image-zoom 側（`src/image-zoom/download-request.ts`）はそこから型 `DownloadImagePayload` だけを `import type` するため、実装自体はバンドルに含まれません（例外扱いではなく、型のみの参照によって境界を維持しています）。この制約は `tests/build/image_zoom_bundle.test.ts` が metafile の入力一覧を denylist で検証し、minify 後 90KB 以下のサイズ上限とあわせて自動でガードしています。

### メッセージパッシング

ランタイム間の通信は、型安全なメッセージパッシングで行います。

```typescript
// src/background/runtime_types.ts
type RuntimeRequest =
  | { action: "summarizeText"; target: SummaryTarget }
  | { action: "testAiToken"; token?: string }
  | { action: "summarizeEvent"; target: SummaryTarget }
  | { action: "openPopupSettings" };
// ...

// 送信側（Content Script）
chrome.runtime.sendMessage(
  { action: "summarizeText", target: { text, source, title, url } },
  (response) => {
    /* 結果処理 */
  },
);

// 受信側（Background Worker）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarizeText") {
    handleSummarizeTextRequest(request, sendResponse);
    return true; // 非同期レスポンス
  }
});
```

#### 設計上のポイント

- 型安全性: Union 型ですべてのメッセージ形式を定義する
- 適切な粒度: 役割ごとに識別・テストしやすい単位に分割する
- 非同期応答: リスナーから `return true` を返して非同期レスポンスを保証する

---

## ID 生成システム

検索エンジングループやテキストテンプレートなど、ユーザーが作成する項目には一意の ID を付与しています。

### 設計目標

1. 衝突回避: 異なる名前に対して高い確率で別の ID を生成する
2. 可読性: デバッグ時に ID から元の名前を推測しやすくする
3. 一貫性: 同じ名前に対して常に同じ ID を返す（べき等性）

### 実装

`src/utils/id_generator.ts` に共通の ID 生成関数を用意しています。

```typescript
/**
 * 一意な ID を生成する
 * @param name 名前（日本語やスペースを含む可能性がある）
 * @param prefix ID のプレフィックス（例: "group", "template"）
 * @returns "{prefix}:{slug}-{hash}" 形式の ID
 */
export function generateId(name: string, prefix: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const hash = simpleHash(name).substring(0, 8);

  if (slug.length === 0) {
    return `${prefix}:${hash}`;
  }

  return `${prefix}:${slug}-${hash}`;
}
```

### 使用例

```typescript
// 検索エンジングループ
generateId("お買い物", "group");
// → "group:e8c8a7d5"（非 ASCII 文字のみのためハッシュのみ）

generateId("Shopping", "group");
// → "group:shopping-a1b2c3d4"（slug + hash）

// テキストテンプレート
generateId("LGTM", "template");
// → "template:lgtm-0023a134"
```

### ハッシュアルゴリズム

```typescript
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // 32bit 整数に変換
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
```

#### 特徴

- 文字列長に対して線形時間 `O(n)` で高速に動作する
- 32bit ハッシュにより実用上十分な衝突耐性を持つ
- UTF-16 のコード単位を扱うため非 ASCII 文字にも対応する

### 共通化の背景

以前は `src/search_engine_groups.ts` と `src/text_templates.ts` のそれぞれに `simpleHash` と ID 生成ロジックが重複して存在していました（`similarity-ts` 分析で 80% 重複・計 80 行）。これを `src/utils/id_generator.ts` に統合し、各モジュールから `generateId(name, prefix)` を呼ぶ形にしたことで 51 行（-36%）まで削減しています。

---

## AI 統一インターフェース

Browser Toolkit は複数の AI プロバイダー（OpenAI、ChatGPT プラン、Anthropic、z.ai）に対応しています。

ChatGPT プラン（プロバイダー ID `chatgpt`）だけは API キーではなく [Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source) の OAuth 認証を使い、Chat Completions API ではなく Responses API（`store: false` / `stream: true` 必須）へリクエストを送信します。

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                  Unified AI Interface                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         prepareAiInput()                       │    │
│  │  - ストレージから設定をロード                     │    │
│  │  - 入力テキストをクリップ                         │    │
│  │  - メタ情報を構築                               │    │
│  └────────────────────────────────────────────────┘    │
│                       │                                 │
│                       ▼                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │         requestAiText()                        │    │
│  │  - プロバイダー別アダプターを取得                 │    │
│  │  - API リクエストを送信                          │    │
│  │  - 結果を返す                                  │    │
│  └────────────────────────────────────────────────┘    │
│                       │                                 │
│         ┌─────────────┼─────────────┐                  │
│         ▼             ▼             ▼                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ OpenAI   │ │ Anthropic│ │  z.ai    │              │
│  │ Adapter  │ │ Adapter  │ │ Adapter  │              │
│  └──────────┘ └──────────┘ └──────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Context Actions の実行フロー

`src/background/action_executor.ts` の `executeContextAction({ action, target })` が、解決済みの対象テキストに対する `text` / `event` アクションの実行を担当します。プロンプトの検証、イベント抽出用の追加指示テンプレート、プロバイダー呼び出し、イベント結果の表示用整形をここに集約し、`Result<ContextActionOutput, string>` を返します。成功時は共通の `text`・`source`・`kind` を持ち、`kind: "event"` の場合のみ構造化された `event` も含みます。

対象テキストの解決、通知、ランタイム間メッセージのペイロード整形は呼び出し側が担当します。ランタイムのイベント応答は従来どおり `eventText` のみを返し、右クリックからの直接実行では構造化された `event` もオーバーレイへ渡します。専用のカレンダー登録経路とプロバイダーアダプターはそれぞれ独立した構成を保っています。

### 型定義

```typescript
// src/background/ai_input.ts
export type PreparedAiInput = {
  settings: AiSettings; // プロバイダー、モデル、トークン、カスタムプロンプト
  clippedText: string; // 20,000 文字に制限されたテキスト
  meta: string; // タイトル、URL 情報
};

// src/ai/settings.ts
export type AiSettings =
  | (AiSettingsCommon & { provider: ApiKeyProvider; token: string }) // "openai" | "anthropic" | "zai"
  | (AiSettingsCommon & { provider: "chatgpt" }); // トークンは送信直前に非同期で解決する
```

### AI リクエストまわりのモジュール責務

- `src/background/ai_requests.ts`: 要約・イベント抽出・会話など、プロバイダーに依存しない実行フロー
- `src/background/ai_input.ts`: 入力テキストの整形と設定の読み込み
- `src/ai/chat-completion-client.ts`: アダプター経由の HTTP 送信、許可オリジンの検証、タイムアウト、JSON パースと `Result` 変換
- `src/ai/openai-compatible-adapter.ts`: Chat Completions 互換の通信形式（Bearer 認証 / POST / `choices` / エラー抽出）のみ
- `src/ai/openai-adapter.ts` / `zai-adapter.ts`: 各プロバイダーの設定と送信前処理の組み立て
- `src/ai/openai-request-policy.ts`: OpenAI 固有のパラメータ制約（UI のモデル選択肢とは独立して管理）
- `src/ai/anthropic-adapter.ts`: Anthropic Messages API 向けの形式変換
- `src/background/ai_credentials.ts`: プロバイダーごとの送信経路の振り分け。API キー系プロバイダーはアダプター経由、`chatgpt` はアクセストークンを解決して Responses API へ送り、401 応答時は 1 回だけリフレッシュして再送する
- `src/ai/chatgpt/oauth.ts`: Sign in with ChatGPT（SIWC）の認可 URL 生成、コールバック解析、トークン応答および ID トークンクレームの検証（純粋関数）
- `src/ai/chatgpt/responses.ts`: Chat 形式から Responses 形式への変換、`response.completed` までの SSE 読み取り、SIWC 固有エラーのメッセージ化
- `src/background/chatgpt_session.ts`: サインイン・リフレッシュ・サインアウト（トークン失効）。リフレッシュトークンが回転する仕様のため、リフレッシュ処理は直列化する

#### ChatGPT プランのサインイン経路

SIWC はリダイレクト URI にループバック（`http://127.0.0.1:1455/auth/callback`）しか許可せず、Chrome 拡張機能側でそのポートを待ち受けることはできません。そのため、background が認可タブを開き、`chrome.tabs.onUpdated` で遷移先のタブ URL を読み取って認可コードを取得します。

タブを開いた時点でポップアップは閉じるため、PKCE・state・nonce は `chrome.storage.session` の `chatgptSignIn` に一時保存します。サインイン完了は `chrome.notifications` で通知し、ポップアップの表示は `storage.onChanged` で追従させます。

認証情報、発行済みのクライアント ID と登録時アカウント（`sub`）、および host ID は `chrome.storage.local` に保存し、`sync` には置きません。別アカウントでサインインし直された場合は既存トークンを失効させて再登録します。端末ごとに異なる host ID を使う必要があり、回転するリフレッシュトークンを複数端末で共有すると失効してしまうためです。なお、ID トークンの署名検証は行わず、TLS 経由でトークンエンドポイントから直接受け取る経路に限定して `iss`・`aud`・`exp`・`nonce` とスコープを照合します。

`src/constants/models.ts` の選択肢にモデルを追加しても、リクエスト時のパラメータ制約は自動では切り替わりません。OpenAI の reasoning 系モデルでは `temperature` を省略して既存の GPT-5 系互換を維持し、その他の任意モデル文字列はそのまま送信します。z.ai には OpenAI 固有の送信制約を適用しません。

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

### 統一化の背景と利点

以前は OpenAI 専用の関数（`prepareOpenAiInput`、`_requestOpenAiText`、`testOpenAiToken`）や専用型がマルチプロバイダー対応の関数と並存しており、83〜90% のコード重複がありました。統一インターフェース（`prepareAiInput`、`requestAiText`、`testAiToken`）へ一本化し、旧関数を削除したことで 137 行を削減しています。

この構成には次の利点があります。

1. 保守性: 新しいプロバイダーを追加する際はアダプターを実装するだけで済む
2. テスト容易性: 共通インターフェース単位でモックを組み立てやすい
3. 型安全性: プロバイダー固有の差分によるバグを防ぎやすい

---

## エラーハンドリング

Browser Toolkit では、`@praha/byethrow` の `Result` 型を用いてエラーハンドリングを統一しています。

### Result 型パターン

```typescript
import { Result } from "@praha/byethrow";

// 成功
Result.succeed(value); // Result<T, never>

// 失敗
Result.fail(error); // Result<never, E>

// 型ガード
if (Result.isFailure(result)) {
  console.error(result.error);
  return;
}

// 成功時の値を使用
const value = result.value;
```

### 設計ルール

内部関数では常に `Result` 型を返します。

```typescript
// src/background/ai_input.ts
export async function prepareAiInput(params: {
  target: SummaryTarget;
  missingTextMessage: string;
  includeMissingMeta?: boolean;
}): Promise<Result.Result<PreparedAiInput, string>> {
  const settingsResult = loadAiSettings(storage);
  if (Result.isFailure(settingsResult)) {
    return Result.fail(settingsResult.error); // エラー伝播
  }

  const clippedText = clipInputText(params.target.text);
  if (!clippedText) {
    return Result.fail(params.missingTextMessage);
  }

  return Result.succeed({ settings, clippedText, meta });
}
```

メッセージ境界では通信用の結果形式に変換して返却します。

```typescript
// src/background/runtime_handlers.ts
function handleTestAiTokenRequest(
  request: { action: "testAiToken"; token?: string },
  sendResponse: RuntimeSendResponse,
): boolean {
  (async () => {
    const result = await testAiToken(request.token);

    if (Result.isFailure(result)) {
      sendResponse(Result.fail(result.error));
      return;
    }
    sendResponse(Result.succeed({}));
  })();
  return true;
}
```

#### 利点

1. 型安全: 失敗ケースを呼び出し側で明示的に扱える
2. 伝播の簡潔さ: `if (Result.isFailure)` でエラーを素直に返せる
3. 一貫性: プロジェクト全体で同じ流儀を保てる

---

## ストレージ書き込みとクォータフォールバック

`storageSyncSet`（`src/background/storage.ts`）は保存前に `checkStorageQuota` を実行します。1 キーあたりの容量上限（`QUOTA_BYTES_PER_ITEM` = 8KB）を超えるキーが見つかった場合は、そのキーだけを `chrome.storage.local` へ退避し、警告ログと通知を出します。`sync` が上限に達しても保存自体は失敗しませんが、**退避したキーはデバイス間で同期されなくなります**。

増え続ける配列データを `sync` に置くと、上限到達時に意図せずローカル退避へ切り替わります。サイズが増え続けることが想定されるデータは、設計段階から保存先と件数上限を決めてください。

---

## ストレージマイグレーション運用

`src/storage/migrations.ts` は、拡張機能のインストール・更新時に `runMigrations()` から順番に実行されます。スキーマバージョンと実行ログは `chrome.storage.local` の予約キーで管理しており、マイグレーション実行前には `chrome.storage.sync` と `chrome.storage.local` の両方を自動でバックアップします。

### 失敗時の確認ポイント

- background のコンソールで `[migrations]` または `Failed to run storage migrations` のログを確認します。
- マイグレーション履歴は `getMigrationLog()` で取得できます。
- バックアップは `listBackups()` で新しい順に取得できます（保持数は直近 3 件です）。

### 復旧方針

- バックアップの `timestamp` と `version` を確認し、戻したい時点を特定します。
- `restoreFromBackup(timestamp)` は、バックアップ時点に存在しない現在のキーを削除したうえで、`sync` と `local` のデータを復元します（予約キーはローカル復元の対象外です）。
- 復元後はスキーマバージョンもバックアップ時点に戻るため、次回の `runMigrations()` で未適用のマイグレーションが再実行されます。新しいマイグレーションを追加する際は、複数回実行されてもデータが重複しないべき等な実装にしてください。

### 変更時の検証

- ストレージスキーマやマイグレーションを変更したら、旧データ相当の fixture または手動データで `runMigrations()` を実行し、バックアップの作成、スキーマバージョンの更新、再実行時に変化が起きないことを確認してください。
- プロバイダートークンなど `chrome.storage.local` に置いている機密データは、決して `chrome.storage.sync` へ移さないでください。

---

## 設計原則

### 1. 型安全性を優先する

- `tsconfig.json` で `"strict": true` を有効にする
- `any` 型や安易な型アサーションを避ける
- 外部境界の入力は Valibot でスキーマ検証する

### 2. モジュラーに設計する

- 各モジュールは単一責任を意識して小さく保つ
- 巨大な共有フレームワークを作らず、薄い共有モジュールに留める
- ランタイム境界を尊重し、不要な依存を持ち込まない

### 3. セキュリティを徹底する

- ユーザー入力は DOM へ挿入する前に必ずエスケープする
- `innerHTML` は使わず、`textContent` や `createElement` を使う
- 入力値の長さ・文字種・形式を検証する

### 4. テストの役割を分ける

- ユニットテスト: 純粋ロジックは Node 環境、DOM・React 依存ロジックは jsdom 環境で検証する
- Storybook テスト: Playwright ブラウザ環境で UI の振る舞いを検証する
- E2E テスト: 重要なユーザーフローに絞って検証する

### 5. パフォーマンスを意識する

- esbuild により 1 秒未満で高速にバンドルする
- 重複コードは `similarity-ts` などで見直し、共通化する
- 必要な機能だけを遅延ロードする構成を意識する

---

## 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [`@praha/byethrow` Result 型](https://github.com/praha-inc/byethrow)
- [similarity-ts（Rust 製コード重複検出）](https://github.com/mizchi/similarity)
- [esbuild](https://esbuild.github.io/)
- [Valibot](https://valibot.dev/)

---

## 更新履歴

- 2026-02-12: 初版作成（ID 生成システム、AI 統一インターフェース、エラーハンドリング）
