# Implementation Plans

Three audit rounds by the improve skill:

- Round 1 (quick audit, 2026-07-12, commit `8ec023e`): plans 001–003 — all DONE.
- Round 2 (standard audit, 2026-07-14, commit `31dee9a`): plans 004–009 — covers the
  areas Round 1 explicitly skipped (performance, tech debt, dependencies, docs,
  test coverage, direction).
- Round 3 (standard audit, 2026-08-10, commit `9c49e9b`): plans 015–019 — hotspot-weighted
  on the un-audited delta since Round 2 (plans 010–014 plus commits `fde5e29`, `c4aa820`,
  `da5cf02`, `9c49e9b`), plus verification-baseline and release-hygiene findings.

Execute in the order below unless dependencies say otherwise. Each executor:
read the plan fully before starting, honor its STOP conditions, and update your
row when done.

## Execution order & status

| Plan | Title                                                                            | Priority | Effort | Depends on  | Status  |
| ---- | -------------------------------------------------------------------------------- | -------- | ------ | ----------- | ------- |
| 001  | Migration バックアップ/リストアを実 Chrome の storage API で正しく動作させる     | P1       | S      | —           | DONE    |
| 002  | API トークンが debug ログ・コンソール・エクスポートに平文で出ないようにする      | P1       | S      | —           | DONE    |
| 003  | 未知の runtime action に対して即座に失敗応答を返す                               | P2       | S      | —           | DONE    |
| 004  | esbuild の minify を有効化し content.js の parse/compile コストを削減            | P1       | S      | —           | DONE    |
| 005  | table-sort を Schwartzian transform で O(n) キー前計算に                         | P2       | M      | —           | DONE    |
| 006  | calendar / .ics 生成チェーンにユニットテストを追加（現状ゼロ）                   | P2       | M      | —           | DONE    |
| 007  | `saveModel` の stale closure を修正し provider/model の不整合永続化を防ぐ        | P2       | S      | —           | DONE    |
| 008  | security.md の CSP 例を shipped manifest と一致させる（doc ドリフト）            | P2       | S      | —           | DONE    |
| 009  | content bundle スリム化（G=preload gating のみ採用 / H=icon 分割は却下）         | P3       | S      | 004         | PARTIAL |
| 010  | esbuild watch を context()/watch() API へ移行（`pnpm run watch` 修復）           | P2       | S      | 004 (stack) | DONE    |
| 011  | focus-override 登録を promise queue で直列化（check-then-act 競合の解消）        | P3       | S      | —           | DONE    |
| 012  | `url-pattern.ts` を `src/utils/` へ移動（popup→content 層 import の解消）        | P3       | S      | —           | DONE    |
| 013  | keep-alive コメント訂正 + 廃止 UI 参照の e2e を skip 化                          | P3       | S      | —           | DONE    |
| 014  | TypeScript 6.0.3 → 7.0.2 アップグレード（full ci 緑・2テストを TS API から分離） | P2       | M      | —           | DONE    |
| 015  | Playwright e2e スイートを列挙・実行可能な状態に戻す（`import.meta` 除去）         | P1       | M      | —           | DONE\*  |
| 016  | 期限切れの `minimumReleaseAgeExclude` 34 エントリを全削除（gate 復活）            | P1       | S      | —           | DONE\*  |
| 017  | 重複した OpenAI legacy モデルマップを `src/constants/models.ts` へ統合            | P2       | S      | —           | DONE\*  |
| 018  | Anthropic モデル一覧を Claude 5 系へ更新 + adapter の Claude 5 互換性修正         | P2       | M      | —           | DONE\*  |
| 019  | manifest/package.json の version 同期 + content preload listener の冪等化         | P3       | S      | —           | DONE\*  |

Status values: TODO | IN PROGRESS | DONE | PARTIAL | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

### Round 3 の DONE\* の意味（2026-08-10 時点）

015–019 は **実装・検証完了・コミット済み、push は未実施**。Orchestrator-Worker 方式（Worker = sonnet ×4、うち
017→018 は同一 Worker が直列実施）で `advisor/round3-parallel` ブランチ上に適用し、差分は Orchestrator が
全件レビュー済み。

