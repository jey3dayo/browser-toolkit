---
paths:
  - "src/**/*.{ts,tsx}"
  - "manifest.json"
---

# Chrome 拡張機能 開発ルール

Browser Toolkit の開発における基本ルールとガイドラインをまとめています。

> **セキュリティガイドライン**: XSS 対策、API トークン保護、入力検証、ReDoS 対策の詳細は [security.md](security.md) を参照してください。

## プロジェクト構造

```
browser-toolkit/
├── .claude/
│   └── rules/             # 開発ルール・セキュリティルール
├── dist/                  # ビルド出力（自動生成）
├── docs/                  # プロジェクトドキュメント
├── images/                # 拡張機能アイコン・元画像
├── manifest.json          # 拡張機能マニフェスト（MV3）
├── content.css            # コンテンツスクリプト用スタイル
├── popup.html             # ポップアップ UI
├── popup_bootstrap.js     # ポップアップ読み込み（dist 未生成時のガードを含む）
├── options.html           # オプションページ UI
├── options_bootstrap.js   # オプションページ読み込み（dist 未生成時のガードを含む）
├── scripts/               # ビルド・開発サーバー・Chrome Web Store 提出スクリプト
└── src/                   # TypeScript ソース
    ├── background.ts
    ├── content.ts
    ├── search-blocklist.ts
    ├── image-zoom.ts
    ├── focus-override.ts
    ├── popup.ts
    ├── options.ts
    └── styles/            # ポップアップ・共通 UI スタイル（Design Tokens）
        ├── base.css
        ├── layout.css
        ├── utilities.css
        └── tokens/
            ├── primitives.css
            ├── semantic.css
            └── components.css
```

## コーディング規約

### TypeScript

- strict mode 前提で実装し、`any` や安易な型アサーションは使わない（`unknown` と型ガードで絞る）
- エラーを握りつぶさず、境界では `Result` / `ResultAsync`（`@praha/byethrow`）として返す
- 非同期処理は `async` / `await` を使う
- フォーマットは Ultracite（Biome）に従う

### HTML / CSS

- セマンティックな HTML を書き、`div` の乱用を避ける
- スタイルは `src/styles/tokens/` の Design Token 経由で指定し、生の値を直書きしない
- ポップアップ幅の正本は `--layout-popup-width`（`src/styles/tokens/semantic.css`）とする
- `alt` 属性や `aria` 属性を設定し、アクセシビリティを保つ

## デザインガイドライン

カラー、タイポグラフィ、余白の値は [DESIGN.md](../../DESIGN.md) と `src/styles/tokens/` を正本とします。ライト・ダークテーマで別々のトークンを持つため、単一のカラーコードなどをここに重複記載しないでください。

## セキュリティガイドライン

### XSS 対策

- ユーザー入力は DOM へ挿入する前に必ずエスケープする
- `innerHTML` は使わず、`textContent` や `createElement` を使う
- HTML 文字列を組み立てる箇所では `src/utils/link_format.ts` のエスケープ関数を使う

### バリデーション

- 入力値の長さ・文字種・形式を検証する
- 許可する値のみを受け入れるホワイトリスト方式を基本とする
- エラー時はユーザーが状況を把握しやすいメッセージを返す

### ストレージ

- `chrome.storage.sync`: デバイス間で同期したいユーザー設定（1 キーあたり 8,192 bytes 上限 / `QUOTA_BYTES_PER_ITEM`）
- `chrome.storage.local`: API トークン・OAuth 認証情報と端末固有のデータ
- API トークンや認証情報は必ず `chrome.storage.local` に保存し、`sync` には置かない（詳細は [security.md](security.md)）

## テスト方針

自動テストは `mise run ci`（format / actions lint・lock / lint / Vitest / Storybook テスト / build）を基準とします。

テストファイルの配置ルールは次のとおりです。

- 対象となる `src/<dir>/` に対応する `tests/<dir>/` へ配置する
- エントリポイント `src/<dir>.ts`（`background.ts`、`content.ts` など）のテストも同名の `tests/<dir>/` へ配置する
- 対応するディレクトリが無い `src/` 直下のモジュールのみ `tests/` 直下に配置する
- ビルド契約のテストは `tests/build/` に配置する
- jsdom が必要なテストは `*.dom.test.ts(x)` とする

実ブラウザでの手動確認が必要な変更では、[docs/e2e-test-checklist.md](../../docs/e2e-test-checklist.md) の該当項目を確認してください。

## リリースフロー

### バージョニング

セマンティックバージョニング（SemVer）に従います。出荷バージョンの正本は `manifest.json`（通常は `package.json` と揃えて更新）です。

- MAJOR: 破壊的変更
- MINOR: 後方互換性のある機能追加
- PATCH: 後方互換性のあるバグ修正

### リリース前チェックリスト

- [ ] `mise run ci` が通り、主要な機能が動作することを確認した
- [ ] `manifest.json`（および `package.json`）のバージョンを更新した
- [ ] 必要に応じて `README.md` や関連ドキュメントを更新した
- [ ] デバッグ用の不要な `console.log` を削除した
- [ ] アイコンが正しく表示されることを確認した

### Chrome Web Store 提出

GitHub Release を公開すると `.github/workflows/publish-cws.yml` が `pnpm run build` → `pnpm run package:cws` → `pnpm run publish:cws` を自動実行します。ローカルで提出用 zip を作成する場合は `pnpm run package:cws`（`tmp/browser-toolkit-<version>.zip` 出力）を使います。

## 開発のヒント

### 拡張機能のリロード

Chrome で `chrome://extensions/` を開き、拡張機能の「更新」ボタンをクリックします（自動リロードを使う場合は `pnpm run dev`）。

### デバッグ方法

- ポップアップ: ポップアップ上で右クリック →「検証」
- コンテンツスクリプト: 対象ページの開発者ツール → Console タブ
- バックグラウンド: `chrome://extensions/` →「Service Worker を検証」

### よくあるエラー

#### `"Could not load icon"`

`images/` ディレクトリに必要なアイコンファイル（`icon16.png`、`icon48.png`、`icon128.png`）が揃っているか確認してください。

#### `"Extension context invalidated"`

拡張機能がリロードされたことで、既に開いていたページのコンテンツスクリプトとの接続が切れています。対象ページを再読み込みしてください。

#### `chrome.storage is undefined`

`manifest.json` に `"storage"` 権限が含まれているか確認してください。

## アセット更新

アイコンの作成・差し替え手順は [docs/icon-setup.md](../../docs/icon-setup.md) を参照してください。

## 参考リンク

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
