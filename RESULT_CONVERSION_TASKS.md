# Result Conversion Tasks

このドキュメントは、byethrow `Result` パターンに変換すべき catch ブロックを記録します。

## Phase 1: Storage Operations (ストレージ読み書き)

### chrome.storage読み取り

- `src/background/storage.ts`: storage read operations
- `src/background/context_menu_copy.ts:213`: `storageLocalGet` error handling
- `src/content/overlay-helpers.ts:54`: overlay settings read
- `src/content/overlay/OverlayApp/useOverlayTheme.ts:31`: theme read

### chrome.storage書き込み

- `src/background/storage.ts:295-321`: backup/write error handling with notifications

## Phase 2: AI Requests (AI API呼び出し)

### OpenAI/ChatGPT API

- `src/ai/chatgpt/oauth.ts:81,93,215,232`: OAuth URL parsing (Result already partially used)
- `src/ai/chatgpt/responses.ts:54,87`: JSON parsing in API responses
- `src/background/runtime_handlers.ts:309,341`: AI request error propagation

### Gemini API

- `src/background/context_menu_gemini.ts:75,157,204`: Gemini request handling

## Phase 3: Parsing Operations (データ解析)

### JSON parsing

- `src/ai/chatgpt/oauth.ts:232`: JWT payload parsing
- `src/ai/chatgpt/responses.ts:54,87`: API response parsing
- `src/constants/api-endpoints.ts:33`: URL parsing
- `src/app_meta.ts:14`: manifest parsing

### URL/DOM parsing

- `src/content/overlay/overlayPosition.ts:213,260`: positioning calculation
- `src/content/search-blocklist-ui/dom.ts:83`: DOM manipulation
- `src/content.ts:42`: content script initialization
- `src/content/lazy-loader.ts:16`: dynamic import

## 除外: 副作用のみ（既に ignoreRejection で処理済み）

- `src/ai/chatgpt/responses.ts:203,343`: reader cancel (ignoreRejection)
- `src/background/chatgpt_session.ts:62,212`: queue management (ignoreRejection)
- `src/background/runtime_handlers.ts:367`: mutation queue (ignoreRejection)

## 除外: 設計上 catch が適切なもの

### Promise chaining without Result

- `src/background.ts:36,104,111,120,133`: background event listeners
- `src/background/dev-reload.ts:28,55,68`: dev reload (開発専用)
- `src/components/AuxTextDisclosure.tsx:50`: UI async operation
- `src/content/message-handlers.ts:93,149,158,178,186`: message handler fire-and-forget
- `src/content/overlay/OverlayApp.tsx:77,94`: UI user actions (toast表示済み)
- `src/content/table-auto-exec.ts:64,75,80`: auto-refresh best-effort

### Error conversion already in place

- `src/ai/chat-completion-client.ts:100,107`: adapter error mapping
- `src/background/chatgpt_session.ts:102,106,134,185,203`: session state management
- `src/background/context_menu_handlers.ts:50,164`: menu click handlers
- `src/background/context_menu_qrcode.ts:64,77`: QR code generation
- `src/background/context_menu_registry.ts:175,228,235,417`: menu registry
- `src/background/runtime_handlers.ts:146,173,232,251,282,399,441,485,508,527`: runtime message handlers

Total remaining sites needing Result conversion: ~30 sites across 3 phases
