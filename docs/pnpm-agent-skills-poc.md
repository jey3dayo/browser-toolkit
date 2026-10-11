# pnpm Agent Skills の限定検証

この Draft PR は、repo-local なスキル1個を pnpm で配布できるか確認するものです。
APM の移行・削除、グローバル設定の変更、外部スキルの承認は含みません。

## 対象と承認範囲

- pnpm: `package.json` の `packageManager` を 12.11.2 に固定。mise と CI は同じ指定を読みます。
- 直接 devDependency: `@browser-toolkit/agent-skills-poc`。
- ソース: このリポジトリの `tests/fixtures/agent-skills`（`file:` 依存）。
- 内容: `skills/pnpm-smoke/SKILL.md` と `reference.md` のみ。private package で、依存・実行スクリプト・bin はありません。
- 動作: 明示的に呼ばれたときだけ隣接する reference の固定マーカーと読み込み元を返します。
- 承認キー: `@browser-toolkit/agent-skills-poc@file:tests/fixtures/agent-skills` の `skills: true` だけ。
- 配置先: `.agents/skills` と `.claude/skills` を `skills.dirs` で明示。CI の agent 環境変数に依存しません。

pnpm の承認は個別スキル単位ではなくパッケージ単位です。このローカルディレクトリに
将来追加されたスキルも承認対象になるため、追加・変更は別途レビューしてください。
この試験の承認は、外部パッケージやその build scripts の承認を意味しません。
既存依存の ultracite にもスキルがありますが、未承認のままにします。
既存の `allowBuilds`、`minimumReleaseAge: 10080`、`trustPolicy` は変更していません。

## バージョンと公開後の待機期間

[Agent Skills](https://pnpm.io/agent-skills) は
[12.11.0](https://github.com/pnpm/pnpm/releases/tag/v12.11.0) で追加されました。
Codex の環境変数による自動検出は
[12.11.1](https://github.com/pnpm/pnpm/releases/tag/v12.11.1) からです。
この試験は [12.11.2](https://github.com/pnpm/pnpm/releases/tag/v12.11.2) を使用します。

[npm 公開日時](https://registry.npmjs.org/pnpm) は 2026-10-09 17:35:58.676 UTC。
調査日 2026-10-11 時点では7日未満です。依存の `minimumReleaseAge` は維持し、
除外・短縮・検証無効化は追加しません。packageManager は CI の pnpm/action-setup と
mise が取得するツールで、アプリ依存の lockfile 内には入りません。
ツール版にも同じ7日待機を適用する運用なら、2026-10-16 17:35:58.676 UTC 以降に
再検証してからこの Draft の採用を判断してください。

## 自動検証

```sh
pnpm install --frozen-lockfile
pnpm run test:agent-skills
```

CI の Test job もこの順序で動き、既存の unit tests を続けて実行します。
`test:agent-skills` は以下を確認します。

1. 実行 pnpm が `packageManager` と一致し、実リポジトリの両配置先で
   `pnpm-@browser-toolkit+agent-skills-poc-pnpm-smoke` が node_modules 内への
   symlink になっていること。SKILL.md と reference の内容もソースと照合します。
2. 一時プロジェクトへ同じ fixture をコピーし、未承認ではリンクされないこと。
3. ローカルの承認後に両ディレクトリが生成されること。
4. 一時 node_modules を消し、offline + frozen install で同じ lockfile と内容を復元できること。
5. 承認取消・依存削除でリンクが消え、同名の手動作成ディレクトリは上書きせず失敗すること。

一時試験は HOME・設定・store を分離し、`--ignore-scripts` と `--offline` を使用します。
プロジェクトや利用者の node_modules / 設定を削除するテストではありません。
通常の lint・typecheck・unit tests・build は従来どおり必要です。
この Linux CI 試験は macOS / Windows の動作保証ではありません。

## エージェントによる手動確認（自動試験とは別）

インストール後、リポジトリで新しい Claude Code / Codex セッションを開き、
`pnpm-smoke` スキルを明示的に呼び出してください。エージェントが表示するスキル一覧で
名前と読み込み元を確認し、以下のマーカーと読み込み元パスが返ることを確認します。

```text
BROWSER_TOOLKIT_PNPM_SKILL_POC_V1
```

SKILL.md のファイルを直接読ませただけでは、スキルの自動発見・呼び出しの証明にはなりません。
Claude と Codex それぞれの実行結果が揃うまでは、この確認を未完了として扱います。

## APM との境界と採用条件

browser-toolkit の現行 `apm.yml` / `apm.lock.yaml` は依存・配布記録が空です。
この試験は既存 APM スキルの移し替えではありません。pnpm は直接依存の skill directory
をリンクするだけで、APM の指示組立、agents/rules/commands、MCP、harness hooks、
private overlay、グローバル配布を置き換えません。推移依存のスキルも自動配布しません。

`file:` fixture はソースをこの Git commit で固定します。registry tarball の integrity や
private GitHub の認証・取得まで検証するものではありません。node_modules がないと
リンク先は読めず、既存の APM 名や固定パス参照にも互換性を仮定できません。

この PR のチェックと手動発見が成功したら、実用的な repo-local skill への置換を別途評価します。
グローバル APM の撤去や、他のパッケージへの承認拡大は別判断です。

## ロールバック

この PR 全体を revert し、元の packageManager で `pnpm install --frozen-lockfile` を実行します。
12.7.0 は新機能のリンクを清掃しないので、試験時に残った次の2エントリが symlink であり、
この fixture を指していることを確認してからリンクだけを削除します。

- `.agents/skills/pnpm-@browser-toolkit+agent-skills-poc-pnpm-smoke`
- `.claude/skills/pnpm-@browser-toolkit+agent-skills-poc-pnpm-smoke`

エージェントディレクトリ全体やグローバル設定は削除しません。APM の復旧操作は不要です。