#### どのコミットに何が入ったか

> **訂正（2026-08-10）**: この節には以前、全変更が 1 コミット `063339d` に混入したという記述があった。
> `063339d` は staged 状態の取り違えで生まれた誤コミットで、`git reset --soft` により作り直し済み。
> reflog 上に孤児として残ってはいるが **`advisor/round3-parallel` の履歴には含まれない**ので参照しないこと。
> 下表が実際の履歴である。

プラン単位に分割済みで、コミットメッセージと内容は一致している。

| commit | メッセージ | 内容 |
| --- | --- | --- |
| `21906b2` | `build(deps): drop expired minimumReleaseAge exclusions...` | **plan 016**（`pnpm-workspace.yaml` −34 行） |
| `33aa38f` | `test(e2e): restore Playwright suite enumeration...` | **plan 015**（`tests/e2e/setup.ts` / `table-sort.spec.ts` のパス解決を `__dirname` ベースへ。`manifest.json` と fixture HTML の実在を実行時に検証） |
| `bb18e46` | `feat(ai): refresh Anthropic models to Claude 5, drop unsupported sampling params, and dedupe the OpenAI legacy model map` | **plan 017 + 018**（下記の理由で 1 コミット） |
| `6d29d1c` | `fix(content): sync package version with manifest and make preload registration idempotent` | **plan 019**（`package.json` `1.0.2 → 0.2.2`、`tests/manifest.version_sync.test.ts` 追加、`src/content.ts` の preload listener を冪等ガードの後ろへ移動） |
| `90d6b40` | `refactor(ui): flatten popup chrome...` | Round 3 とは無関係な UI デザイン整理（別作業） |
| `c1598ad` | `docs(plans): add Round 3 plans 015-019...` | プラン 5 本の md + この README |

`bb18e46` で 017 と 018 を分けなかった理由: 両者は `src/constants/models.ts` / `src/schemas/provider.ts` /
`tests/schemas.provider.test.ts` の 3 ファイルで hunk が交互に並んでおり、分割には部分 stage が必要になる。
lefthook の `stage_fixed` がフォーマット後にファイル全体を再 stage するため、部分 stage は意図しない混入を
生むリスクが高いと判断した。内訳は以下のとおり。

- **017**: OpenAI legacy モデルマップを `src/constants/models.ts` の `LEGACY_OPENAI_MODEL_MAP` に統合（`src/schemas/openai.ts` / `src/schemas/provider.ts` の重複を削除）。
- **018**: `ANTHROPIC_MODELS` を Claude 5 系（`claude-opus-5` / `claude-sonnet-5` / `claude-haiku-4-5`）へ。`defaultModel` を `claude-sonnet-5` へ。**`src/ai/anthropic-adapter.ts` が `temperature` を送らないよう変更**し、`src/background/openai.ts` の health check `max_completion_tokens` を `5 → 1024` へ。

**AI provider のリクエスト互換性を追う場合は `bb18e46` を見ること。** `lefthook.yml` はいずれのコミットにも
含まれない — `8013aa6`（`chore(hooks): split pre-push gate into globbed per-stage jobs`）は Round 3 とは
無関係な別作業である。

full gate の実測（2026-08-10 17:54–17:55、format を除く）:

| gate | 結果 |
| --- | --- |
| `pnpm run lint` | exit 0 |
| `pnpm run typecheck` | exit 0 |
| `pnpm run test` | 64 files / **408 tests pass**、skip 0（Round 3 前は 63 files / 402 tests。+6 は 015 が 0、017 が 1、018 が 4、019 が 1） |
| `pnpm run test:storybook` | 18 files / **57 tests pass** |
| `pnpm run build` | exit 0 |
| `pnpm exec playwright test --list` | **6 tests in 2 files**（Round 3 前は列挙不能・0 件） |
| `pnpm install`（env override なし） | exit 0、release age エラーなし |

