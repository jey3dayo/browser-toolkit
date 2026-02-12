# Browser Toolkit - Claude 開発ガイド

このドキュメントは、Claudeがこのプロジェクトを理解し、適切なコード変更を行うための包括的なガイドです。

## 📋 プロジェクト概要

Browser Toolkitは、個人用のChrome拡張機能（Manifest V3）です。Webページに便利な機能を追加し、日常的な作業を効率化します。

### 主要機能

- **テーブルソート**: クリックでテーブルをソート（動的テーブルにも対応）
- **Context Actions**: OpenAI連携で選択テキストの要約・翻訳・カレンダー抽出
- **リンクユーティリティ**: タブのタイトル+URLを簡単にコピー

## 🎯 開発前に必読

プロジェクトの詳細な仕様・設計は `.kiro/steering/` 配下に整理されています。**コード変更前に必ずこれらを参照してください**:

### 必読ドキュメント

1. **[.kiro/steering/tech.md](.kiro/steering/tech.md)**
   - 技術スタック、ビルド設定、ランタイム境界
   - TypeScript/esbuildの設定、Storage API、OpenAI連携の実装詳細
   - エラーハンドリングパターン、品質ゲート

2. **[.kiro/steering/product.md](.kiro/steering/product.md)**
   - プロダクトの目的と価値
   - 各機能の仕様とUX原則
   - データ・プライバシーポリシー

3. **[.kiro/steering/structure.md](.kiro/steering/structure.md)**
   - プロジェクト構成とディレクトリ構造
   - エントリーポイント（background/content/popup）の責務
   - コーディングパターンと命名規則

## 🛠️ 技術スタック（概要）

- **プラットフォーム**: Chrome Extension (Manifest V3)
- **言語**: TypeScript (strict mode)
- **UI**: React + Base UI (`@base-ui/react`)
- **ビルド**: esbuild
- **テスト**: Vitest (unit + Storybook tests)
- **フォーマット/Lint**: Ultracite (Biome)

**詳細**: `.kiro/steering/tech.md` を参照

## 🎨 プロダクト理解（概要）

### プロジェクトの目的

小さな、高レバレッジなユーティリティを提供し、最小限のセットアップで日常のブラウジングを効率化します。

### UX原則

- **その場で機能**: ポップアップとコンテキストメニューから機能にアクセス
- **日本語ファースト**: UI文字列とデフォルトプロンプトは日本語
- **テーマ一貫性**: ライト/ダークテーマをポップアップとページ内UIで統一
- **明確なエラー表示**: 失敗時は明確なメッセージを表示

**詳細**: `.kiro/steering/product.md` を参照

## 📁 コードベース構造（概要）

### ディレクトリ構成

```
browser-toolkit/
├── manifest.json           # 拡張機能マニフェスト
├── src/
│   ├── background.ts       # Service worker（コンテキストメニュー、OpenAI呼び出し）
│   ├── content.ts          # Content script（テーブルソート、オーバーレイ）
│   ├── popup.ts            # ポップアップ（React root）
│   ├── background/         # Background worker モジュール
│   ├── content/            # Content script モジュール（overlay等）
│   ├── popup/              # ポップアップ UI（pane-based）
│   ├── components/         # 共有 React コンポーネント
│   ├── ui/                 # テーマ、スタイル、toast
│   ├── openai/             # OpenAI設定
│   ├── storage/            # Storageスキーマ型定義
│   └── prompts/            # 組み込みアクションプロンプト（TOML）
├── .kiro/steering/         # 技術・プロダクト・構造の詳細ドキュメント
└── .claude/rules/          # 開発ルール（日本語）
```

### ランタイム境界

- **Content script**: ページのDOM操作、オーバーレイ表示、テーブルソート
- **Background worker**: 特権API（chrome.contextMenus、OpenAI fetch）
- **Popup**: 設定画面、カスタムアクション管理

**詳細**: `.kiro/steering/structure.md` を参照

## ⚠️ 開発時の重要な注意点

### セキュリティ

**重要**: 詳細なセキュリティガイドラインは [.claude/rules/security.md](.claude/rules/security.md) を参照してください。

- **XSS対策必須**: ユーザー入力をDOMに挿入する前に必ずエスケープ
- **innerHTML禁止**: `textContent` または `createElement` を使用
- **入力検証**: 長さ、文字種、形式をチェック
- **機密情報**: パスワード、トークンは `chrome.storage.local` に保存（同期しない）

### Chrome Extension特有の制約

- **ランタイム境界**: Content/Background/Popupは独立した実行環境
- **メッセージパッシング**: `chrome.runtime.sendMessage` で通信
- **Storage API**: `chrome.storage.sync`（同期可能）と `chrome.storage.local`（デバイスローカル）を使い分け
- **Manifest V3**: Service Worker ベースのbackground script

### コーディング規約

- **TypeScript strict mode**: 型安全性を最優先
- **エラーハンドリング**: `Result` / `ResultAsync` パターンを使用（`@praha/byethrow`）
- **非同期処理**: async/await を優先
- **UIテキスト**: 日本語で統一
- **フォーマット**: Ultracite（シングルクォート、広めの行幅）

**詳細な開発ルール**: [.claude/rules/development.md](.claude/rules/development.md) を参照

## 📚 関連ドキュメント

### ユーザー向け

- **[README.md](README.md)**: インストール、使い方、開発セットアップ

### 開発者向け

- **[docs/context-actions.md](docs/context-actions.md)**: Context Actions の詳細ガイド
- **[docs/icon-setup.md](docs/icon-setup.md)**: アイコン作成手順
- **[docs/style-management.md](docs/style-management.md)**: Design Tokens とテーマ管理

### 設計ドキュメント（必読）

- **[.kiro/steering/tech.md](.kiro/steering/tech.md)**: 技術仕様
- **[.kiro/steering/product.md](.kiro/steering/product.md)**: プロダクト仕様
- **[.kiro/steering/structure.md](.kiro/steering/structure.md)**: コードベース構造

### 開発ルール

- **[.claude/rules/development.md](.claude/rules/development.md)**: コーディング規約、セキュリティガイドライン、リリースフロー

## 🔍 コード変更時のチェックリスト

1. **理解**: 該当する `.kiro/steering/` ドキュメントを読んだか？
2. **設計**: 既存のパターン・アーキテクチャに従っているか？
3. **セキュリティ**: XSS対策、入力検証を実装したか？
4. **テスト**: ユニットテストを書いたか？手動テストを行ったか？
5. **品質**: `mise run ci` を実行したか（format + lint + test + build）？
6. **ドキュメント**: 必要に応じてドキュメントを更新したか？

## 📝 開発フロー

```bash
# 1. 依存関係インストール
pnpm install

# 2. ウォッチビルド（開発中）
pnpm run watch

# 3. Storybook（UI開発）
pnpm run storybook

# 4. 品質チェック（ローカル）
mise run ci

# 5. ビルド（リリース前）
mise run build
```

## 🎯 このドキュメントの使い方

1. **最初に読む**: プロジェクト全体像を理解
2. **コード変更前**: `.kiro/steering/` の関連ドキュメントを参照
3. **実装中**: `.claude/rules/development.md` でコーディング規約を確認
4. **テスト/リリース**: チェックリストを活用

---

**重要**: このドキュメントは概要です。詳細は必ず `.kiro/steering/` 配下のドキュメントを参照してください。
