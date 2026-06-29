# Browser Toolkit - Claude 開発ガイド

このドキュメントは、Claudeがこのプロジェクトを理解し、適切なコード変更を行うための包括的なガイドです。

## 📋 プロジェクト概要

Browser Toolkitは、個人用のChrome拡張機能（Manifest V3）です。Webページに便利な機能を追加し、日常的な作業を効率化します。

### 主要機能

- **テーブルソート**: クリックでテーブルをソート（動的テーブルにも対応）
- **Context Actions**: OpenAI連携で選択テキストの要約・翻訳・カレンダー抽出
- **リンクユーティリティ**: タブのタイトル+URLを簡単にコピー

## 🎯 開発前に必読

プロジェクトの詳細な仕様・設計は `docs/`、`.claude/rules/`、`DESIGN.md` に整理されています。**コード変更前に必ず関連する正本を参照してください**:

### 必読ドキュメント

1. **[docs/architecture.md](docs/architecture.md)**
   - ランタイム境界、AI統一インターフェース、Storage migration、主要コンポーネント
   - Chrome Extension MV3 と service worker / content script / popup の責務

2. **[docs/context-actions.md](docs/context-actions.md)**
   - Context Actions の対象解決、AI provider への送信範囲、組み込み action
   - カレンダー抽出、privacy 上の注意点

3. **[.claude/rules/development.md](.claude/rules/development.md)** / **[.claude/rules/security.md](.claude/rules/security.md)**
   - TypeScript、Result、XSS、secret handling、実装時の安全ルール

## Source Of Truth

耐久的な知識を読む・更新するときは、まずこの表で正本を決めてください。`AGENTS.md` は agent runtime の薄い入口です。実体となる workflow、source routing、SSoT 表は `CLAUDE.md` に集約し、詳細な仕様や運用ルールは対象ごとの正本に寄せます。

| 対象 | 正本 | 用途 |
| --- | --- | --- |
| Agent runtime entrypoint | `AGENTS.md` -> `CLAUDE.md` | agent runtime が最初に読む入口。実体は `CLAUDE.md` に集約 |
| Agent workflow / source routing / SSoT table | `CLAUDE.md` | 開発時の高レベルルール、正本表、entrypoint docs のルーティング |
| Product scope / user-facing behavior | `README.md`, `docs/context-actions.md` | 機能範囲、利用者向け説明、Context Actions の送信対象と privacy 方針 |
| Technical architecture / runtime policy | `docs/architecture.md`, `.claude/rules/development.md` | Chrome Extension MV3、runtime境界、storage、timeout、AI provider、品質ゲート |
| Code organization / placement | `CLAUDE.md`, `docs/architecture.md`, source tree | ディレクトリ構成、entrypoint責務、feature placement、命名規則 |
| Runtime coding rules / security | `.claude/rules/development.md`, `.claude/rules/security.md` | TypeScript、Result、XSS、secret handling などの実装ルール |
| Durable UI design system | `DESIGN.md` | popup / overlay / shared UI の再利用可能な視覚ルール、design tokens、Storybook reference |
| UI design review routing | `DESIGN_REVIEW.md` | `DESIGN.md` / shared UI / feature-local の振り分け、Storybook参照、レビュー手順 |
| UI display messages | `src/i18n/resources.ts` | i18next で読む表示文言と translation key |
| Popup / overlay shared UI | `src/components/`, `src/ui/`, `src/styles/` | 共有React部品、theme、toast、Shadow DOM styles |
| Style tokens / theme details | `docs/style-management.md` | design token layers、theme switching、ShadowRoot stylesheet integration の説明 |
| Style token implementation | `src/styles/`, `src/ui/theme.ts` | token CSS、theme適用、ShadowRoot stylesheet integration の実装 |
| Context Actions behavior | `docs/context-actions.md` | context action の実行経路、対象解決、組み込みaction、calendar handoff の仕様 |
| Context Actions implementation / prompts | `src/context_actions.ts`, `src/prompts/` | action defaults と AI prompt template。表示文言とは分けて扱う |
| Storage schema / migrations | `src/storage/`, `src/storage/migrations.ts`, `src/schemas/` | storage shape、migration、runtime validation |
| User-facing setup / usage | `README.md` | インストール、使い方、開発セットアップ、利用者向け機能説明 |
| Long-form architecture reference | `docs/architecture.md` | 詳細な設計解説。方針判断ではこの表の正本と実装を優先し、内容を整合させる |
| Build / verification commands | `package.json`, `mise.toml` | scripts、CI相当の検証、tool versions |
| Generated extension output | `dist/` | build artifact。source of truth ではない |

