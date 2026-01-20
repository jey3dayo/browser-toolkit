// オーバーレイヘルパー
import { Result } from "@praha/byethrow";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  OverlayApp,
  type OverlayViewModel,
} from "@/content/overlay/OverlayApp";
import { ensureShadowMount } from "@/content/shadow_mount";
import type { ExtractedEvent, SummarySource } from "@/shared_types";
import { storageSyncGet } from "@/storage/helpers";
import type { Theme } from "@/ui/theme";

const OVERLAY_HOST_ID = "browser-toolkit-overlay";
const OVERLAY_ROOT_ID = "mtk-overlay-react-root";

// Regex patterns at module level for performance (lint/performance/useTopLevelRegex)
const SOURCE_SUFFIX_REGEX = /（(?:選択範囲|ページ本文)）\s*$/;

export type OverlayMount = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  root: Root;
};

export type ActionOverlayRequest = {
  action: "showActionOverlay";
  status: "loading" | "ready" | "error";
  mode: "text" | "event";
  source: SummarySource;
  title: string;
  primary?: string;
  secondary?: string;
  calendarUrl?: string;
  ics?: string;
  event?: ExtractedEvent;
};

export type SummaryOverlayRequest = {
  action: "showSummaryOverlay";
  status: "loading" | "ready" | "error";
  source: SummarySource;
  summary?: string;
  error?: string;
};

/**
 * Overlayマウントポイントを確保
 */
export function ensureOverlayMount(currentTheme: Theme): OverlayMount {
  const mount = ensureShadowMount({
    hostId: OVERLAY_HOST_ID,
    rootId: OVERLAY_ROOT_ID,
    theme: currentTheme,
  });
  const root = createRoot(mount.rootEl);

  return { host: mount.host, shadow: mount.shadow, root };
}

/**
 * Overlayを閉じる
 */
export function closeOverlay(mount: OverlayMount | null): void {
  if (!mount) {
    return;
  }
  try {
    mount.root.unmount();
  } catch {
    // no-op
  }
  mount.host.remove();
}

/**
 * 選択範囲のアンカー矩形を取得
 */
export function getSelectionAnchorRect(): OverlayViewModel["anchorRect"] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects());
  const rect = rects.length > 0 ? rects.at(-1) : range.getBoundingClientRect();

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return null;
  }
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Overlayをレンダリング
 */
export function renderOverlay(
  mount: OverlayMount,
  viewModel: OverlayViewModel,
  onDismiss: () => void
): void {
  mount.root.render(
    createElement(OverlayApp, {
      host: mount.host,
      portalContainer: mount.shadow,
      viewModel,
      onDismiss,
    })
  );
}

/**
 * ソースサフィックスを削除
 */
