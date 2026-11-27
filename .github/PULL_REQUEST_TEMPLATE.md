## 概要

<!-- 変更内容の概要と背景を記載 -->

## 種別

- [ ] feat (新機能)
- [ ] fix (バグ修正)
- [ ] refactor (リファクタリング)
- [ ] docs (ドキュメント)
- [ ] chore (その他・依存更新・CI 等)

## 影響範囲

- [ ] Background Worker (`src/background*`)
- [ ] Content Script (`src/content*`, `src/search-blocklist*`, `src/image-zoom*`, `src/focus-override*`)
- [ ] Popup / Options UI (`src/popup*`, `src/options*`, `src/components/`, `src/styles/`)
- [ ] Manifest / 権限 (`manifest.json`)
- [ ] CI / スクリプト (`.github/`, `scripts/`)
- [ ] ドキュメント (`README.md`, `AGENTS.md`, `docs/`, `.claude/rules/`)

## 関連 Issue

<!-- fixes #123 形式で記載、複数ある場合は改行 -->

## 確認済み

- [ ] `mise run ci`（または該当範囲の lint / typecheck / test / build）を通過
- [ ] UI 変更時: `mise run test:storybook` を通過
- [ ] 必要に応じて実ブラウザで動作確認済み
