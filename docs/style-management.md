---
type: reference
title: スタイル管理（Design Tokens）
description: Browser Toolkit の Design Token 階層、テーマ切り替え、ShadowRoot へのスタイルシート適用とモーダル制御を説明する。
resource: urn:browser-toolkit:docs:style-management
tags:
  - category/design-system
  - audience/developer
timestamp: 2026-11-27
audience: developer
owner: browser-toolkit
---

# スタイル管理（Design Tokens）

Browser Toolkit では、UI のスタイルを **Design Tokens**（CSS カスタムプロパティ）と、実行時テーマ切り替え用の `data-theme` 属性で管理しています。

このトークン体系は次の両方で共通利用しています。

- 拡張機能のポップアップおよびオプションページ（ドキュメントレベルの CSS）
- コンテンツスクリプトが Web ページ上に注入する ShadowRoot UI（オーバーレイ、トースト、検索結果ブロック UI、X の画像ズームビューア）

## トークンの 3 層構造

トークンは役割ごとに 3 層に分けています。

1. **Primitive tokens**（`src/styles/tokens/primitives.css`）
   - パレット色、余白、角丸、影、タイポグラフィなどの物理的な基準値
2. **Semantic tokens**（`src/styles/tokens/semantic.css`）
   - 背景面・文字色・枠線・アクセント色など用途別の値（ライト・ダークの各テーマに対応）
3. **Component tokens**（`src/styles/tokens/components.css`）
   - ボタン・入力欄・カードなどのコンポーネント固有トークンと、ポップアップ・ShadowRoot 間で共有するコンポーネントスタイル（トースト、オーバーレイなど）

## テーマ切り替え（`data-theme`）

テーマの切り替えには `data-theme="dark"` または `data-theme="light"` を使います。`data-theme` 属性がない場合は、`prefers-color-scheme` に従ってシステムテーマに追従します（自動）。

- ポップアップ・オプションページ: `document.documentElement` に適用
- ShadowRoot UI: `shadowRoot.host` に適用

実装箇所:

- `src/ui/theme.ts`: `applyTheme()` と `Theme` 型を提供
- `src/popup/bootstrap.ts`（`src/popup.ts` / `src/options.ts` から呼び出し）: 保存済みのテーマ（既定は `auto`）を読み込み、起動時に適用
- `src/popup/panes/SettingsPane.tsx`: 自動・ライト・ダークの選択 UI を提供し、`chrome.storage.local` へ保存
- `src/content.ts`: 保存済みのテーマ（既定は `auto`）を読み込み、注入した ShadowRoot UI（オーバーレイ、トーストなど）へ適用

## スタイルシート構成

ポップアップおよびオプションページ向けの CSS は責務ごとに分割しています。

- `src/styles/base.css`: ドキュメントの基本設定（リセット、レイアウトに依存する基本変数）
- `src/styles/layout.css`: 画面レイアウト（アプリシェル、サイドバー、ドロワー、ヘッダー）
- `src/styles/utilities.css`: 小さなユーティリティクラス（`.stack`、`.row-between` など）
- `src/styles/tokens/components.css`: ポップアップと ShadowRoot の両方で共有するコンポーネントスタイル

## ShadowRoot への適用

### マウントとスタイル読み込み

`src/ui/shadow-host.ts` の `ensureShadowHost` がホスト用 `<div>` と `ShadowRoot` の検索・生成を担います。このモジュール自体はスタイルや i18n を import しません。`src/content/shadow_mount.ts` の `ensureShadowMount` と `src/image-zoom/mount.ts` の `ensureViewerShadowMount` は、いずれも `ensureShadowHost` を土台にスタイルとテーマを適用します。

ShadowRoot UI は用途に応じて次の 2 つの関数を使い分けます。

- `src/ui/styles.ts`（`ensureShadowUiBaseStyles`）: Primitive + Semantic + 全コンポーネント CSS を読み込みます。オーバーレイやトーストなど、共有コンポーネントを使う UI 向けです。
- `src/ui/styles-tokens.ts`（`ensureShadowTokenStyles`）: Primitive + Semantic のみに加え、呼び出し側が渡す `extraCss` とその識別子 `id` を読み込みます。全コンポーネント CSS を入れるとバンドルが膨らむ `src/image-zoom/mount.ts` などで使います。**呼び出し側の契約として、同じ `extraCss` の `id` には常に同じ CSS 文字列を渡してください。** 構築したスタイルシートは `id` ごとにキャッシュされるため、同一 `id` で別の CSS を渡しても 2 回目以降は無視されます。

各トークン・コンポーネント・追加 CSS のテキストは、モジュールスコープ（または `extraCss` の `id` ごとの遅延キャッシュ）で 1 つだけ `CSSStyleSheet` インスタンスを構築し、`adoptedStyleSheets` 経由で各 ShadowRoot へ共有適用します。ShadowRoot ごとに再生成はしません。

`CSSStyleSheet` 構築に対応していない環境（jsdom など）では、同じ CSS をインライン `<style>` タグとして挿入します。`adoptedStyleSheets` が使える環境でも、適用後に `shadowHasTokens` がホスト要素の `--mbu-surface` の計算値を検証し、値が空であれば安全策として `<style>` タグのフォールバックを重ねます。ホストが DOM 未接続のときや `getComputedStyle` 未対応の環境ではこの確認を省略します。いずれの経路も `<link rel="stylesheet">` は使わず、`<link>` による読み込みはドキュメントレベルのポップアップ・オプションページ経路（`ensurePopupUiBaseStyles`）だけで行います。

### モーダル ShadowRoot のキーボード・フォーカス制御

モーダル型の ShadowRoot UI では、Tab トラップ、Escape での終了、ページ側キーイベントの遮断、閉じた際のフォーカス復元を `src/ui/modal-controller.ts` の `activateModal` に集約しています。現在は `src/content/qrcode-overlay.ts` と `src/image-zoom/viewer.ts` の両方でこの関数を利用しています。

この 2 ファイルは別バンドル（`content.js` と `image-zoom.js`）として出力されますが、同じ拡張機能の isolated world で動作します。そのため、最前面のモーダル管理にはモジュールスコープ変数ではなく、`globalThis` 上のスタック（`__MBU_MODAL_STACK__`、`src/types/globals.d.ts` で型宣言）を使っています。キーイベントの遮断は、document・要素のリスナーと、モーダルを開いた後に登録された window-capture リスナーに適用されます。モーダルを開く前から登録されていた window-capture リスナーには先にイベントが届くため、遮断できません。

### Base UI の Portal に関する注意

Base UI の `Portal` は既定で `document.body` 配下に描画されるため、そのまま使うと ShadowRoot の外に出てスタイルが外れます。ShadowRoot 内で Portal を持つコンポーネント（`Dialog`、`Toast` など）を描画するときは、対象の ShadowRoot を明示的に `container` として渡してください。実装例は `src/ui/toast.tsx`（`Toast.Portal container`）と `src/components/shared/Dialog.tsx`（`portalContainer` prop）を参照してください。

## 互換用エイリアス変数

`src/styles/tokens/semantic.css` には、段階的な移行中に既存スタイルを壊さないための互換エイリアス（`--bg`、`--panel`、`--text`、`--mbu-*` など）を一部残しています。新規スタイルでは現行の Semantic tokens を使ってください。
