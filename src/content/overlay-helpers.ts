// オーバーレイヘルパー
import { Result } from "@praha/byethrow";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  OverlayApp,
  type OverlayViewModel,
} from "@/content/overlay/OverlayApp";
import { ensureShadowMount } from "@/content/shadow_mount";
import type {
  ActionOverlayRequest,
  SummaryOverlayRequest,
} from "@/content-script-messages";
import { t } from "@/i18n";
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

  return { host: mount.host, root, shadow: mount.shadow };
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
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
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
      onDismiss,
      portalContainer: mount.shadow,
      viewModel,
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
      summarizeOverlayTitleCache =
        stripSourceSuffix(title ?? "") || t("overlay.summary.title");
    } else {
      summarizeOverlayTitleCache = t("overlay.summary.title");
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
    return primary || t("overlay.fallback.emptyResult");
  }
  if (status === "error") {
    return primary || t("overlay.fallback.failed");
  }
  return "";
}

function actionOverlaySecondaryText(
  status: ActionOverlayRequest["status"],
  secondary: string
): string {
  return status === "loading"
    ? secondary || t("overlay.hints.processingMayTakeSeconds")
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
      anchorRect: anchorRectBySource(request.source),
      calendarUrl: optionalTrimmed(request.calendarUrl),
      event: actionOverlayEventPayload(
        request.mode,
        request.status,
        request.event
      ),
      ics: optionalTrimmed(request.ics),
      mode: request.mode,
      open: true,
      primary: actionOverlayPrimaryText(request.status, primary),
      secondary: actionOverlaySecondaryText(request.status, secondary),
      source: request.source,
      status: request.status,
      title: stripSourceSuffix(request.title),
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
    primaryText = summary || t("overlay.summary.empty");
  } else if (request.status === "error") {
    primaryText = error || t("overlay.summary.failed");
  }

  let secondaryText = "";
  if (request.status === "loading") {
    secondaryText = t("overlay.hints.processingMayTakeSeconds");
  } else if (request.status === "error") {
    secondaryText = t("overlay.hints.openAiTokenMissing");
  }

  renderOverlay(
    mount,
    {
      anchorRect,
      mode: "text",
      open: true,
      primary: primaryText,
      secondary: secondaryText,
      source: request.source,
      status: request.status,
      title,
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
  const fallbackTitle =
    summarizeOverlayTitleCache ?? t("overlay.summary.title");
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
