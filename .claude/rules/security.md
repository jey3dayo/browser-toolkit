---
paths:
  - "src/**/*.{ts,tsx}"
  - "manifest.json"
---

# セキュリティガイドライン

Browser Toolkit の開発で守るべきセキュリティ上のルールと実践方針をまとめています。

## 目的

- XSS（クロスサイトスクリプティング）の防止
- ユーザーデータとプライバシーの保護
- Chrome 拡張機能特有のセキュリティリスクの軽減

## XSS 対策: 禁止事項

以下の API は**原則として使用禁止**です。

### DOM 操作

- `innerHTML` への代入
- `outerHTML` への代入
- `document.write()`
- `insertAdjacentHTML()`（未サニタイズの文字列を渡す場合）

### JavaScript の動的実行

- `eval()`
- `Function()` コンストラクタ
- 文字列を引数に取る `setTimeout(stringCode)`、`setInterval(stringCode)`

### React

- `dangerouslySetInnerHTML`（未サニタイズの文字列を渡す場合）

## XSS 対策: 推奨パターン

### 1. テキストの挿入

`textContent` または `innerText` を使用します。

```typescript
// 安全
element.textContent = userInput;

// 危険
element.innerHTML = userInput;
```

### 2. DOM 要素の動的生成

`createElement()` と `appendChild()` を組み合わせて構築します。

```typescript
// 安全
const div = document.createElement("div");
div.textContent = userInput;
parent.appendChild(div);

// 危険
parent.innerHTML = `<div>${userInput}</div>`;
```

### 3. Markdown の表示

既に導入している `react-markdown` を使用します。

```tsx
// 安全（src/content/overlay/OverlayComponents.tsx）
import ReactMarkdown from "react-markdown";

<ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown>;
```

### 4. やむを得ず HTML を描画する場合

必要に応じて `DOMPurify` を導入し、サニタイズした文字列のみを扱います。

```typescript
import DOMPurify from "dompurify";

// サニタイズ後のみ使用可能
const cleanHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "ul", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
element.innerHTML = cleanHtml;
```

`DOMPurify` を使う場合も、以下の 3 点を徹底してください。

1. コードレビューで必要性と安全性を確認する
2. ユニットテストに XSS を想定したケースを追加する
3. 許可するタグと属性を必要最小限に絞る

## 既存コードの対策状況

### 安全に実装されている箇所

- **テーブルソート（`src/content/table-sort.ts`）**: `cell.textContent = value` でテキストとして扱っています。
- **オーバーレイ（`src/content/overlay/`）**: `react-markdown`（生 HTML 無効）で描画しています。
- **ポップアップ（`src/popup/`）**: React の自動エスケープに任せて描画しています。

### 変更時に注意が必要な箇所

- **テキスト挿入（`src/content/template-paste.ts`、`src/background/context_menu_gemini.ts`）**: いずれも `element.value` への代入や contenteditable への `execCommand("insertText")` によるプレーンテキスト挿入のみを行っており、現状は安全です。`innerHTML` や `insertAdjacentHTML` に置き換えないでください。

## その他のセキュリティ方針

### 1. API トークンの保護

API トークンや認証情報は必ずローカルストレージに保存し、同期ストレージには書き込まないでください。

```typescript
// 安全: ローカルストレージに保存（同期しない）
await chrome.storage.local.set({ openaiApiToken });

// 危険: 同期ストレージに保存
await chrome.storage.sync.set({ openaiApiToken });
```

### 2. Content Security Policy（CSP）の遵守

`manifest.json` では以下のように厳格な CSP を設定しています（Issue #143）。

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.z.ai https://auth.openai.com"
  }
}
```

`connect-src` は、拡張機能ページから `fetch` や `XMLHttpRequest` で接続できるホストを制限する重要な制約です。AI プロバイダーのエンドポイントを追加・変更する場合は、`src/constants/api-endpoints.ts` の `ALLOWED_API_ORIGINS`、`manifest.json` の `host_permissions`、`content_security_policy.connect-src` を必ず同じ差分で揃えてください（詳細は `AGENTS.md` の「Release / Permission Review」を参照）。

### 3. 入力検証

外部入力やユーザー入力には、長さ・型・形式のチェックを入れます。

```typescript
// 長さ制限
if (userInput.length > 10000) {
  throw new Error("入力が長すぎます");
}

