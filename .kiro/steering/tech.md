# Tech Steering: Browser Toolkit

## Platform

- Chrome Extension (Manifest V3): background service worker + content script + popup page.
- UI is React (popup + in-page overlays/toasts) with Base UI primitives (`@base-ui/react`), while keeping the extension runtime lightweight.

## Requirements

Core UI dependencies:

- `@base-ui/react`: Accessible UI primitives for React components (popup and in-page overlays)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`: Drag-and-drop ordering for popup lists
- `lucide-react`: Icon library for consistent UI iconography
- `react` / `react-dom`: UI framework (React 19+)
- `@praha/byethrow`: Result-based error handling
- `date-fns`: Date manipulation for calendar features
- `encoding-japanese`: Shift_JIS query encoding for search engines that require non-UTF8 requests
- `react-markdown` + `remark-gfm`: Markdown rendering in AI action outputs
- `smol-toml`: TOML parsing for built-in action prompts
- `valibot`: Schema validation/normalization for OpenAI outputs and stored data

## Language & Build

- TypeScript with `strict` enabled.
- `tsconfig` uses modern ESM + `moduleResolution: bundler` (and `jsx: react-jsx`) to align with `esbuild`.
- Imports use the `@/` alias for `src/` (TypeScript `paths`, `esbuild --alias`, and Vitest `resolve.alias`) to keep code consistent across runtimes/tests.
- Bundling via `esbuild` into `dist/`:
  - Entry points are bundled as browser-friendly IIFEs.
  - Target is modern browsers (`ES2020`) with sourcemaps.
- Package manager is `pnpm` (scripts and CI assume `pnpm run ...`); keep local tooling and CI Node/pnpm versions aligned (pinned via `engines` / `packageManager`).

## Runtime Boundaries (important for design)

- **Content script** runs in the page context: DOM access, overlays, table sorting.
- **Background service worker** owns privileged APIs: context menus, OpenAI fetch calls, storage orchestration.
- **Popup** is the settings/control surface: saves preferences, manages custom actions, can trigger behaviors on the active tab.

## Service Worker Lifecycle

MV3 Service Workers idle-terminate after ~30 seconds. Two mechanisms prevent this from breaking user flows:

- **Keep-alive alarm** (`background.ts`): `chrome.alarms.create("keep-alive", { periodInMinutes: 1 })` fires every minute, waking the SW before Chrome can terminate it. The `chrome.alarms` minimum period is 1 minute, which is sufficient to prevent the 30-second timeout.
- **Top-level context menu registration** (`background.ts`): `registerContextMenuHandlers()` and `scheduleRefreshContextMenus()` run at module top-level (not only inside `onInstalled`/`onStartup`). This means context menus are automatically re-registered each time the SW restarts from cold.

Together these ensure the background worker is always ready to handle context menu clicks and popup messages without requiring a page reload.

## Timeout Strategy

All timeouts are derived from `SERVICE_WORKER_TIMEOUT_MS = 30_000` in `src/constants/timeouts.ts`:

| Constant                         | Value | Purpose                                                                                                                                        |
| -------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `SERVICE_WORKER_TIMEOUT_MS`      | 30 s  | Chrome MV3 SW idle limit (source of truth)                                                                                                     |
| `API_FETCH_TIMEOUT_MS`           | 25 s  | `fetchWithTimeout` aborts OpenAI/Anthropic calls 5 s before the SW limit, ensuring a typed error is thrown rather than a silent SW termination |
| `CLIENT_MESSAGE_TIMEOUT_MS`      | 30 s  | Popup→Background `sendMessage` race in `sendBackgroundResult`                                                                                  |
| `SELECTED_TEXT_CACHE_TIMEOUT_MS` | 30 s  | Staleness threshold for the selection cache (see below)                                                                                        |

**Implementation details:**

- `fetchWithTimeout` (`src/utils/fetch-with-timeout.ts`): wraps `fetch` with `AbortController`; supports signal composition via `AbortSignal.any()`.
- `FetchTimeoutError` / `ClientTimeoutError` (`src/utils/custom-errors.ts`): typed error classes surfaced to the UI for user-friendly messages.
- The 5-second margin between `API_FETCH_TIMEOUT_MS` and `SERVICE_WORKER_TIMEOUT_MS` is intentional—it gives the background worker time to send a `sendResponse` before Chrome terminates the SW.

## Storage & Configuration

- `chrome.storage.sync`: user preferences that can roam (domain patterns, action definitions, toggles).
- `chrome.storage.local`: device-local data (OpenAI API token, OpenAI model/prompt, theme, recent-selection cache).
- Wrapper helpers convert callback-based Chrome APIs to Promises and surface `chrome.runtime.lastError` as real errors.

### Selection Cache

The content script persists the user's most recent text selection to `chrome.storage.local` (`selectedText` + `selectedTextUpdatedAt`) on every `mouseup` event. The background worker reads this cache when a context menu action fires:

1. **Write**: `content.ts` → `mouseup` listener → `storageLocalSet({ selectedText, selectedTextUpdatedAt: Date.now() })`
2. **Read + freshness check**: background handler compares `Date.now() - selectedTextUpdatedAt` against `SELECTED_TEXT_CACHE_TIMEOUT_MS` (30 s).
3. **Fallback**: if the cache is stale or empty, the action falls back to requesting the full page text.

This design survives SW restarts between the user's selection and the context menu click because `chrome.storage.local` is persistent across SW lifecycles.

## Validation & Parsing

- Untrusted inputs (OpenAI JSON outputs, model options, search engine encoding, storage-loaded data) are validated with `valibot` schemas under `src/schemas/`.
- JSON parsing uses a tolerant helper that extracts a JSON object from text (first `{` to last `}`) before schema validation.

## OpenAI Integration (design constraints)

- Uses OpenAI Chat Completions over HTTPS from the background worker.
- Token is loaded from local storage at call time; calls fail with actionable errors when missing.
- Input text is clipped to a safe maximum before sending; prompts are deterministic-ish (low temperature) to keep output consistent.
- Model is configurable, with a single default used across the extension.
- “Event” actions request structured JSON output and validate/normalize it before generating calendar handoff artifacts (URL / `.ics`).

## Error Handling Style

### Result Type Usage

**Internal functions**: Always use `@praha/byethrow` `Result` / `ResultAsync` for typed error handling.

**Message boundaries**: Convert `Result` to `{ ok: true/false }` response unions **only** at `sendResponse()` calls in Chrome extension message handlers.

**Rule**: Never use `{ ok: true/false }` in internal functions - this pattern is reserved exclusively for Chrome extension message boundaries (`chrome.runtime.sendMessage` / `sendResponse`).

**Example:**

```typescript
// ✅ CORRECT: Internal function - always use Result
async function processData(): Promise<Result.Result<Data, string>> {
  if (error) return Result.fail("error message");
  return Result.succeed(data);
}

