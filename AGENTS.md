# Browser Toolkit 開発ガイド

このドキュメントは、AI エージェントが Browser Toolkit の構成と開発方針を把握し、一貫した変更を行うための入口です。

## プロジェクト概要

Browser Toolkit は、個人用の Chrome 拡張機能（Manifest V3）です。日々のブラウザ作業でよく使う機能をひとつの拡張機能にまとめています。

### 主な機能

- サイト別機能: テーブルソート（動的テーブル対応・行フィルタリング）とフォーカス維持
- AI 連携: Context Actions（要約・翻訳・コードレビュー・カスタムアクション）、カレンダー登録、Gemini で要約
- 日常ユーティリティ: リンク作成、QR コード生成、検索エンジン／まとめて検索、テキストテンプレート、アクション履歴
- ページ体験の改善: Google 検索結果ブロックリスト、X の画像ズーム・元画像保存

## 開発前に必読

詳細な仕様やルールは `docs/`、`.claude/rules/`、`DESIGN.md` に分けて管理しています。**コードを変更する前に、該当する正本を必ず確認してください。**

### 必読ドキュメント

1. [docs/architecture.md](docs/architecture.md)
   - ランタイム境界、AI 統一インターフェース、ストレージ書き込みとマイグレーション、主要コンポーネント
   - Chrome Extension MV3 における Service Worker・コンテンツスクリプト・ポップアップ／オプションページの責務
2. [docs/context-actions.md](docs/context-actions.md)
   - Context Actions の対象テキスト解決、AI プロバイダーへの送信範囲、組み込みアクション
   - カレンダー抽出の仕様とプライバシー上の注意点
3. [.claude/rules/development.md](.claude/rules/development.md) / [.claude/rules/security.md](.claude/rules/security.md)
   - TypeScript、`Result` 型、XSS 対策、機密情報の扱いなど実装時の安全ルール

## Source Of Truth

長期的に維持する仕様やルールを参照・更新するときは、まず下表で正本を確認してください。開発ワークフロー、参照先の案内、正本の一覧は `AGENTS.md` に集約し、個別の詳細仕様や運用ルールはそれぞれの正本に置きます。