// 型検証
if (typeof userInput !== "string") {
  throw new Error("無効な入力");
}

// URL バリデーション
const url = new URL(userInput); // 不正な場合は例外を送出
```

### 4. ログ出力とプライバシー保護

ユーザー入力や機密情報はログに出力しないでください。デバッグログが必要な場合も開発環境のみに限定し、文字列の内容ではなく長さなどのメタ情報にとどめます。

```typescript
// 危険: ユーザー入力をそのままログに出力
console.log("User input:", userInput);

// 安全: 開発環境のみ、内容を含めない形で出力
if (import.meta.env.DEV) {
  console.debug("Input length:", userInput.length);
}
```

## ユーザー入力から URL 判定器を構築する場合（ReDoS 対策）

検索結果ブロックリストのように、ユーザーが入力した match pattern で URL を判定する機能では、パターンを `RegExp` へ変換すると ReDoS（正規表現の破局的バックトラッキング）の原因になります。

- **避けるべき実装**: ユーザー入力の glob や match pattern をそのまま `RegExp` にコンパイルして判定する
- **推奨する実装**: `new URL()` によるパース、ホストラベル単位の接尾辞比較、およびバックトラッキングしない線形時間のパス glob マッチャーで判定する

また、パターンやルールに上限を設けないと、入力量に比例して判定コストが増大します。以下の上限を設定し、超過時は**暗黙に切り捨てず明示的なエラー**を返してください（暗黙の切り捨ては、保存できたつもりのルールが欠落する事故につながります）。

```typescript
// src/search-blocklist/rules.ts の上限値
const SEARCH_BLOCKLIST_RULE_LIMIT = 2000;
const SEARCH_BLOCKLIST_PATTERN_MAX_LENGTH = 255;
const SEARCH_BLOCKLIST_PATTERN_MAX_WILDCARDS = 3;
const SEARCH_BLOCKLIST_URL_MAX_LENGTH = 2048;
```

## コードレビューチェックリスト

PR レビュー時は以下の観点を確認してください。

### XSS 対策

- [ ] ユーザー入力や API 応答を `innerHTML` で挿入していないか
- [ ] `textContent`、`createElement`、`react-markdown` を使っているか
- [ ] `dangerouslySetInnerHTML` を使っていないか
- [ ] URL パラメータやクエリ文字列を未処理のまま DOM へ挿入していないか

### データ保護

- [ ] API トークンは `chrome.storage.local` に保存しているか
- [ ] 機密情報をコンソールログに出力していないか
- [ ] ユーザー入力を外部サービスへ送信する経路が意図どおりか

### 入力検証

- [ ] ユーザー入力の長さ制限を設けているか
- [ ] 型検証を行っているか
- [ ] URL や数値の妥当性を検証しているか
- [ ] ユーザー入力から `RegExp` を構築していないか（件数・長さの上限と、超過時の明示エラーがあるか）

## 定期チェックコマンド

```bash
# 依存関係の脆弱性チェック
pnpm audit

# innerHTML の使用箇所を検索
grep -r "innerHTML" src/

# eval の使用箇所を検索
grep -r "eval(" src/
```

## 参考資料

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/develop/concepts/security)
- [Content Security Policy (CSP)](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)

## 脆弱性を見つけたときの対応

XSS やセキュリティ上の問題を発見した場合は、以下の手順で優先的に対処します。

1. 影響範囲の特定: どの機能・権限に影響するかを切り分ける
2. 修正と検証: 再現テストを追加したうえで修正パッチを最優先で作成する
3. 反映と周知: 必要に応じてバージョンを更新し、変更履歴や案内を残す

---

最終更新: 2026-02-13（ガイドラインは実装の変化に合わせて定期的に見直してください）
