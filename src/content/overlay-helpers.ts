import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  OverlayApp,
  type OverlayViewModel,
} from "@/content/overlay/OverlayApp";
import { ensureShadowMount } from "@/content/shadow_mount";
import type { ActionOverlayRequest } from "@/content-script-messages";
import { t } from "@/i18n";
import type { ExtractedEvent, SummarySource } from "@/shared_types";
import type { Theme } from "@/ui/theme";

const OVERLAY_HOST_ID = "browser-toolkit-overlay";
const OVERLAY_ROOT_ID = "mtk-overlay-react-root";

const SOURCE_SUFFIX_REGEX = /（(?:選択範囲|ページ本文)）\s*$/;

export type OverlayMount = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  root: Root;
};

export function ensureOverlayMount(currentTheme: Theme): OverlayMount {
  const mount = ensureShadowMount({
    hostId: OVERLAY_HOST_ID,
    rootId: OVERLAY_ROOT_ID,
    theme: currentTheme,
  });
  const root = createRoot(mount.rootEl);

  return { host: mount.host, root, shadow: mount.shadow };
}

export function closeOverlay(mount: OverlayMount | null): void {
  if (!mount) {
    return;
  }
  try {
    mount.root.unmount();
  } catch {}
  mount.host.remove();
}

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

function stripSourceSuffix(title: string): string {
  return title.replace(SOURCE_SUFFIX_REGEX, "").trim();
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

export function showActionOverlay(
  mount: OverlayMount,
  request: ActionOverlayRequest,
  requestId: number,
  requestStartedAt: number,
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
      requestId,
      requestStartedAt,
      secondary: actionOverlaySecondaryText(request.status, secondary),
      source: request.source,
      status: request.status,
      title: stripSourceSuffix(request.title),
    },
    onDismiss
  );
}