function stripSourceSuffix(title: string): string {
  return title.replace(SOURCE_SUFFIX_REGEX, "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedStringProp(
  record: Record<string, unknown>,
  key: string
): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * コンテキストアクションからタイトルを検索
 */
export function findContextActionTitle(
  actions: unknown,
  id: string
): string | null {
  if (!Array.isArray(actions)) {
    return null;
  }
  for (const item of actions) {
    if (!isRecord(item)) {
      continue;
    }
    if (getTrimmedStringProp(item, "id") !== id) {
      continue;
    }
    const title = getTrimmedStringProp(item, "title");
    return title || null;
  }
  return null;
}

let summarizeOverlayTitleCache: string | null = null;
let summarizeOverlayTitleInFlight: Promise<string> | null = null;

/**
 * 要約オーバーレイのタイトルを取得
 */
export function getSummarizeOverlayTitle(): Promise<string> {
  if (summarizeOverlayTitleCache) {
    return Promise.resolve(summarizeOverlayTitleCache);
  }
  if (summarizeOverlayTitleInFlight) {
    return summarizeOverlayTitleInFlight;
  }

  summarizeOverlayTitleInFlight = (async () => {
    const result = await storageSyncGet<{ contextActions?: unknown }>([
      "contextActions",
    ]);

    if (Result.isSuccess(result)) {
      const title = findContextActionTitle(
        result.value.contextActions,
        "builtin:summarize"
      );
      summarizeOverlayTitleCache = stripSourceSuffix(title ?? "") || "要約";
    } else {
      summarizeOverlayTitleCache = "要約";
    }

    summarizeOverlayTitleInFlight = null;
    return summarizeOverlayTitleCache;
  })();

  return summarizeOverlayTitleInFlight;
}

/**
 * 要約オーバーレイタイトルのキャッシュをリセット
 */
export function resetSummarizeOverlayTitleState(): void {
  summarizeOverlayTitleCache = null;
  summarizeOverlayTitleInFlight = null;
}

function trimmedOrEmpty(value: string | undefined): string {
  return value?.trim() ?? "";
}

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

function anchorRectBySource(
  source: SummarySource
): OverlayViewModel["anchorRect"] {
  return source === "selection" ? getSelectionAnchorRect() : null;
}

function actionOverlayPrimaryText(
  status: ActionOverlayRequest["status"],
  primary: string
): string {
  if (status === "ready") {
    return primary || "結果が空でした";
  }
  if (status === "error") {
    return primary || "処理に失敗しました";
  }
  return "";
}

function actionOverlaySecondaryText(
  status: ActionOverlayRequest["status"],
  secondary: string
): string {
  return status === "loading"
    ? secondary || "処理に数秒かかることがあります。"
    : secondary;
}

function actionOverlayEventPayload(
  mode: ActionOverlayRequest["mode"],
  status: ActionOverlayRequest["status"],
  event: ExtractedEvent | undefined
): ExtractedEvent | undefined {
  if (!(mode === "event" && status === "ready")) {
    return;
  }
  return event;
}

/**
 * アクションオーバーレイを表示
 */
export function showActionOverlay(
  mount: OverlayMount,
  request: ActionOverlayRequest,
  onDismiss: () => void
): void {
  const primary = trimmedOrEmpty(request.primary);
  const secondary = trimmedOrEmpty(request.secondary);

  renderOverlay(
    mount,
    {
      open: true,
      status: request.status,
      mode: request.mode,
      source: request.source,
      title: stripSourceSuffix(request.title),
      primary: actionOverlayPrimaryText(request.status, primary),
      secondary: actionOverlaySecondaryText(request.status, secondary),
      event: actionOverlayEventPayload(
        request.mode,
        request.status,
        request.event
      ),
      calendarUrl: optionalTrimmed(request.calendarUrl),
      ics: optionalTrimmed(request.ics),
      anchorRect: anchorRectBySource(request.source),
    },
    onDismiss
  );
}

/**
 * 要約オーバーレイをタイトル付きでレンダリング
 */
export function renderSummaryOverlayWithTitle(
  mount: OverlayMount,
  request: SummaryOverlayRequest,
  title: string,
  onDismiss: () => void
): void {
  const summary = request.summary?.trim() ?? "";
  const error = request.error?.trim() ?? "";

  const anchorRect =
    request.source === "selection" ? getSelectionAnchorRect() : null;

  let primaryText = "";
  if (request.status === "ready") {
    primaryText = summary || "要約結果が空でした";
  } else if (request.status === "error") {
    primaryText = error || "要約に失敗しました";
  }

  let secondaryText = "";
  if (request.status === "loading") {
    secondaryText = "処理に数秒かかることがあります。";
  } else if (request.status === "error") {
    secondaryText =
      "OpenAI API Token未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。";
  }

  renderOverlay(
    mount,
    {
      open: true,
      status: request.status,
      mode: "text",
      source: request.source,
      title,
      primary: primaryText,
      secondary: secondaryText,
      anchorRect,
    },
    onDismiss
  );
}

/**
 * 要約オーバーレイを表示
 */
export function showSummaryOverlay(
  mount: OverlayMount,
  request: SummaryOverlayRequest,
  onDismiss: () => void
): void {
  const fallbackTitle = summarizeOverlayTitleCache ?? "要約";
  renderSummaryOverlayWithTitle(mount, request, fallbackTitle, onDismiss);

  (async () => {
    const title = await getSummarizeOverlayTitle();
    if (title === fallbackTitle) {
      return;
    }
    renderSummaryOverlayWithTitle(mount, request, title, onDismiss);
  })().catch(() => {
    // no-op
  });
}
