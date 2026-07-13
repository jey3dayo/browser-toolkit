# Implementation Plans

Two audit rounds by the improve skill:

- Round 1 (quick audit, 2026-07-12, commit `8ec023e`): plans 001–003 — all DONE.
- Round 2 (standard audit, 2026-07-14, commit `31dee9a`): plans 004–009 — covers the
  areas Round 1 explicitly skipped (performance, tech debt, dependencies, docs,
  test coverage, direction).

Execute in the order below unless dependencies say otherwise. Each executor:
read the plan fully before starting, honor its STOP conditions, and update your
row when done.

## Execution order & status

| Plan | Title                                                                        | Priority | Effort | Depends on  | Status  |
| ---- | ---------------------------------------------------------------------------- | -------- | ------ | ----------- | ------- |
| 001  | Migration バックアップ/リストアを実 Chrome の storage API で正しく動作させる | P1       | S      | —           | DONE    |
| 002  | API トークンが debug ログ・コンソール・エクスポートに平文で出ないようにする  | P1       | S      | —           | DONE    |
| 003  | 未知の runtime action に対して即座に失敗応答を返す                           | P2       | S      | —           | DONE    |
| 004  | esbuild の minify を有効化し content.js の parse/compile コストを削減        | P1       | S      | —           | DONE    |
| 005  | table-sort を Schwartzian transform で O(n) キー前計算に                     | P2       | M      | —           | DONE    |
| 006  | calendar / .ics 生成チェーンにユニットテストを追加（現状ゼロ）               | P2       | M      | —           | DONE    |
| 007  | `saveModel` の stale closure を修正し provider/model の不整合永続化を防ぐ    | P2       | S      | —           | DONE    |
| 008  | security.md の CSP 例を shipped manifest と一致させる（doc ドリフト）        | P2       | S      | —           | DONE    |
| 009  | content bundle スリム化（G=preload gating のみ採用 / H=icon 分割は却下）     | P3       | S      | 004         | PARTIAL |
| 010  | esbuild watch を context()/watch() API へ移行（`pnpm run watch` 修復）       | P2       | S      | 004 (stack) | DONE    |
| 011  | focus-override 登録を promise queue で直列化（check-then-act 競合の解消）    | P3       | S      | —           | DONE    |
| 012  | `url-pattern.ts` を `src/utils/` へ移動（popup→content 層 import の解消）    | P3       | S      | —           | DONE    |
| 013  | keep-alive コメント訂正 + 廃止 UI 参照の e2e を skip 化                      | P3       | S      | —           | DONE    |
| 014  | TypeScript 6.0.3 → 7.0.x アップグレード（full ci で経験的検証）              | P2       | S/M    | —           | BLOCKED |

Status values: TODO | IN PROGRESS | DONE | PARTIAL | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

### plan 009 の扱い（PARTIAL）

- Group A（Finding G: eager preload の pointerdown ゲート化）は採用・main にマージ済み（commit `ca644a6`）。重い React/markdown 初期化を初回ユーザー操作まで遅延。
- **Group B（Finding H: content 専用 icon セットへの分割）は却下（REJECTED）**。理由: 効果は content.js の約 **4,535 bytes（≈0.66%）** のみ（lucide アイコンは個々が極小で、当初「25アイコン」見出しほどの旨味がなかった。content.js の本体重量は react-dom / react-markdown）。一方コストは、このリポジトリが明示的なテスト `tests/ui.shared_primitives.test.ts`（lucide-react import の一元化を強制する境界不変条件）を緩めること＋ drift しやすい並行アイコンモジュールの新設。0.66% のためにこの意図的なアーキテクチャ境界を壊す価値はないと判断。content.js の本質的削減が必要なら PERF-02（react/markdown の code-splitting）で取り組む。

## Recommended order & dependency notes

推奨順: **004 → 007 → 008 → 006 → 005 → 009**（leverage 順。004 は最優先、009 のみ依存あり）。

- 009 は 004 の後に実行する。009 の bundle サイズ削減効果は minify(004) 適用後に測定しないと minifier ノイズと混ざる（009 内にも STOP 条件として明記済み）。
- 004 / 005 / 006 / 007 / 008 は相互独立で、任意順・並行実行が可能。
- 006（calendar テスト）は calendar 系の将来リファクタの前に置くと characterization test として機能する。現状バグを発見したら STOP して報告（テスト専用プランのため本体は触らない）。

## Findings considered and NOT planned (Round 2)

Round 2 で検出したが今回プラン化しなかったもの。再監査を避けるため記録する。良い次候補には ✅ を付す。