// ✅ CORRECT: Message handler - convert Result to { ok } at boundary
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    const result = await processData();
    if (Result.isFailure(result)) {
      sendResponse({ ok: false, error: result.error });
      return;
    }
    sendResponse({ ok: true, data: result.value });
  })();
  return true;
});

// ❌ WRONG: Internal function using { ok: true/false }
async function processData(): Promise<
  { ok: true; data: Data } | { ok: false; error: string }
> {
  // This is only allowed in message handler boundaries
}
```

### Error Display

- UI surfaces errors as notifications/overlays, not console-only.

## Development Workflow

- **Development mode** (`pnpm run dev`): WebSocket-based auto-reload for faster iteration.
  - File watcher (`chokidar`) detects changes in `src/**/*.{ts,tsx,toml,css}`.
  - Triggers automatic rebuild and extension reload via `chrome.runtime.reload()`.
  - Development server runs on `ws://localhost:8090`.
  - Auto-reload code is excluded from production builds (`process.env.NODE_ENV === "development"`).
- **Watch mode** (`pnpm run watch`): Automatic rebuild without auto-reload (manual reload required).
- **Production build** (`pnpm run build`): Clean build with `NODE_ENV=production`, optimized for distribution.

## Quality Gates

- Tests: `vitest` (unit `jsdom`) + Storybook tests (Vitest browser + Playwright) to keep UI behavior/a11y from drifting.
- Formatting: Ultracite (Biome) with single quotes and wider line width.
- Linting: Ultracite (Biome) ruleset, with Chrome extension globals configured.
- Prefer running `mise run ci` locally to mirror GitHub Actions (format + lint + tests + storybook tests + build).
- CI: GitHub Actions runs lightweight checks on PRs/pushes, and runs heavier Storybook/browser checks on merge queue (`merge_group`) to keep PR feedback fast while still gating merges.
