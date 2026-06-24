# DESIGN_REVIEW.md

## Purpose

このファイルは Browser Toolkit の UI 変更を review するときの運用ガイドです。永続的な見た目の正本は `DESIGN.md`、実装上の token 正本は `src/styles/`、運用・配置・例外判断はこのファイルに置きます。

## Scope

対象は popup、settings pane、shared React components、content script の overlay/toast です。

対象外:

- 機能仕様そのものの優先順位
- AI prompt や storage schema の設計
- 画面固有の一時 TODO
- 既存 UI と無関係な redesign 案

## Routing Rules

まず `DESIGN.md` を確認し、変更が reusable visual rule かどうかを判断する。

- 複数 pane や shared component に効く視覚ルールは `DESIGN.md` に入れる。
- token、theme、CSS custom property の実装は `src/styles/tokens/` に入れる。
- React primitive の API や component variant は `src/components/shared/` に入れる。
- pane 固有の layout 調整は、再利用条件が見えるまで feature-local に留める。
- review 手順、昇格条件、例外、判断保留は `DESIGN_REVIEW.md` に入れる。

Shared へ昇格する条件:

- semantics が一致している。
- hover、focus-visible、active/selected、disabled、loading/error などの state model が一致している。
- keyboard と pointer の操作性が同じである。
- popup と Shadow DOM の両方で token role が破綻しない。

見た目が似ているだけでは shared に上げない。state model または accessibility behavior が違う場合は local に留める。

## Review Flow

1. `DESIGN.md` を読み、該当する visual rule を確認する。
2. `docs/style-management.md` と `src/styles/tokens/` で token role を確認する。
3. `src/components/shared/` に既存 primitive があるか確認する。
4. Storybook の `Design System/Reference` と `Popup/Components/*` で基準表示を確認する。
5. Storybook または popup app で実表示を確認する。
6. 代表 viewport で horizontal overflow、body scroll、focus-visible、drawer/dialog escape path を確認する。
7. 変更差分が `DESIGN.md`、shared component、feature-local のどこに属するかを最終確認する。

UI が壊れているように見える場合でも、まず design input が足りているかを確認する。足りない場合は実装の失敗ではなく design input debt として扱い、`DESIGN.md` の不足を先に補う。

Storybook reference の最低 matrix:

- Button: primary、ghost、danger、disabled、small。
- Inputs: filled、long value、with icon、textarea、select。
- Selection controls: checkbox、radio group、switch、toggle。
- Navigation: rail item、active item、drawer row、settings footer。
- Feedback: toast、overlay、popover、tooltip、dialog。
- Layout: popup shell、content body scroll、settings card、dense list。

Reference story が不足している component を shared に昇格しない。先に story を追加して state model を見えるようにする。

## Review Format

`review-board` で UI/design を見るときは、基本的に次の形式で返す。

```md
Selected lane: <番号とタイトル>

Review basis:

- `DESIGN.md`
- `DESIGN_REVIEW.md`
- 参照した source / Storybook / screenshot

Findings:

- [P0/P1/P2/P3] <問題>
  Evidence: <file, line, screenshot, DOM/browser observation>
  Recommended fix: <最小修正>

Implementation plan:

- <修正する場合のみ>

Verification performed:

- <commands, browser checks, screenshots>
```

Design doc 自体を review するときは次の判定も付ける。

```md
総合判定: OK | 調整推奨 | 大幅修正推奨

- 構造: OK | 要修正 | 不足
  理由: ...
- 雰囲気記述: OK | 要修正 | 不足
  理由: ...
- 色: OK | 要修正 | 不足
  理由: ...
- タイポグラフィ: OK | 要修正 | 不足
  理由: ...
- コンポーネント: OK | 要修正 | 不足
  理由: ...
- レイアウト: OK | 要修正 | 不足
  理由: ...
- Stitch再利用性: OK | 要修正 | 不足
  理由: ...

優先修正:

1. ...
2. ...
3. ...
```

## Escalation

次の場合は作業を止めるか、明示的に相談する。

- `DESIGN.md` と実装 token が矛盾しており、どちらを正本にするか判断できない。
- 一画面だけの例外が複数画面に広がり始めている。
- shared へ昇格すると API、state model、accessibility behavior が変わる。
- 参照画像や rough intent が既存 design system と明確に衝突する。
- destructive な変更、履歴改変、外部公開、秘密情報が必要になる。

Escalation では、未解決の判断、足りない evidence、候補案を短く示す。

## Notes

- `DESIGN.md` には review flow や昇格条件を書かない。
- `DESIGN_REVIEW.md` には安定した視覚ルールを長く再掲しない。
- Storybook screenshot は evidence として使えるが、生成物を正本にしない。
- `tmp/` のスクリーンショットや調査メモは原則 commit 対象にしない。
- `docs/style-management.md` は token system の技術説明、`DESIGN.md` は見た目の契約として分ける。
- 未定義 primitive token を見つけた場合は、新規追加より先に semantic token へ寄せられるか確認する。
