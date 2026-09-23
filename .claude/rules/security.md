---
paths:
  - "src/**/*.{ts,tsx}"
  - "manifest.json"
---

# セキュリティガイドライン

このドキュメントは、Browser Toolkit開発におけるセキュリティベストプラクティスを定義します。

## 🎯 目的

- XSS（クロスサイトスクリプティング）攻撃の防止
- ユーザーデータとプライバシーの保護
- Chrome拡張機能特有のセキュリティリスクの軽減

## 🚫 XSS対策: 禁止事項

以下のAPIは**例外なく使用禁止**です：

### DOM操作

- ❌ `innerHTML` への代入
- ❌ `outerHTML` への代入
- ❌ `document.write()`
- ❌ `insertAdjacentHTML()`（未サニタイズの場合）

### JavaScript実行

- ❌ `eval()`
- ❌ `Function()` コンストラクタ
- ❌ `setTimeout(stringCode)`、`setInterval(stringCode)`

### React

- ❌ `dangerouslySetInnerHTML`（未サニタイズの場合）

## ✅ XSS対策: 推奨事項

### 1. テキストコンテンツの挿入

推奨: `textContent` または `innerText`

```typescript
// ✅ 安全
element.textContent = userInput;

// ❌ 危険
element.innerHTML = userInput;
```

### 2. DOM要素の動的生成

推奨: `createElement()` + `appendChild()`

```typescript
// ✅ 安全
const div = document.createElement("div");
div.textContent = userInput;
parent.appendChild(div);

// ❌ 危険
parent.innerHTML = `<div>${userInput}</div>`;
```

### 3. Markdown表示

推奨: `react-markdown`（既に使用中）

```tsx
// ✅ 安全（src/content/overlay/OverlayComponents.tsx）
import ReactMarkdown from "react-markdown";

<ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown>;
```

### 4. HTMLサニタイズが必要な場合

推奨: DOMPurify（必要に応じて導入）

```typescript
import DOMPurify from "dompurify";

// ✅ サニタイズ後のみ使用可能
const cleanHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "ul", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
element.innerHTML = cleanHtml;
```

注意: DOMPurifyを使用する場合も：

1. コードレビューで承認必須
2. ユニットテストでXSSケースを追加必須
3. 許可するタグ・属性を最小限に限定

## 🔍 影響範囲と対策状況

### ✅ 正しく実装されている箇所

#### テーブルソート（src/content/table-sort.ts）

```typescript
// ✅ textContent使用
cell.textContent = value;
```

#### オーバーレイ（src/content/overlay/）

```tsx
// ✅ react-markdown使用
<ReactMarkdown>{summary}</ReactMarkdown>
```

#### ポップアップ（src/popup/）

```tsx
// ✅ React の自動エスケープ
<input value={customPrompt} />
```

### ⚠️ 要注意箇所

#### テキスト挿入（src/content/template-paste.ts, src/background/context_menu_gemini.ts）

いずれもプレーンテキストしか挿入しない経路（`element.value` への代入、
contenteditable への `execCommand("insertText")`）で現状は安全。
`innerHTML` / `insertAdjacentHTML` へ置き換えないこと。

## 🛡️ その他のセキュリティベストプラクティス

### 1. APIトークンの保護

```typescript
// ✅ ローカルストレージに保存（同期しない）
await chrome.storage.local.set({ openaiApiToken });

// ❌ 同期ストレージに保存
await chrome.storage.sync.set({ openaiApiToken }); // 危険！
```

### 2. Content Security Policy（CSP）の遵守

manifest.jsonのCSPを厳格化（Issue #143）：

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.z.ai"
  }
}
```

`connect-src` は拡張機能ページが `fetch`/`XMLHttpRequest` で接続できるホストを制限する、このCSPの中核的な制約です。AIプロバイダのエンドポイントを追加・変更する場合は、`src/constants/api-endpoints.ts` の `ALLOWED_API_ORIGINS`、`manifest.json` の `host_permissions`、`content_security_policy.connect-src` を必ず同じ差分で揃えてください（詳細は `CLAUDE.md` の「Release / Permission Review」を参照）。

### 3. 入力検証

```typescript
// ✅ 長さ制限
if (userInput.length > 10000) {
  throw new Error("入力が長すぎます");
}

