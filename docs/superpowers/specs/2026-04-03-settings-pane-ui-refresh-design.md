# SettingsPane UI Refresh Design

- Date: 2026-04-03
- Target: `src/popup/panes/SettingsPane.tsx`
- Status: Approved in conversation

## Context

`設定` ペインは、AI プロバイダー、API トークン、モデル、追加指示、テーマを 1 つのフォーム列にまとめている。

現状でも機能はそろっているが、次の課題がある。

- 各設定のまとまりが弱く、どこから読むべきかが平坦に見える
- `保存`、`確認`、`削除` の操作優先度が視覚的に近い
- テーマ切替の選択肢が、意味の近さより実装都合に寄った並びになっている
- popup の限られた幅の中で、整理感より「フォームが続く印象」が先に立つ

今回の改善では、設定項目や runtime の挙動は変えず、情報設計と視覚階層を整理して、設定画面を落ち着いたカード UI に再構成する。

## Goals

- `設定画面の役割` と `現在の状態` を最初に把握できるようにする
- 設定項目をカード単位に分割し、1 かたまりずつ理解できるようにする
- `保存`、`トークン確認`、`削除` の強弱を見た目で区別できるようにする
- テーマ切替を `ダーク / ライト` 主導 + `自動` 補助の並びに整理する
- 既存の popup 幅でも詰まりすぎず、間延びもしないバランスにする

## Non-goals

- AI provider や token 保存ロジックの変更
- Storage schema や background message の変更
- 新しい設定項目の追加
- 設定値の意味を変える仕様変更
- 他ペインの全面的な UI リフレッシュ

## Chosen Direction

比較モック A をベースにした `バランス型カードレイアウト` を採用する。

採用理由:

- 現在の項目量を維持したまま、見た目の整理感を大きく改善できる
- popup の限られた縦幅でも、余白を増やしすぎずに階層を出せる
- フラット寄りの静かな見た目に寄せつつ、主操作だけを自然に目立たせられる

この方向では、画面の上部に小さな概要カードを置き、その下に 5 つの設定カードを積む。

1. AI プロバイダー
2. API トークン
3. モデル
4. 追加指示
5. テーマ

## Layout Structure

### 1. Overview Card

最上段に、設定画面全体の役割を説明する概要カードを置く。

役割:

- `AI 設定はこの端末のみ保存される` ことを最初に伝える
- 現在の `プロバイダー` と `テーマ` を短いチップで見せる
- 下の各カードに入る前の文脈をそろえる

このカードは説明を長くしすぎず、1〜2 行の要約に留める。

### 2. Setting Cards

各設定項目は独立したカードに分割し、次の順を基本形とする。

1. ラベルまたは小見出し
2. セクション見出し
3. 1 行の補足説明
4. 入力 UI
5. 操作ボタン

この型をそろえることで、ユーザーが別のカードに移っても同じ読み方を維持できるようにする。

### Provider Card

- `OpenAI / Anthropic / z.ai` を radio group で表示する
- 現在選択中の provider が最初に把握できるようにする
- 補足説明は最小限にし、選択 UI を主役にする

### Token Card

- トークン入力欄と表示切替トグルを中心に据える
- ボタンは次の優先度で整理する
  - 主: `保存`
  - 準主: `トークン確認`
  - 危険操作: `削除`
- 破壊的操作は別行または弱い強調にして、主要操作と誤認しないようにする

### Model Card

- 現在モデルを 1 目で読める select UI を中心に置く
- provider 変更時のモデル初期化ロジックはそのまま保つ

### Custom Prompt Card

- `追加指示（オプション）` として、主設定より 1 段補助的に見せる
- textarea は現状の実用性を保ちつつ、余白だけ整理する

### Theme Card

- テーマ切替は `ダーク / ライト` を横並びの主選択として上段に置く
- `自動` は OS 設定追従の補助モードとして下段に置く
- 3 択を同じ見た目で並べるのではなく、役割差を見せる

## Visual Design

`ui-ux-pro-max` の推奨に合わせ、フラット寄りで静かな見た目を採用する。

### Principles