新しいルールや仕様を追加するときは、表の正本に入れてください。表示文言は `src/i18n/resources.ts` に置き、UI層で `t()` に解決します。AI prompt は `src/prompts/`、storage key と migration は `src/storage/`、runtime validation は `src/schemas/`、protocol marker や既存データ互換の正規表現はそれを所有する実装モジュールに置き、表示文言と混同しないでください。

## Release / Permission Review

`manifest.json` の権限や host permission を変更する場合は、実装前に以下を確認してください。

- `<all_urls>` は、全ページでのテーブルソート、選択テキスト取得、ページ本文フォールバック、Shadow DOM オーバーレイ表示に必要です。より狭い match pattern へ変更する場合は、これらの既存機能が対象外ページで壊れないかを明示的に検証してください。
- `scripting` は active tab への機能注入、`downloads` は `.ics` などのファイル出力、`notifications` はユーザー向け通知、`alarms` は Manifest V3 service worker の復帰補助に使います。未使用に見える権限を削る前に、対応する runtime path を `src/background.ts`、`src/content.ts`、`src/popup/` から確認してください。
- AI provider の endpoint を追加・変更するときは、`src/constants/api-endpoints.ts`、`manifest.json` の `host_permissions`、`content_security_policy.connect-src` を同じ差分で揃えてください。
- Chrome Web Store など外部配布に進む前は、強い権限の理由をリリース説明に転記できる粒度で残してください。

## 🛠️ 技術スタック（概要）

- **プラットフォーム**: Chrome Extension (Manifest V3)
- **言語**: TypeScript (strict mode)
- **UI**: React + Base UI (`@base-ui/react`)
- **ビルド**: esbuild
- **テスト**: Vitest (unit + Storybook tests)
- **フォーマット/Lint**: Ultracite (Biome)

**詳細**: [docs/architecture.md](docs/architecture.md) を参照

## 🎨 プロダクト理解（概要）

### プロジェクトの目的

小さな、高レバレッジなユーティリティを提供し、最小限のセットアップで日常のブラウジングを効率化します。

### UX原則

- **その場で機能**: ポップアップとコンテキストメニューから機能にアクセス
- **日本語ファースト**: UI文字列とデフォルトプロンプトは日本語
- **テーマ一貫性**: ライト/ダークテーマをポップアップとページ内UIで統一
- **明確なエラー表示**: 失敗時は明確なメッセージを表示

**詳細**: [README.md](README.md) と [docs/context-actions.md](docs/context-actions.md) を参照

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
├── docs/                   # architecture / feature / setup references
└── .claude/rules/          # 開発ルール（日本語）
```

### ランタイム境界

- **Content script**: ページのDOM操作、オーバーレイ表示、テーブルソート
- **Background worker**: 特権API（chrome.contextMenus、OpenAI fetch）
- **Popup**: 設定画面、カスタムアクション管理

**詳細**: [docs/architecture.md](docs/architecture.md) を参照

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

### 開発ルール

- **[.claude/rules/development.md](.claude/rules/development.md)**: コーディング規約、セキュリティガイドライン、リリースフロー

## 🔍 コード変更時のチェックリスト

1. **理解**: 該当する source of truth ドキュメントを読んだか？
2. **設計**: 既存のパターン・アーキテクチャに従っているか？
3. **セキュリティ**: XSS対策、入力検証を実装したか？
4. **テスト**: ユニットテストを書いたか？手動テストを行ったか？
5. **品質**: `mise run ci` を実行したか（format + lint + test + storybook test + build）？
6. **ドキュメント**: 必要に応じてドキュメントを更新したか？

UI、popup、overlay、design token、shared component を変更した場合は、PR 前に `mise run test:storybook` も必須確認として扱ってください。GitHub Actions では Storybook/browser checks が merge queue / manual に寄っているため、PR 時点の UI 回帰はローカル確認で補います。

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
2. **コード変更前**: Source Of Truth 表から関連ドキュメントを参照
3. **実装中**: `.claude/rules/development.md` でコーディング規約を確認
4. **テスト/リリース**: チェックリストを活用

---

**重要**: このドキュメントは概要です。詳細は必ず Source Of Truth 表で該当する正本を確認してください。
