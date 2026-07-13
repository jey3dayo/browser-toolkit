# Plan 008: Reconcile the CSP example in `.claude/rules/security.md` with the shipped `manifest.json`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31dee9a..HEAD -- .claude/rules/security.md manifest.json`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs (security-adjacent)
- **Planned at**: commit `31dee9a`, 2026-07-14

## Why this matters

`.claude/rules/security.md` documents the extension's Content Security Policy
with a code example that is missing `connect-src`. The actual, shipped
`manifest.json` **does** set `connect-src` to a specific allowlist of AI
provider hosts. In Manifest V3, `connect-src` is the directive that
constrains which hosts an extension page may `fetch`/`XMLHttpRequest`
against; omitting it from the documented example makes the doc's own snippet
weaker than what ships. A contributor or agent who copies this doc's
CSP example verbatim into a future change would silently drop the AI-host
allowlist, widening what extension pages can connect to. Fixing the doc to
byte-match the manifest, and explaining why `connect-src` must stay in sync
with the AI-endpoint allowlist, closes this drift and prevents a future
security regression modeled on stale doc guidance.

## Current state

- `.claude/rules/security.md:146-156` — the "Content Security Policy（CSP）の遵守" section. Current text (verbatim):

  ````markdown
  ### 2. Content Security Policy（CSP）の遵守

  manifest.jsonのCSPを厳格化（Issue #143）：

  ```json
  {
    "content_security_policy": {
      "extension_pages": "script-src 'self'; object-src 'self'"
    }
  }
  ```
  ````

  This example has **no `connect-src`** at all.

- `manifest.json:22-24` — the actual shipped CSP (verbatim):

  ```json
    "content_security_policy": {
      "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.z.ai"
    },
  ```

  The exact `extension_pages` string the doc must match after this plan:

  ```
  script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.z.ai
  ```

- `src/constants/api-endpoints.ts:11-15` — the authoritative list of allowed AI API origins, which must stay aligned with the manifest's `connect-src` hosts:

  ```typescript
  export const ALLOWED_API_ORIGINS = [
    "https://api.openai.com",
    "https://api.anthropic.com",
    "https://api.z.ai",
  ] as const;
  ```

  The file's own header comment already states: "manifest.jsonのcontent_security_policyと一致させる必要があります" (must match manifest.json's CSP).

- `CLAUDE.md` "Release / Permission Review" section already documents the
  cross-sync requirement across these three artifacts: "AI provider の
  endpoint を追加・変更するときは、`src/constants/api-endpoints.ts`、
  `manifest.json` の `host_permissions`、`content_security_policy.connect-src`
  を同じ差分で揃えてください。" This plan's added explanatory paragraph in
  `security.md` should point back to that CLAUDE.md section rather than
  duplicate its wording.

- Markdown lint status: `package.json`'s `lint` script runs
  `ultracite check`, which extends `ultracite/biome/core` (Biome). Biome does
  not lint Markdown files by default in this repo's `biome.jsonc` (no
  markdown-specific linter config present). Do not expect `pnpm run lint` to
  cover `.claude/rules/security.md`; verification for this plan is `grep`
  and a manual diff read, not the lint command.

## Commands you will need

| Purpose                                  | Command                                           | Expected on success                                 |
| ---------------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| Confirm current manifest CSP unchanged   | `grep -n "connect-src" manifest.json`             | one line, content matches "Current state" above     |
| Confirm doc updated                      | `grep -n "connect-src" .claude/rules/security.md` | at least one match, inside the fenced ```json block |
| Confirm doc CSP matches manifest exactly | see Step 2 below                                  | strings are identical                               |
| Check no other file touched              | `git status --short`                              | only `.claude/rules/security.md` listed             |

No build, typecheck, or test run is required — this is a doc-only change with no runtime code path.

## Scope

**In scope** (the only file you should modify):

- `.claude/rules/security.md`

**Out of scope** (do NOT touch, even though they look related):

- `manifest.json` — this file is correct as shipped; do not edit it.
- `src/constants/api-endpoints.ts` — correct as is; referenced only for context.
- `CLAUDE.md` — already contains the cross-sync rule; reference it, don't duplicate/rewrite it.
- Any other section of `.claude/rules/security.md` outside the CSP section (section "2. Content Security Policy（CSP）の遵守").

## Git workflow

- Branch: `advisor/008-reconcile-csp-security-doc`
- Single commit, conventional commits style (matches recent repo history, e.g. `fix(security): redact sensitive fields in debug logs`): use `docs(security): sync CSP example with shipped manifest`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the CSP example with the shipped manifest string

In `.claude/rules/security.md`, locate the section header `### 2. Content Security Policy（CSP）の遵守` (around line 146). Replace the fenced ```json block currently containing:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

with:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.z.ai"
  }
}
```

Keep the preceding line `manifest.jsonのCSPを厳格化（Issue #143）：` as is.

**Verify**: `grep -n "connect-src" .claude/rules/security.md` → outputs a line containing `connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.z.ai`.

### Step 2: Confirm the doc's `extension_pages` string byte-matches the manifest

Run:

```bash
DOC_VAL=$(grep -o '"extension_pages": "[^"]*"' .claude/rules/security.md | sed 's/^"extension_pages": "//; s/"$//')
MANIFEST_VAL=$(grep -o '"extension_pages": "[^"]*"' manifest.json | sed 's/^"extension_pages": "//; s/"$//')
if [ "$DOC_VAL" = "$MANIFEST_VAL" ]; then echo MATCH; else echo MISMATCH; fi
```

**Verify**: output is exactly `MATCH`. If `MISMATCH`, re-check Step 1 for typos (do not proceed until this passes).

### Step 3: Add the `connect-src` explanation paragraph

Immediately after the JSON code block from Step 1 (still inside section "2."), add a new paragraph in Japanese (matching the doc's existing language and tone) explaining that `connect-src` is the load-bearing restriction and must be kept in sync. Suggested text (adjust wording only if needed for flow, do not change the meaning or drop the cross-reference):

```markdown
`connect-src` は拡張機能ページが `fetch`/`XMLHttpRequest` で接続できるホストを制限する、このCSPの中核的な制約です。AIプロバイダのエンドポイントを追加・変更する場合は、`src/constants/api-endpoints.ts` の `ALLOWED_API_ORIGINS`、`manifest.json` の `host_permissions`、`content_security_policy.connect-src` を必ず同じ差分で揃えてください（詳細は `CLAUDE.md` の「Release / Permission Review」を参照）。
```

**Verify**: `grep -n "connect-src" .claude/rules/security.md` → now returns two matches (one inside the JSON block, one in this new paragraph).

## Test plan

Not applicable — no code changes, no test suite covers Markdown rule files. Verification is limited to the `grep`/string-match commands above plus a manual read of the diff.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Step 2's match command outputs `MATCH`
- [ ] `grep -n "connect-src" .claude/rules/security.md` returns 2 matches
- [ ] `git status --short` shows only `.claude/rules/security.md` as modified
- [ ] `manifest.json`, `src/constants/api-endpoints.ts`, and `CLAUDE.md` are untouched (`git diff --stat` shows no entry for them)
- [ ] `plans/README.md` status row for plan 008 updated to DONE (if `plans/README.md` exists; if it does not exist, skip this and note it in your final report)

## STOP conditions

Stop and report back (do not improvise) if:

- The CSP example at `.claude/rules/security.md:146-156` does not match the "Current state" excerpt above (doc has already been edited by someone else).
- `manifest.json`'s `extension_pages` CSP string differs from the "Current state" excerpt above (manifest has changed — this plan's fix target would be wrong; do not edit the doc to match a manifest state you haven't verified against this plan).
- Step 2's match command outputs `MISMATCH` twice after a reasonable fix attempt.
- You find that fixing this requires touching `manifest.json` or `src/constants/api-endpoints.ts` (it should not — if it seems to, the premise of this plan is broken).

## Maintenance notes

- If AI provider endpoints change again in the future, three artifacts must move together: `manifest.json` (`host_permissions` + `content_security_policy.connect-src`), `src/constants/api-endpoints.ts` (`ALLOWED_API_ORIGINS`), and now also this doc's example in `.claude/rules/security.md` if the example is quoted verbatim rather than referenced. Consider, as a future (out-of-scope) follow-up, replacing the hardcoded example in `security.md` with a pointer to "see `manifest.json`'s `content_security_policy` for the current value" instead of a copy — this would eliminate the drift risk permanently, but that structural change is deliberately deferred here to keep this plan minimal.
- A reviewer should scrutinize: that no wording change altered the meaning of the surrounding CSP section, and that the new paragraph's file/section references (`src/constants/api-endpoints.ts`, `CLAUDE.md`) are still accurate at review time.