// ✅ 型検証
if (typeof userInput !== "string") {
  throw new Error("無効な入力");
}

// ✅ URLバリデーション
const url = new URL(userInput); // 例外を投げる
```

### 4. プライバシー保護

```typescript
// ❌ ユーザー入力をログに出力
console.log("User input:", userInput);

// ✅ デバッグ時のみ、開発環境でのみ
if (import.meta.env.DEV) {
  console.debug("Input length:", userInput.length);
}
```

## 🛡️ ユーザー入力から URL 判定器を構築する場合（ReDoS 対策）

検索結果ブロックリストのように、ユーザーが入力した match pattern から URL を判定する
機能を実装する場合、パターンを `RegExp` へ変換して使うと ReDoS（正規表現の破局的
バックトラッキング）の入口になります。

- ❌ ユーザー入力の glob / match pattern をそのまま `RegExp` へコンパイルして判定に使う
- ✅ URL パース（`new URL()`）+ ホストラベル単位の接尾辞比較 + 線形時間の path glob
  マッチャー（バックトラッキングしない実装）で判定する

上限を設けず無制限のパターン・ルールを受け付けると、判定コストが利用者の入力に比例して
膨らみます。以下の上限を設け、超過時は**切り捨てず明示エラー**を返してください（暗黙の
切り捨ては、ユーザーが「保存したつもり」のルールが実は保存されていない事故につながる）。

```typescript
// src/search-blocklist/rules.ts の上限
export const SEARCH_BLOCKLIST_RULE_LIMIT = 2000;
export const SEARCH_BLOCKLIST_PATTERN_MAX_LENGTH = 255;
export const SEARCH_BLOCKLIST_PATTERN_MAX_WILDCARDS = 3;
export const SEARCH_BLOCKLIST_URL_MAX_LENGTH = 2048;
```

## 📋 コードレビューチェックリスト

PRレビュー時に以下を確認してください：

### XSS対策

- [ ] ユーザー入力やAPI応答を `innerHTML` で挿入していないか？
- [ ] `textContent`、`createElement`、`react-markdown` を使用しているか？
- [ ] `dangerouslySetInnerHTML` を使用していないか？
- [ ] URLパラメータやクエリ文字列をそのままDOMに挿入していないか？

### データ保護

- [ ] APIトークンは `chrome.storage.local` に保存しているか？
- [ ] 機密情報をコンソールログに出力していないか？
- [ ] ユーザー入力をサードパーティに送信する前に確認しているか？

### 入力検証

- [ ] ユーザー入力の長さ制限を設けているか？
- [ ] 型検証を実施しているか？
- [ ] URLや数値の妥当性検証を行っているか？
- [ ] ユーザー入力から `RegExp` を構築していないか？（件数・長さの上限と、超過時の明示エラーがあるか）

## 🔧 自動チェック

### 定期的なセキュリティ監査

```bash
# 依存関係の脆弱性チェック
pnpm audit

# innerHTML使用箇所の検索
grep -r "innerHTML" src/

# eval使用箇所の検索
grep -r "eval(" src/
```

## 📚 参考資料

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/develop/concepts/security)
- [Content Security Policy (CSP)](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)

## 🚨 インシデント対応

XSSや脆弱性を発見した場合：

1. 即座に報告: プロジェクトメンテナーに連絡
2. 影響範囲の特定: どの機能が影響を受けるか
3. 緊急パッチ作成: 修正PRを最優先で作成
4. ユーザーへの通知: 必要に応じてアップデート案内

---

最終更新: 2026-02-13
レビュー: セキュリティガイドラインは定期的に見直してください