コミット後に `mise run ci` を全通し済み（lint / typecheck / unit 408 / storybook 57 / build すべて green、作業ツリーはクリーン）。当初 `mise run ci` を使わず個別コマンドで実施した。理由: `mise run ci` は先頭で `pnpm run format`
（`ultracite fix` をリポジトリ全体へ適用）を走らせ、当時未コミットだった `src/styles/**` と `DESIGN.md` の
外部変更を巻き込んで書き換えてしまうため。その `src/styles/**` / `DESIGN.md` は `90d6b40` としてコミット済みで、
この懸念は解消している。

未実施として残っているもの:

- **push**（メンテナ判断待ち）。push 時は lefthook の pre-push で full gate が走る。作業ツリーはクリーンで、コミット後の `mise run ci` も green。
- **018 の実機確認**: 実際の Anthropic API に対する要約実行とトークン検証。有効な API トークンが必要なため未実施。Claude 5 系への切り替えで `temperature` 400 が解消したことは unit test（`tests/ai.adapter.test.ts`）でのみ担保されている。
- ~~**015 の e2e 実行**~~: **実行済み（2026-08-10 17:58）**。`pnpm exec playwright test` を実ブラウザで完走させた結果は
  **4 failed / 2 skipped / 0 passed**。015 のゴール（列挙・実行可能性の回復）は達成しており、この 4 件はいずれも
  015 の回帰ではなく、列挙が止まっていた間に蓄積した既存の腐りである。内訳と診断:
  - `popup.spec.ts` 3 件 = **assertion の腐り**。`h2` に「アクション」を期待するが実際は "Context Actions"、
    存在しない「モデルID」「追加指示」ラベルを参照している。UI 側が正しく、テストが追随していない。
  - `table-sort.spec.ts` 1 件 = **harness の構造的制約**。fixture が `file://` ページで、`setup.ts` の
    `launchPersistentContext` は `--disable-extensions-except` / `--load-extension` しか渡していない。
    Chrome 拡張は「ファイル URL へのアクセスを許可」を有効にしない限り `file://` へ content script を注入できないため、
    `table.dataset.sortable = "true"`（`src/content/table-sort.ts:36`）が実行されず永久にタイムアウトする。
    実装は正しく、この構成では原理的に通らない。
  - follow-up 候補: popup 3 件のアサーション更新（または plan 013 に倣った skip 化）と、table-sort fixture の
    `file://` からローカル HTTP サーバまたは拡張内 `web_accessible_resources` ページへの移行。
- **019 の手動確認**: content script 再注入時の `pointerdown` リスナ数の目視確認。

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
- ~~**stale Playwright e2e**（列挙不能）~~ → **plan 015 で解消済み（`33aa38f`）**。`import.meta` を `__dirname` ベースへ置き換え、列挙は 0 件 → 6 tests / 2 files に回復。廃止 UI 参照の2テストは plan 013 で `test.skip`+TODO 化済み。**残る follow-up**（Round 3 の「未実施として残っているもの」参照）: 実行すると 4 failed で、popup のアサーション腐り 3 件と fixture が `file://` のため content script が注入されない構造的制約 1 件。いずれも 015 の回帰ではない。e2e は依然 CI 非対象。
- **`@shadcn/react@0.1.0`（pre-1.0 固定 runtime dep）** → **調査の上 vendoring せず保持（許容）**。精査すると `MessageScroller` は単一の小部品ではなく複合スクロールアンカリング primitive（`Provider`/`Root`/`Viewport`/`Content`/`Item`/`Button` を `OverlayComponents.tsx` の overlay チャットで約15箇所使用）。MIT・稼働中・exact pin 済み。vendoring は scroll-anchoring ロジックの再実装＝overlay チャット UX の回帰リスクが高く、当初見積もり(S)より重い。0.66% 未満の依存削減のためにリスクを取る価値はないと判断し保持。将来 upstream が放置/削除された場合に再検討。
- **plan 014（TS 6.0.3 → 7.0.2）は DONE\*（実装・検証完了、push タイミングのみ保留）**: メンテナ承認のもと一時 override（`PNPM_CONFIG_MINIMUM_RELEASE_AGE=0`、`pnpm-workspace.yaml` 本体は不変）で 7.0.2 を install し、**full ci（typecheck/lint/test 404・0 skip/test:storybook 57/build）が TS7 で全緑**を実測。commit `171131d` → main へマージ `37f5b16`。
  - **TS7 で必要だった唯一のコード対応**: 従来 TS コンパイラ API（`ts.createProgram`/`sys`/`createSourceFile`/`ScriptTarget` 等）は TS7 でパッケージの `.` エントリから削除された（`typescript/unstable/*` へ class ベースで移動）。これに依存していた2テストを **TS API から分離**して対応: `typecheck.tsx_support.test.ts` は `tsc --noEmit` を subprocess 実行、`ui.shared_primitives.test.ts` の Base UI 境界ガードは AST から軽量 import 正規表現スキャンへ（allowlist・assertion は不変）。Storybook(react-docgen) と esbuild build は TS7 で無改修で通過。
  - **push 解決（メンテナ選択）**: pnpm 11.9 は `pnpm exec`・lefthook フック・CI を含む全操作で lockfile を minimumReleaseAge 検査するため、7.0.2 は env override 無しだと ~07-15 まで弾かれる問題があった。メンテナ判断で `pnpm-workspace.yaml` の `minimumReleaseAgeExclude` に **`typescript@7.0.2` + 20 platform binaries（`@typescript/typescript-*@7.0.2`）を 7.0.2 固定で追加**（既存の react/storybook 除外と同じ version-pin 方式。将来の typescript には age soak を維持＝統制弱化を最小化）。これで env なしで full ci 緑を確認し push。~~**注意**: TS を将来更新する際はこの 21 エントリを新バージョンに更新するか、soak 期間経過後に除外を削除すること。~~ → **plan 016 で対応済み（`21906b2`）**。soak 期間（7 日）を過ぎた 34 エントリすべてを削除し、`minimumReleaseAge` gate が全依存に効く状態へ戻した。**今後は依存を上げるたびに除外を追加しないこと** — 追加する場合は version-pin 形式で書き、soak 明けに必ず削除する。