| 対象 | 正本 | 用途 |
| --- | --- | --- |
| エージェントの入口（entrypoint） | `AGENTS.md` | AI エージェントが最初に読む入口。高レベルな案内を集約 |
| 開発ワークフロー・参照先・正本一覧 | `AGENTS.md` | 開発時の基本ルール、正本表、ドキュメント間の案内 |
| AI 向けリポジトリマップ | `llms.txt` | ランタイム境界・主要ソースパス・コマンドの簡潔な索引 |
| 製品スコープ・利用者向け仕様 | `README.md`, `docs/context-actions.md` | 機能範囲、利用者向け説明、Context Actions の送信範囲とプライバシー方針 |
| プライバシーポリシー | `docs/privacy-policy.html` | ストア提出・利用者向けの情報取り扱い方針 |
| 技術アーキテクチャ・実行方針 | `docs/architecture.md`, `.claude/rules/development.md` | Chrome Extension MV3、ランタイム境界、ストレージ、AI プロバイダー、品質ゲート |
| コード構成・配置ルール | `AGENTS.md`, `docs/architecture.md`, ソースツリー | ディレクトリ構成、エントリポイントの責務、機能配置、命名規則 |
| コーディング規約・セキュリティ | `.claude/rules/development.md`, `.claude/rules/security.md` | TypeScript、`Result` 型、XSS 対策、機密情報の扱いなどの実装ルール |
| UI デザインシステム | `DESIGN.md` | ポップアップ・オーバーレイ・共有 UI の視覚ルール、Design Tokens、Storybook 参照 |
| UI デザインレビュー手順 | `DESIGN_REVIEW.md` | `DESIGN.md`・共有 UI・機能固有実装の振り分け、Storybook 確認、レビュー手順 |
| UI 表示文言 | `src/i18n/resources.ts` | i18next で読み込む表示文言と翻訳キー |
| ポップアップ・オーバーレイ共有 UI | `src/components/`, `src/ui/`, `src/styles/` | 共有 React コンポーネント、テーマ、トースト、Shadow DOM スタイル |
| スタイルトークン・テーマ仕様 | `docs/style-management.md` | Design Token の階層、テーマ切り替え、ShadowRoot へのスタイル適用 |
| スタイルトークン実装 | `src/styles/`, `src/ui/theme.ts` | トークン CSS、テーマ適用、ShadowRoot スタイルシート連携の実装 |
| Context Actions 仕様 | `docs/context-actions.md` | 実行経路、対象解決、組み込みアクション、カレンダー連携の仕様 |
| Context Actions 実装・プロンプト | `src/context_actions.ts`, `src/prompts/` | アクションの既定値と AI プロンプトテンプレート（表示文言とは分離） |
| ストレージスキーマ・マイグレーション | `src/storage/`, `src/storage/migrations.ts`, `src/schemas/` | ストレージ構造、マイグレーション、実行時バリデーション |
| 検索結果ブロックリスト | `src/search-blocklist/`, `src/content/search-blocklist-ui/` | ブロック判定ロジック、ルール構文、検索エンジン別アダプター、浮動 UI・ダイアログ・件数バー |
| 画像ズーム（X） | `src/image-zoom/` | X の写真表示での全画面ズームビューア、元画像 URL 解決とダウンロード依頼 |
| フォーカス維持 | `src/focus-override/` | 非アクティブタブを表示中扱いとするスクリプト注入とパターン管理 |
| 手動 E2E テスト手順 | `docs/e2e-test-checklist.md` | 実ブラウザでの手動 E2E 確認項目 |
| アイコン・ロゴ管理 | `docs/icon-setup.md` | アイコン画像の生成・差し替え手順 |
| 未使用コード監査（Knip） | `docs/knip.md` | Knip の report-only 運用とエントリ設定・トリアージ記録 |
| セットアップ・使い方（利用者向け） | `README.md` | インストール、使い方、開発環境構築、利用者向けの機能紹介 |
| Chrome Web Store 提出 | `scripts/package-cws.mjs`, `scripts/publish-cws.mjs`, `.github/workflows/publish-cws.yml` | 提出用 zip 生成、Chrome Web Store API v2 アップロード・審査提出 |
| ビルド・検証コマンド | `package.json`, `mise.toml` | スクリプト定義、CI 相当の検証手順、ツールバージョン |
| ビルド出力 | `dist/` | 生成物（正本ではない） |

新しいルールや仕様を追加するときは、表に示した正本へ記載してください。表示文言は `src/i18n/resources.ts` に置き、UI 層で `t()` を通じて解決します。AI プロンプトは `src/prompts/`、ストレージキーとマイグレーションは `src/storage/`、実行時バリデーションは `src/schemas/`、プロトコル上の識別子や既存データ互換のための正規表現は担当モジュールに置き、UI 表示文言とは混同しないでください。

## Release / Permission Review

`manifest.json` の権限や `host_permissions` を変更する場合は、実装前に以下を確認してください。

- `<all_urls>` は、全ページでのテーブルソート、選択テキストの取得、ページ本文へのフォールバック、Shadow DOM オーバーレイの表示に使っています。より狭い match pattern へ変更する場合は、これらの既存機能が対象外ページで壊れないかを検証してください。
- `scripting` はアクティブタブへの機能注入（フォーカス維持や Gemini への自動入力を含む）、`downloads` は `.ics` や元画像などのファイル保存、`notifications` はユーザー向け通知、`alarms` は Manifest V3 Service Worker の復帰補助に使っています。未使用に見える権限を削る前に、対応する処理経路を `src/background.ts`、`src/content.ts`、`src/popup/` から確認してください。
- ChatGPT プラン（Sign in with ChatGPT）はトークン取得と失効処理に `https://auth.openai.com` を使います。認可コードはループバックリダイレクト（`http://127.0.0.1:1455/auth/callback`）のタブ URL を `tabs.onUpdated` で読み取って受け取っており、この読み取りは既存の `<all_urls>` に依存します（`tabs` 権限は追加していません）。
- `https://gemini.google.com/*` は、右クリックメニューの「Geminiで要約」で `chrome.tabs.create` により開いたタブへ `chrome.scripting.executeScript` でプロンプトを注入するために使っています。拡張機能ページから `fetch` する経路はないため、`content_security_policy.connect-src` には含めません。
- AI プロバイダーの API エンドポイントを追加・変更するときは、`src/constants/api-endpoints.ts` の `ALLOWED_API_ORIGINS`、`manifest.json` の `host_permissions`、`content_security_policy.connect-src` を同じ差分で揃えてください。
- Chrome Web Store へ外部配布する際は、強い権限を要求する理由をストアの説明や `docs/privacy-policy.html` へそのまま転記できる粒度で残してください。
- `content_scripts` は 3 エントリ構成です。全ページ向けの `dist/content.js`（`document_idle`）に加え、検索結果ブロックリスト用の `dist/search-blocklist.js` を `*://www.google.com/search*` と `*://www.google.co.jp/search*` に限定して `document_start` で注入しています。`<all_urls>` の `host_permissions` はこの 2 本目のために広げたものではなく、既存の全ページ機能向けです。
- 3 エントリ目は画像ズーム用の `dist/image-zoom.js` で、`*://x.com/*` と `*://twitter.com/*` に限定して既定の `document_idle` で注入しています。元画像の保存には既存の `downloads` 権限を使い、background 側で `https://pbs.twimg.com/media/` 以外の URL を拒否します。新たな権限は追加していません。