- ~~**同名 storage helper の2実装**~~ → **調査の上 REJECTED（やらない）**。当初「統合すべき correctness hazard」と framing したが、精査で覆った: (1) 実際は3層（content=`storage/helpers.ts` [Result, naive] / background=`background/storage.ts` [throw, quota+notifications+i18n] / popup=`popup/runtime.ts` の `createStorageSetter` [plain sync.set + Storybook 用 localStorage フォールバック]）で、いずれもランタイム境界に適した別物。content は background の notifications/quota/i18n を持ち込めない（特に content.js を slim した直後）。戻り契約も Result vs throw で非互換のため統合は高リスク・低見返り。(2) 疑った潜在バグ（background の `focus_override_registration.ts` が naive sync-only read で quota-fallback 退避キーを見落とす）は **phantom**: `focusOverridePatterns` は popup の plain `sync.set` でのみ書かれ、`__storage_fallback_keys__` marker を設定する quota-aware `storageSyncSet` は当該キーに使われない → naive read は常に正しい。残るのは純粋な命名の重複ニットのみで、投資対効果なし。
- ✅ **content-script の本格 code-splitting**（PERF-02）: `format:"iife"` + splitting 無しで react/markdown/lucide が content.js に inline。effort **L** / MED risk の設計変更。004→009 の後に検討する spike 候補。
- ~~**popup → content 層の runtime import**~~ → **plan 012 で解消済み（DONE）**。`url-pattern.ts` を `src/utils/` へ移動。
- ~~**`pnpm run watch` が現状壊れている**（plan 004 実行中に発見）~~ → **plan 010 で解消済み（DONE）**。esbuild `context()`/`ctx.watch()` へ移行し、rebuild ログは `onEnd` プラグインで維持。010 は 004 の上に stack。
- ~~**focus-override 登録の check-then-act 競合**~~ → **plan 011 で解消済み（DONE）**。promise queue で直列化（`scheduleRefreshContextMenus` パターン）。
- ~~**keep-alive alarm のコメント誤り**~~ → **plan 013 で解消済み（DONE）**。コメントを正確化（alarm コードは不変）。
- **stale Playwright e2e**: 廃止 UI 参照の2テストは plan 013 で `test.skip`+TODO 化。**未解決の別問題**: `pnpm exec playwright test --list` が `SyntaxError: Cannot use 'import.meta' outside a module`（`tests/e2e/setup.ts` 起因）で列挙すら失敗する（base tree でも再現＝既存）。e2e スイートは事実上機能停止・CI 非対象。現行 URL パターンモデル向けの e2e 書き直し＋ESM 設定修正が follow-up（要インタラクティブ検証）。
- **`@shadcn/react@0.1.0`（pre-1.0 固定 runtime dep）** → **調査の上 vendoring せず保持（許容）**。精査すると `MessageScroller` は単一の小部品ではなく複合スクロールアンカリング primitive（`Provider`/`Root`/`Viewport`/`Content`/`Item`/`Button` を `OverlayComponents.tsx` の overlay チャットで約15箇所使用）。MIT・稼働中・exact pin 済み。vendoring は scroll-anchoring ロジックの再実装＝overlay チャット UX の回帰リスクが高く、当初見積もり(S)より重い。0.66% 未満の依存削減のためにリスクを取る価値はないと判断し保持。将来 upstream が放置/削除された場合に再検討。
- **plan 014（TS 6.0.3 → 7.0.x）は BLOCKED**: リポジトリ自身の `minimumReleaseAge: 10080`（=7日）supply-chain ポリシーが `typescript@7.0.2`（2026-07-08 公開、npm 唯一の stable 7.0.x）を拒否（本日 2026-07-13 時点で 5日）。ポリシーは意図的な security 統制のため bypass せず。**~2026-07-15 に自動解禁**され、用意済みの plan 014 を再実行すれば通る見込み（tsconfig は TS7 適合済み、唯一の残リスクは Storybook `react-docgen-typescript` の TS7 programmatic API 依存＝再実行時に実測）。`minimumReleaseAgeExclude` への typescript 追加は統制を弱めるメンテナ判断のため独断不可。

### Direction findings（メンテナ判断・未プラン化）

- DIR-01 Gemini を第一級 API provider に昇格（HIGH grounded）: 現状 web タブ handoff のみで overlay/history UX から外れている。API key 必須化のトレードオフあり。設計/spike プラン向き。
- DIR-02 設定 backup/restore UI（MED）: `restoreFromBackup`/`listBackups` 実装・テスト済みだが未配線。
- DIR-03 未完 superpowers plan 2件（MED）: status マーカー無し。完了 or archive。
- DIR-04 OpenAI model shim の集約（MED）: model 処理が4ファイルに分散・高 churn。registry へ集約検討。

## Round 1 で考慮し却下した findings（再掲・依然有効）

- `onMessage` の sender 未検証: `externally_connectable` / `onMessageExternal` 不使用のため Web ページから到達不能。トラストバウンダリ欠陥ではない。
- `src/content/template-paste.ts` の `execCommand("insertText")`: プレーンテキスト挿入のみで安全（by-design）。
- ページ/選択テキストの AI プロバイダー送信: プロダクトの目的そのもの（privacy 方針は `docs/context-actions.md`）。
- XSS 面: `innerHTML`/`dangerouslySetInnerHTML` 不使用、react-markdown は rehype-raw 不使用で raw HTML 非レンダリング。
- Gemini CSP "mismatch"（Round 2 で再確認・却下）: `host_permissions` に gemini があり `connect-src` に無いのは正しい。Gemini は `chrome.tabs.create` + injection の handoff で、extension ページからの fetch はしない。`connect-src` は REST 3社のみで正しい。
- AI トークンは `chrome.storage.local` 保存（Round 2 再確認）: sync 保存経路は存在しない。指摘なし。
- manifest 権限は全て使用中（Round 2 再確認）: `downloads`/`notifications`/`alarms`/`contextMenus`/`scripting`/`activeTab`/`<all_urls>` すべて呼び出し元あり。
- `pnpm audit` の high advisories: minimatch / rollup とも dev/test-only（本番は esbuild bundle）。runtime 非到達のため housekeeping のみ。

## Audit scope note (Round 2)

standard 監査。カバー: correctness（新規スイープ）/ performance / tech debt / dependencies / DX / docs / test coverage / direction / security config。
Round 1 の DONE・rejected 項目は再報告せず除外。深追いしなかった領域: popup の細かい re-render プロファイリング（低影響と判断）、本格的な e2e 実行検証。