### Direction findings（メンテナ判断・未プラン化）

- DIR-01 Gemini を第一級 API provider に昇格（HIGH grounded）: 現状 web タブ handoff のみで overlay/history UX から外れている。API key 必須化のトレードオフあり。設計/spike プラン向き。
- DIR-02 設定 backup/restore UI（MED）: `restoreFromBackup`/`listBackups` 実装・テスト済みだが未配線。
- DIR-03 未完 superpowers plan 2件（MED）: status マーカー無し。完了 or archive。
- DIR-04 OpenAI model shim の集約（MED）: model 処理が4ファイルに分散・高 churn。registry へ集約検討。**一部進捗**: legacy モデル読み替え表は plan 017（`bb18e46`）で `src/constants/models.ts` の `LEGACY_OPENAI_MODEL_MAP` に一元化済み。残るのは `src/ai/openai-compatible-adapter.ts` の `startsWith("gpt-5")` によるサンプリングパラメータ判定（モデル追加時に壊れやすい分岐）と、strict パース（`safeParseOpenAiModel` は未知値で失敗）と fallback（`normalizeAiModel` は default へ）の非対称性。

## Round 1 で考慮し却下した findings（再掲・依然有効）

- `onMessage` の sender 未検証: `externally_connectable` / `onMessageExternal` 不使用のため Web ページから到達不能。トラストバウンダリ欠陥ではない。
- `src/content/template-paste.ts` の `execCommand("insertText")`: プレーンテキスト挿入のみで安全（by-design）。
- ページ/選択テキストの AI プロバイダー送信: プロダクトの目的そのもの（privacy 方針は `docs/context-actions.md`）。
- XSS 面: `innerHTML`/`dangerouslySetInnerHTML` 不使用、react-markdown は rehype-raw 不使用で raw HTML 非レンダリング。
- Gemini CSP "mismatch"（Round 2 で再確認・却下）: `host_permissions` に gemini があり `connect-src` に無いのは正しい。Gemini は `chrome.tabs.create` + injection の handoff で、extension ページからの fetch はしない。`connect-src` は REST 3社のみで正しい。
- AI トークンは `chrome.storage.local` 保存（Round 2 再確認）: sync 保存経路は存在しない。指摘なし。
- manifest 権限は全て使用中（Round 2 再確認）: `downloads`/`notifications`/`alarms`/`contextMenus`/`scripting`/`activeTab`/`<all_urls>` すべて呼び出し元あり。
- `pnpm audit` の high advisories: minimatch / rollup とも dev/test-only（本番は esbuild bundle）。runtime 非到達のため housekeeping のみ。

