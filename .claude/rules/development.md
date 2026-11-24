---
paths:
  - "src/**/*.{ts,tsx}"
  - "manifest.json"
---

# Chrome 拡張機能 開発ルール

このプロジェクトの開発における基本ルールとガイドラインをまとめています。

> **セキュリティガイドライン**: XSS 対策、API トークン保護、入力検証などの詳細は [security.md](security.md) を参照してください。

## プロジェクト構造

```
browser-toolkit/
├── .claude/
│   └── rules/           # 開発ルール（このディレクトリ）
├── dist/                # ビルド出力（自動生成）
├── docs/                # プロジェクトドキュメント
├── images/              # ロゴ・拡張機能アイコン
├── manifest.json        # 拡張機能マニフェスト
├── content.css          # コンテンツスクリプト用スタイル
├── popup.html           # ポップアップ UI
├── popup_bootstrap.js   # ポップアップ読み込み（dist 未生成時のガードを含む）
├── options.html         # オプションページ UI
├── options_bootstrap.js # オプションページ読み込み（dist 未生成時のガードを含む）
└── src/                 # TypeScript ソース
    ├── background.ts
    ├── content.ts
    ├── popup.ts
    ├── options.ts
    └── styles/          # ポップアップ・共通 UI スタイル（Design Tokens）
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

- strict mode 前提で実装し、`any` や型アサーションは使わない（`unknown` と型ガードで絞る）
- エラーを握りつぶさず、境界では `Result` / `ResultAsync`（`@praha/byethrow`）として返す
- 非同期処理は `async` / `await` を使う
- フォーマットは Ultracite（Biome）に従う

### HTML / CSS

- セマンティックな HTML を書き、`div` の乱用を避ける
- スタイルは `src/styles/tokens/` の Design Token 経由で指定し、生の値を直書きしない
- ポップアップ幅の正本は `--layout-popup-width`（`src/styles/tokens/semantic.css`）とする
- `alt` 属性や `aria` 属性を適切に設定し、アクセシビリティを保つ

## デザインガイドライン

カラー、タイポグラフィ、余白の値は [DESIGN.md](../../DESIGN.md) と `src/styles/tokens/` を正本とします。ライト・ダークテーマで別々のトークンを持つため、単一のカラーコードなどをここに重複記載しないでください。

## セキュリティガイドライン

### XSS 対策

- ユーザー入力は DOM へ挿入する前に必ずエスケープする
- `innerHTML` は使用せず、`textContent` や `createElement` を使う
- HTML 文字列を組み立てる箇所では `src/utils/link_format.ts` のエスケープ関数を使う

### バリデーション

- 入力値の長さ・文字種・形式を検証する
- 許可する値のみを受け入れるホワイトリスト方式を基本とする
- エラー時はユーザーが状況を理解しやすいメッセージを返す

### ストレージ

- `chrome.storage.sync`: デバイス間で同期したいユーザー設定（1 キーあたり 8,192 bytes 上限 / `QUOTA_BYTES_PER_ITEM`）
- `chrome.storage.local`: API トークンとデバイス固有のデータ
- API トークンは必ず `chrome.storage.local` に保存し、`sync` には置かない（詳細は [security.md](security.md)）

## テスト方針

自動テストは `mise run ci`（format / lint / Vitest / Storybook テスト / build）を基準とします。

テストファイルの配置ルールは次のとおりです。

- 対象となる `src/<dir>/` に対応する `tests/<dir>/` へ配置する
- エントリポイント `src/<dir>.ts`（`background.ts`、`content.ts` など）のテストも同名の `tests/<dir>/` へ配置する
- 対応するディレクトリが無い `src/` 直下のモジュールのみ `tests/` 直下に配置する
- ビルド契約のテストは `tests/build/` に配置する
- jsdom が必要なテストは `*.dom.test.ts(x)` とする

自動テストに加えて、以下の項目は必要に応じて手動で確認します。

### 手動テスト項目

1. パターン登録・削除: 正常系および異常系（重複、件数上限）
2. URL マッチング: ワイルドカード、プロトコルの扱い
3. `MutationObserver`: 動的に追加されるテーブルへの適用
4. 既存機能: 手動有効化ボタン、グローバル有効化フラグ
5. ブラウザ互換性: 最新の Chrome での動作確認

### テスト用ページの目安

- [HTML Table Generator](https://www.tablesgenerator.com/html_tables) でテスト用テーブルを作成して確認する
- 動的テーブル追加の確認には、スクリプトでテーブルを後挿入する HTML ページを使う

## リリースフロー

### バージョニング

セマンティックバージョニング（SemVer）に従います。

- MAJOR: 破壊的変更
- MINOR: 後方互換性のある機能追加
- PATCH: 後方互換性のあるバグ修正

### リリース前チェックリスト

- [ ] すべての機能が正常に動作することを確認した
- [ ] `manifest.json` のバージョンを更新した
- [ ] 必要に応じて `README.md` を更新した
- [ ] デバッグ用の不要な `console.log` を削除した
- [ ] アイコンやロゴが正しく表示されることを確認した

## 開発のヒント

### 拡張機能のリロード

Chrome で `chrome://extensions/` を開き、拡張機能の「更新」ボタンをクリックします（ショートカット: Mac は `Cmd+R`、Windows は `Ctrl+R`）。

### デバッグ方法

- ポップアップ: ポップアップ上で右クリック →「検証」
- コンテンツスクリプト: 対象ページの開発者ツール → Console タブ
- バックグラウンド: `chrome://extensions/` →「Service Worker を検証」

### よくあるエラー

#### `"Could not load icon"`

`images/` ディレクトリに必要なアイコンファイルが揃っているか確認してください。

#### `"Extension context invalidated"`

拡張機能がリロードされたことで古いコンテンツスクリプトとの接続が切れています。対象ページを再読み込みしてください。

#### `chrome.storage is undefined`

`manifest.json` に `"storage"` 権限が含まれているか確認してください。

## アセット更新

### アイコン更新

詳しい手順は `docs/icon-setup.md` を参照してください。

```bash
# 透過アイコンの生成
magick images/logo.png -fuzz 10% -transparent white -resize 16x16 images/icon16.png
magick images/logo.png -fuzz 10% -transparent white -resize 48x48 images/icon48.png
magick images/logo.png -fuzz 10% -transparent white -resize 128x128 images/icon128.png
```

## 参考リンク

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