## 技術スタック（概要）

- プラットフォーム: Chrome Extension（Manifest V3）
- 言語: TypeScript（strict mode）
- UI: React + Base UI（`@base-ui/react`）
- ビルド: esbuild
- テスト: Vitest（ユニットテスト + Storybook テスト）、Playwright（E2E）
- フォーマット・Lint: Ultracite（Biome）

詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

## コードベース構造（概要）

### ランタイム境界

- コンテンツスクリプト: ページの DOM 操作、オーバーレイ表示、テーブルソート、検索結果ブロック、X の画像ズーム
- Background Worker: 特権 API（`chrome.contextMenus`、AI API への `fetch`、ストレージ・認証管理など）
- ポップアップ / オプションページ: 日常操作、設定画面、カスタムアクション・検索先・テンプレート管理

詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

## 開発時の注意点

### Chrome 拡張機能特有の制約

- ランタイム境界: コンテンツスクリプト・Background・ポップアップ／オプションページはそれぞれ独立した実行環境
- メッセージパッシング: ランタイム間は `chrome.runtime.sendMessage` で通信
- Storage API: `chrome.storage.sync`（同期対象）と `chrome.storage.local`（端末ローカル）を用途に応じて使い分け
- Manifest V3: Service Worker ベースのバックグラウンド処理

### コーディング規約

- TypeScript strict mode: 型安全性を優先
- エラーハンドリング: `@praha/byethrow` の `Result` / `ResultAsync` パターンを使用
- 非同期処理: `async` / `await` を優先
- UI テキスト: 日本語で統一
- フォーマット: Ultracite（Biome）

詳細は [.claude/rules/development.md](.claude/rules/development.md) を参照してください。

## コード変更時のチェックリスト

1. **理解**: 該当する正本ドキュメントに目を通したか
2. **設計**: 既存のパターンやランタイム境界に沿っているか
3. **セキュリティ**: XSS 対策や入力検証を実装したか
4. **テスト**: ユニットテストを追加し、必要に応じて手動確認を行ったか
5. **品質**: 単独作業なら `mise run ci` を通したか。並行セッションがある場合はツリー全体を整形し直す `mise run ci` を避け、個別の lint・テストと差分に限ったフォーマットで確認したか
6. **ドキュメント**: 仕様や構成が変わった場合に関連する正本を更新したか

UI、ポップアップ、オーバーレイ、Design Token、共有コンポーネントを変更した場合は、PR 前に `mise run test:storybook` の実行も必須とします。GitHub Actions では Storybook やブラウザ系のチェックは手動実行が中心になっているため、PR 時点での UI 回帰はローカル検証で補います。

## 開発フロー

```bash
# 1. 依存関係のインストール
pnpm install

# 2. ウォッチビルド（開発中）
pnpm run watch

# 3. Storybook（UI 開発）
pnpm run storybook

# 4. 品質チェック（ローカル）
mise run ci

# 5. ビルド（リリース前）
mise run build
```

---

重要: このドキュメントは全体の概要です。詳細は Source Of Truth 表で該当する正本を確認してください。