## Round 3（2026-08-10, commit `9c49e9b`）

推奨順: **015 → 016 → 017 → 018 → 019**（leverage 順）。全プランに hard dependency はない。
015 / 016 / 019 は相互独立で並行実行可能。017 と 018 は同じファイル（`src/constants/models.ts`、
`src/schemas/provider.ts`）を触るため、017 → 018 の順にすると衝突が少ない（依存ではなく順序の推奨）。

018 は Part A（モデル ID の更新）と Part B（adapter の Claude 5 互換性修正）から成り、**片方だけを
マージしてはいけない**。Claude 5 系は `temperature` を拒否するため、Part A 単独では Anthropic の
要約・翻訳とトークン検証が全て 400 になる（この故障は typecheck / lint / vitest では検出できない）。

### Round 3 で検出したが却下した findings

再監査を避けるため記録する。

- **Anthropic adapter の `extractText` が `content[0].text` 固定** → **却下**。extended thinking を有効化していないため `content[0]` は常に text ブロック。潜在的な堅牢性ニットであり現行バグではない。
- **`typecheck.tsx_support.test.ts` に negative case（型エラーを検出できることの検証）がない** → **却下**。plan 014 以前も同じ 1 テスト構成であり、TS7 移行による退行ではない。テスト自体は `tsc --noEmit` の非ゼロ終了を正しく捕捉している（`execFileSync` の throw 経路を確認済み）。
- **plan 014 で Base UI / lucide 境界ガードが AST → 正規表現に弱化** → **flag のみ（プラン化せず）**。`import()` 動的インポートや再エクスポート経由は検出できず、plan 009 Group B 却下の根拠に使った不変条件は当時より弱い。ただし同ファイルの他の 20 件以上のチェックは元から正規表現ベースで、弱化は 2 パターン分に限られる。実害の観測がないため投資対効果が低いと判断。
- **`typecheck.tsx_support.test.ts` が repo ルートに `tsconfig.tsx-typecheck-<uuid>.json` を書き、`.gitignore` に該当パターンがない** → **flag のみ**。`finally` で削除されるため通常は残らない。強制終了時に untracked ファイルが残る程度の影響。
- **plans 010 / 011 / 012 / 004 の実装 diff** → **確認済み・問題なし**。scope creep や半端な適用はない。`scripts/bundle.mjs` の `minify: !isWatch` / `sourcemap: isWatch` / `context()` 実装、`url-pattern.ts` の `src/utils/` への移動をいずれも実コードで確認。typecheck・lint・unit test（63 files / 402 tests）が全緑であることも実測。

## Audit scope note (Round 3)

standard 監査。Round 1 / 2 が全 9 カテゴリを掃き終えているため、Round 3 は **Round 2 基点 `31dee9a` 以降の
未監査デルタ**（plans 010–014 の実装 + 直近 4 コミット）を中心に hotspot 重み付けで実施。
カバー: correctness（デルタ全体）/ tests（e2e ベースライン、plan 014 のテスト書き換え）/ dependencies
（`minimumReleaseAgeExclude`）/ tech debt（モデル shim の重複）/ 機能鮮度（プロバイダのモデル一覧）/
リリース衛生（version 二重管理）。
深追いしなかった領域: popup の re-render プロファイリング、Storybook / visual 回帰の実行、
`src/i18n/resources.ts` の網羅性、`dist/`、z.ai（GLM）のモデル鮮度（一次情報が確認できず未検証）。

## Audit scope note (Round 2)

standard 監査。カバー: correctness（新規スイープ）/ performance / tech debt / dependencies / DX / docs / test coverage / direction / security config。
Round 1 の DONE・rejected 項目は再報告せず除外。深追いしなかった領域: popup の細かい re-render プロファイリング（低影響と判断）、本格的な e2e 実行検証。