- 主色はティール系に寄せる
- 強い影や派手なグラデーションは避ける
- カードの区切りは `面差 + 薄い境界線 + 余白` で表現する
- popup 幅に対して余白を広げすぎず、情報密度を保つ

### Button Hierarchy

- `保存`: ティール背景の主ボタン
- `トークン確認`: 白または淡色背景の補助ボタン
- `削除`: オレンジ寄りの弱い危険操作

危険色は削除のような限定的な場面にだけ使い、画面全体のアクセントにはしない。

### Color Roles

- Primary: ティール系。保存、選択中、主要状態表示
- Soft Accent: 淡いグリーン系。補助背景、概要カード、補助チップ
- Surface: 白ベース。カード本体
- Danger: 薄いオレンジ系。削除操作

## Expected Component Changes

### JSX Changes

- `SettingsPane` のトップレベル構造を `overview + stacked cards` に再編する
- 各 fieldset を、視覚的には独立カードとして見える wrapper に入れ直す
- Token card のボタン配置を強弱がわかる形に組み替える
- Theme card の選択肢配置を `ダーク / ライト` 上段、`自動` 下段に変更する

### Style Changes

主に次の CSS ファイルで対応する想定:

- `src/styles/tokens/components/popup-layout.css`
- `src/styles/tokens/components/popup.css`
- `src/styles/tokens/components/popup-controls.css`
- 必要に応じて `src/styles/tokens/components/popup-misc.css`

追加・調整したいスタイルの種類:

- SettingsPane 専用 card wrapper
- Overview card の見た目
- Token card の button hierarchy
- Theme card の 2 + 1 配列
- 補助説明文、ラベル、区切り線、内部余白

### State / Logic Constraints

ロジック変更は行わない。

維持するもの:

- storageLocalGet / Set / Remove の使い方
- provider ごとの token key 切り替え
- token 保存、削除、確認の flow
- model の normalize と保存
- theme の apply / persist

許容範囲:

- DOM の並び替え
- className 追加
- 表示用の短い補助テキスト追加

## Testing Strategy

### Story / Visual Validation

- `SettingsPane` story でカード分割、ボタン強弱、テーマ並びを確認する
- 可能なら populated state を作り、provider / token / model / theme の見え方を 1 画面で確認できるようにする

### Automated Checks

- `SettingsPane` story の既存 play test が壊れないことを確認する
- `SettingsPane` 周辺に DOM 契約テストを追加する場合は、主に次を確認する
  - 概要カードが存在する
  - 設定カードが 5 ブロックに分かれる
  - token card で `保存` が主ボタンとして出ている
  - theme card が `ダーク / ライト` 上段、`自動` 下段になっている

想定コマンド:

```bash
pnpm vitest run src/popup/panes/SettingsPane.stories.tsx
pnpm run typecheck
pnpm run lint
```

必要に応じて、popup 関連 unit test を追加する。

## Risks

- カード分割を強くしすぎると popup の縦スクロールが増える
- Token card のボタン再配置で既存テストの DOM 前提が崩れる可能性がある
- Theme card を 2 + 1 にすることで、実装側が既存 radio group のままだと CSS 調整が増える
- 淡色ベースに寄せすぎると、ダークテーマ時のコントラスト調整が追加で必要になる

## Review Notes

- ユーザーは `見た目の整理感` を最優先とした
- 比較モックでは A `整理されたカード型` を選択した
- 密度は `ui-ux-pro-max` の推奨バランスに寄せることで合意した
- テーマ切替について、ユーザーから `ダーク / ライト` を上段、`自動` を下段にしたいという明確なフィードバックがあった
- 色と操作強弱については、`保存: 主`、`確認: 補助`、`削除: 危険操作` で合意した

## Implementation Exit Criteria

- `設定` ペインが `overview + 5 setting cards` 構成になっている
- 各カードが `見出し → 補足 → 入力 → 操作` の順でそろっている
- token card のボタン強弱が見た目で区別できる
- theme card が `ダーク / ライト` 上段、`自動` 下段になっている
- 既存の保存・確認・テーマ適用挙動は変わらない
- typecheck / lint / relevant tests の結果を提示できる
