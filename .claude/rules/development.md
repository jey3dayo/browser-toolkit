# Chrome拡張機能 開発ルール

このプロジェクトの開発における基本ルールとガイドラインです。

> **セキュリティガイドライン**: XSS対策、APIトークン保護、入力検証などの詳細は [security.md](security.md) を参照してください。

## 🏗️ プロジェクト構造

```
browser-toolkit/
├── .claude/
│   └── rules/          # 開発ルール（このディレクトリ）
├── dist/               # ビルド出力（自動生成）
├── docs/               # プロジェクトドキュメント
├── images/             # ロゴ/拡張機能アイコン
├── manifest.json       # 拡張機能マニフェスト
├── content.css         # コンテンツスクリプト用スタイル
├── popup.html          # ポップアップUI
├── popup_bootstrap.js  # popup読み込み（dist未生成時のガード含む）
├── options.html        # オプションページUI
├── options_bootstrap.js # options読み込み（dist未生成時のガード含む）
└── src/                # TypeScriptソース
    ├── background.ts
    ├── content.ts
    ├── popup.ts
    ├── options.ts
    └── styles/         # ポップアップ/共通UIスタイル（Design Tokens）
        ├── base.css
        ├── layout.css
        ├── utilities.css
        └── tokens/
            ├── primitives.css
            ├── semantic.css
            └── components.css
```

## 📝 コーディング規約

### TypeScript

- strict mode 前提。`any` と型アサーションを入れない（`unknown` + 型ガードへ）
- エラーは握りつぶさず、境界で `Result` / `ResultAsync`（`@praha/byethrow`）として返す
- 非同期は async/await
- フォーマットは Ultracite (Biome)

### HTML/CSS

- セマンティックHTML: 適切なタグを使用（div乱用を避ける）
- スタイルは `src/styles/tokens/` の design token 経由で当てる（生の値を直書きしない）
- ポップアップ幅は `--layout-popup-width`（`src/styles/tokens/semantic.css`）が正本
- アクセシビリティ: alt属性、aria属性を適切に設定

## 🎨 デザインガイドライン

カラー・タイポグラフィ・spacing の値は [DESIGN.md](../../DESIGN.md) と
`src/styles/tokens/` が正本。ここには重複させない（ライト/ダークで別 token を持つため、
単一の hex を書くと必ずずれる）。

## 🔒 セキュリティガイドライン

### XSS対策

- ユーザー入力のエスケープ必須: DOMに挿入する前に必ず処理
- innerHTML禁止: textContentまたはcreateElementを使用
- HTML 文字列を組み立てる箇所では `src/utils/link_format.ts` のエスケープ関数を使う

### バリデーション

- 入力検証: 長さ、文字種、形式をチェック
- ホワイトリスト方式: 許可する文字のみを受け入れる
- エラーメッセージ: ユーザーフレンドリーな表示

### ストレージ

- chrome.storage.sync: 同期したいユーザー設定（1 item 8,192 bytes 上限。`QUOTA_BYTES_PER_ITEM`）
- chrome.storage.local: API トークンとデバイスローカルなデータ
- API トークンは `chrome.storage.local` のみに保存し、`sync` へは置かない（詳細は [security.md](security.md)）

## 🧪 テスト方針

自動テストは `mise run ci`（format / lint / vitest / Storybook test / build）が正本。
以下はその上で手動確認する項目。

### 手動テスト項目

1. パターン登録・削除: 正常系、異常系（重複、上限）
2. URLマッチング: ワイルドカード、プロトコル
3. MutationObserver: 動的テーブル追加
4. 既存機能: 手動ボタン、グローバルフラグ
5. ブラウザ互換性: Chrome最新版で動作確認

### テストページ推奨

- [HTML Table Generator](https://www.tablesgenerator.com/html_tables)でテスト用テーブルを作成
- 動的追加テスト用のHTMLページを用意

## 📦 リリースフロー

### バージョニング

セマンティックバージョニング（SemVer）に従う:

- MAJOR: 破壊的変更
- MINOR: 新機能追加
- PATCH: バグ修正

### リリース前チェックリスト

- [ ] すべての機能が正常動作
- [ ] manifest.jsonのバージョン更新
- [ ] README.mdの更新
- [ ] 不要なconsole.logを削除
- [ ] アイコン・ロゴが正しく表示

## 🛠️ 開発Tips

### 拡張機能のリロード

```bash
# Chrome Extensions画面
chrome://extensions/

# 「更新」ボタンをクリック
# または Cmd+R（Mac）、Ctrl+R（Windows）
```

### デバッグ方法

- ポップアップ: 右クリック → 検証
- コンテンツスクリプト: ページの開発者ツール → Consoleタブ
- バックグラウンド: 拡張機能管理 → 「Service Workerを検証」

### よくあるエラー

#### "Could not load icon"

→ `images/` ディレクトリにアイコンファイルが存在するか確認

#### "Extension context invalidated"

→ 拡張機能がリロードされた。ページを再読み込み

#### chrome.storage is undefined

→ manifest.jsonに `"storage"` パーミッションがあるか確認

## 🔄 アセット更新

### アイコン更新

詳細は `docs/icon-setup.md` を参照

```bash
# 透過アイコン生成
magick images/logo.png -fuzz 10% -transparent white -resize 16x16 images/icon16.png
magick images/logo.png -fuzz 10% -transparent white -resize 48x48 images/icon48.png
magick images/logo.png -fuzz 10% -transparent white -resize 128x128 images/icon128.png
```

## 📚 参考リンク

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)

