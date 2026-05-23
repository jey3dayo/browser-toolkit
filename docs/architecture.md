# Browser Toolkit アーキテクチャ

このドキュメントは、Browser Toolkitの設計原則、アーキテクチャパターン、および主要なコンポーネントについて説明します。

## 📋 目次

- [全体アーキテクチャ](#全体アーキテクチャ)
- [ランタイム境界](#ランタイム境界)
- [ID生成システム](#id生成システム)
- [AI統一インターフェース](#ai統一インターフェース)
- [エラーハンドリング](#エラーハンドリング)
- [設計原則](#設計原則)

---

## 全体アーキテクチャ

Browser Toolkitは、Chrome Extension（Manifest V3）として構築された、個人用の生産性向上ツールです。

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
└─────────────────────────────────────────────────────────────┘
```

---

## ランタイム境界

Browser Toolkitは3つの独立した実行環境（ランタイム境界）を持ち、それぞれが異なる責務を担います。

### 1. Background Worker (`src/background.ts`)

**役割**: 特権APIへのアクセスと、ページ間で共有される状態管理

**主な機能**:

- コンテキストメニューの管理（`chrome.contextMenus`）
- OpenAI/Anthropic/z.ai APIへのリクエスト（fetch）
- ストレージ管理（`chrome.storage.sync`, `chrome.storage.local`）
- メッセージハンドリング（`chrome.runtime.onMessage`）

**アクセス可能なAPI**:

- ✅ `chrome.contextMenus`
- ✅ `chrome.storage`
- ✅ `chrome.tabs`
- ✅ `fetch` (CORS制限なし)
- ❌ ページDOM（アクセス不可）

### 2. Content Script (`src/content.ts`)

**役割**: ページのDOM操作と、ユーザーインタラクションの検出

**主な機能**:

- テーブルソート機能の注入
- オーバーレイUI（Context Actions結果表示）
- 選択テキストの取得と送信
- MutationObserverによる動的テーブル検出

**アクセス可能なAPI**:

- ✅ ページDOM（読み取り/書き込み）
- ✅ Shadow DOM（スタイル隔離）
- ✅ `chrome.runtime.sendMessage`
- ❌ `chrome.contextMenus`（アクセス不可）
- ❌ CORS制限なしのfetch（アクセス不可）

### 3. Popup UI (`src/popup.ts`)

**役割**: 設定画面とユーザーインターフェース

**主な機能**:

- 設定管理（APIトークン、プロバイダー選択、モデル選択）
- カスタムアクションの作成/編集
- テキストテンプレート管理
- 検索エンジングループ管理

**アクセス可能なAPI**:

- ✅ `chrome.runtime.sendMessage`
- ✅ `chrome.storage`
- ✅ `chrome.tabs`（限定的）
- ❌ ページDOM（直接アクセス不可）

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

**設計原則**:

- **型安全性**: union型で全てのメッセージタイプを定義
- **小さなメッセージ**: 識別可能で、テスト可能な粒度
- **非同期対応**: `return true` で非同期レスポンスを保証

---

## ID生成システム

Browser Toolkitでは、検索エンジングループやテキストテンプレートなど、ユーザーが作成するエンティティに一意なIDを付与する必要があります。

### 設計目標

1. **衝突回避**: 同じ名前のエンティティでも異なるIDを生成
2. **可読性**: デバッグ時にIDから元の名前を推測可能
3. **一貫性**: 同じ名前に対して常に同じIDを生成（べき等性）

### 実装

`src/utils/id_generator.ts` に統一されたID生成関数を実装しています。

```typescript
/**
 * 一意なIDを生成
 * @param name 名前（日本語やスペースを含む可能性がある）
 * @param prefix IDのプレフィックス（例: "group", "template"）
 * @returns "{prefix}:{slug}-{hash}" 形式のID
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
// → "group:e8c8a7d5" (非ASCII文字のみ → ハッシュのみ)

generateId("Shopping", "group");
// → "group:shopping-a1b2c3d4" (slug + hash)

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
    hash &= hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
```

**特徴**:

- 高速（O(n)、nは文字列長）
- 衝突率低い（32bitハッシュ）
- 非ASCII文字対応（UTF-16 codePointを使用）

### リファクタリングの経緯

**Before** (similarity-ts分析: 80%重複):

- `src/search_engine_groups.ts` に `simpleHash` + `generateGroupId`
- `src/text_templates.ts` に `simpleHash` + `generateTemplateId`
- 合計80行の重複コード

**After**:

- `src/utils/id_generator.ts` に統一
- 各ファイルは `generateId(name, prefix)` を呼び出すだけ
- 51行に削減（-36%）

---

## AI統一インターフェース

Browser Toolkitは、複数のAIプロバイダー（OpenAI、Anthropic、z.ai）をサポートしています。

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
│  │  - APIリクエストを送信                          │    │
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

### 型定義

```typescript
// src/background/openai_common.ts
export type PreparedAiInput = {
  settings: AiSettings; // プロバイダー、モデル、トークン、カスタムプロンプト
  clippedText: string; // 20,000文字に制限されたテキスト
  meta: string; // タイトル、URL情報
};

// src/ai/settings.ts
export type AiSettings = {
  provider: AiProvider; // "openai" | "anthropic" | "zai"
  model: string; // モデルID
  token: string; // APIトークン
  customPrompt?: string; // カスタムプロンプト
};
```

### プロバイダー別アダプター

```typescript
// src/ai/get-adapter.ts
export function getAdapter(provider: AiProvider): AiAdapter {
  switch (provider) {
    case "openai":
      return openAiAdapter;
    case "anthropic":
      return anthropicAdapter;
    case "zai":
      return zaiAdapter;
  }
}

// 各アダプターは共通インターフェースを実装
export type AiAdapter = {
  buildUrl: () => string;
  buildHeaders: (token: string) => Record<string, string>;
  parseResponse: (data: unknown) => string | null;
};
```

### リファクタリングの経緯

**Before** (similarity-ts分析: 83〜90%重複):

- OpenAI専用関数: `prepareOpenAiInput`, `_requestOpenAiText`, `testOpenAiToken`
- OpenAI専用型: `PreparedOpenAiInput`, `OpenAiTextRequest`
- マルチプロバイダー関数と並存（過渡期）

**After**:

- AI統一関数: `prepareAiInput`, `requestAiText`, `testAiToken`
- AI統一型: `PreparedAiInput`, `AiTextRequest`
- レガシー関数を完全削除（-137行）

### 利点

1. **保守性**: プロバイダー追加時、アダプターを実装するだけ
2. **テスト容易性**: 共通インターフェースでモックが作りやすい
3. **型安全性**: プロバイダー固有のバグを防ぐ

---

## エラーハンドリング

Browser Toolkitは、`@praha/byethrow` の `Result` 型を使用した統一的なエラーハンドリングを採用しています。

### Result型パターン

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

**内部関数**: 常に `Result` 型を返す

```typescript
// src/background/openai_common.ts
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

**メッセージ境界**: `{ ok: true/false }` に変換

```typescript
// src/background/runtime_handlers.ts
function handleTestAiTokenRequest(
  request: { action: "testAiToken"; token?: string },
  sendResponse: RuntimeSendResponse,
): boolean {
  (async () => {
    const result = await testAiToken(request.token);

    // Result → { ok: true/false } に変換
    if (Result.isFailure(result)) {
      sendResponse(Result.fail(result.error));
      return;
    }
    sendResponse(Result.succeed({}));
  })();
  return true;
}
```

### 利点

1. **型安全**: エラーケースを明示的に扱う
2. **エラー伝播**: `if (Result.isFailure)` で簡潔に伝播
3. **一貫性**: プロジェクト全体で統一されたパターン

---

## 設計原則

### 1. 型安全性優先

- **strict mode有効**: `tsconfig.json` で `"strict": true`
- **any型禁止**: 型アサーションやany型の使用を避ける
- **入力検証**: `Valibot` でスキーマ検証

### 2. モジュラー設計

- **小さな責務**: 各モジュールは単一責任原則に従う
- **薄い共有モジュール**: 大きな共有フレームワークを避ける
- **独立性**: ランタイム境界を尊重し、依存を最小化

### 3. セキュリティ

- **XSS対策必須**: ユーザー入力を DOM に挿入する前にエスケープ
- **innerHTML禁止**: `textContent` または `createElement` を使用
- **入力検証**: 長さ、文字種、形式をチェック

### 4. テスト戦略

- **ユニットテスト**: Node 環境で純粋ロジックを、jsdom 環境で DOM/React 依存ロジックをテスト
- **Storybookテスト**: Playwrightブラウザ環境でUIをテスト
- **最小限のE2E**: 重要フローのみ手動テスト

### 5. パフォーマンス

- **esbuild高速ビルド**: 1秒未満でバンドル完了
- **コード重複削減**: similarity-ts分析でリファクタリング
- **遅延ロード**: 必要な機能のみを動的ロード（今後検討）

---

## 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [`@praha/byethrow` Result型](https://github.com/praha-inc/byethrow)
- [similarity-ts（Rust製コード重複検出）](https://github.com/mizchi/similarity)
- [esbuild](https://esbuild.github.io/)
- [Valibot](https://valibot.dev/)

---

## 更新履歴

- **2026-02-12**: 初版作成（ID生成システム、AI統一インターフェース、エラーハンドリング）
