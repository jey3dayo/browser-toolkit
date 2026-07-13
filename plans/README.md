# Implementation Plans

Two audit rounds by the improve skill:

- **Round 1** (quick audit, 2026-07-12, commit `8ec023e`): plans 001–003 — all DONE.
- **Round 2** (standard audit, 2026-07-14, commit `31dee9a`): plans 004–009 — covers the
  areas Round 1 explicitly skipped (performance, tech debt, dependencies, docs,
  test coverage, direction).

Execute in the order below unless dependencies say otherwise. Each executor:
read the plan fully before starting, honor its STOP conditions, and update your
row when done.

## Execution order & status

| Plan | Title                                                                        | Priority | Effort | Depends on  | Status |
| ---- | ---------------------------------------------------------------------------- | -------- | ------ | ----------- | ------ |
| 001  | Migration バックアップ/リストアを実 Chrome の storage API で正しく動作させる | P1       | S      | —           | DONE   |
| 002  | API トークンが debug ログ・コンソール・エクスポートに平文で出ないようにする  | P1       | S      | —           | DONE   |
| 003  | 未知の runtime action に対して即座に失敗応答を返す                           | P2       | S      | —           | DONE   |
| 004  | esbuild の minify を有効化し content.js の parse/compile コストを削減        | P1       | S      | —           | DONE   |
| 005  | table-sort を Schwartzian transform で O(n) キー前計算に                     | P2       | M      | —           | DONE   |
| 006  | calendar / .ics 生成チェーンにユニットテストを追加（現状ゼロ）               | P2       | M      | —           | DONE   |
| 007  | `saveModel` の stale closure を修正し provider/model の不整合永続化を防ぐ    | P2       | S      | —           | DONE   |
| 008  | security.md の CSP 例を shipped manifest と一致させる（doc ドリフト）        | P2       | S      | —           | DONE   |
| 009  | content bundle スリム化（eager preload 撤去 + content 専用 icon セット）     | P3       | S      | 004         | TODO   |
| 010  | esbuild watch を context()/watch() API へ移行（`pnpm run watch` 修復）       | P2       | S      | 004 (stack) | DONE   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

## Recommended order & dependency notes

推奨順: **004 → 007 → 008 → 006 → 005 → 009**（leverage 順。004 は最優先、009 のみ依存あり）。

- **009 は 004 の後**に実行する。009 の bundle サイズ削減効果は minify(004) 適用後に測定しないと minifier ノイズと混ざる（009 内にも STOP 条件として明記済み）。
- **004 / 005 / 006 / 007 / 008 は相互独立**で、任意順・並行実行が可能。
- **006（calendar テスト）は calendar 系の将来リファクタの前**に置くと characterization test として機能する。現状バグを発見したら STOP して報告（テスト専用プランのため本体は触らない）。

## Findings considered and NOT planned (Round 2)

Round 2 で検出したが今回プラン化しなかったもの。再監査を避けるため記録する。良い次候補には ✅ を付す。

- ✅ **同名 storage helper の2実装**（`src/storage/helpers.ts` vs `src/background/storage.ts` が `storageLocalGet`/`storageSyncGet`/`storageLocalSet` を別実装・別意味論で export）: HIGH conf / M effort の correctness hazard。次ラウンドの有力候補。今回は推奨セット外のため保留。
- ✅ **content-script の本格 code-splitting**（PERF-02）: `format:"iife"` + splitting 無しで react/markdown/lucide が content.js に inline。effort **L** / MED risk の設計変更。004→009 の後に検討する spike 候補。
- **`@shadcn/react@0.1.0`（pre-1.0 固定 runtime dep）**: `MessageScroller` 1個のみ利用。vendoring か許容理由の明文化を推奨するが S / 低優先。
- **focus-override 登録の check-then-act 競合**（`focus_override_registration.ts:41`）: MED conf、swallow + 自己回復で実害小。`context_menu_registry` の queue パターンを流用すれば S で解消可能。
- **stale Playwright e2e アサーション**（削除済み UI 参照、`test:e2e` は CI 対象外）: S。selector 更新か削除。e2e 層が自動ゲートで無検証な点も併せて要検討。
- **keep-alive alarm のコメント誤り**（`background.ts:90-104`）: 30s idle を防げないのにそう主張。実害なし、コメント修正 or 撤去のみ。
- **popup → content 層の runtime import**（`popup/runtime.ts` が `@/content/url-pattern` を import）: S。`url-pattern.ts` を `src/utils/` へ移動すれば解消。
- ~~**`pnpm run watch` が現状壊れている**（plan 004 実行中に発見）~~ → **plan 010 で解消済み（DONE）**。esbuild `context()`/`ctx.watch()` へ移行し、rebuild ログは `onEnd` プラグインで維持。010 は 004 の上に stack。

### Direction findings（メンテナ判断・未プラン化）

- **DIR-01 Gemini を第一級 API provider に昇格**（HIGH grounded）: 現状 web タブ handoff のみで overlay/history UX から外れている。API key 必須化のトレードオフあり。設計/spike プラン向き。
- **DIR-02 設定 backup/restore UI**（MED）: `restoreFromBackup`/`listBackups` 実装・テスト済みだが未配線。
- **DIR-03 未完 superpowers plan 2件**（MED）: status マーカー無し。完了 or archive。
- **DIR-04 OpenAI model shim の集約**（MED）: model 処理が4ファイルに分散・高 churn。registry へ集約検討。

## Round 1 で考慮し却下した findings（再掲・依然有効）

- `onMessage` の sender 未検証: `externally_connectable` / `onMessageExternal` 不使用のため Web ページから到達不能。トラストバウンダリ欠陥ではない。
- `src/content/template-paste.ts` の `execCommand("insertText")`: プレーンテキスト挿入のみで安全（by-design）。
- ページ/選択テキストの AI プロバイダー送信: プロダクトの目的そのもの（privacy 方針は `docs/context-actions.md`）。
- XSS 面: `innerHTML`/`dangerouslySetInnerHTML` 不使用、react-markdown は rehype-raw 不使用で raw HTML 非レンダリング。
- **Gemini CSP "mismatch"（Round 2 で再確認・却下）**: `host_permissions` に gemini があり `connect-src` に無いのは正しい。Gemini は `chrome.tabs.create` + injection の handoff で、extension ページからの fetch はしない。`connect-src` は REST 3社のみで正しい。
- **AI トークンは `chrome.storage.local` 保存（Round 2 再確認）**: sync 保存経路は存在しない。指摘なし。
- **manifest 権限は全て使用中（Round 2 再確認）**: `downloads`/`notifications`/`alarms`/`contextMenus`/`scripting`/`activeTab`/`<all_urls>` すべて呼び出し元あり。
- **`pnpm audit` の high advisories**: minimatch / rollup とも dev/test-only（本番は esbuild bundle）。runtime 非到達のため housekeeping のみ。

## Audit scope note (Round 2)

standard 監査。カバー: correctness（新規スイープ）/ performance / tech debt / dependencies / DX / docs / test coverage / direction / security config。
Round 1 の DONE・rejected 項目は再報告せず除外。深追いしなかった領域: popup の細かい re-render プロファイリング（低影響と判断）、本格的な e2e 実行検証。
