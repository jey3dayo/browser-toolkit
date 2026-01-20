import type { ExtractedEvent, SummarySource } from "@/shared_types";
import type { OverlayViewModel } from "./OverlayApp";

/**
 * Basic utility: clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Overlay layout constants
 */
export const OVERLAY_TOAST_GAP_PX = 8;
export const OVERLAY_TOAST_ESTIMATED_HEIGHT_PX = 52;
export const OVERLAY_TOAST_SAFE_MARGIN_PX = 16;
export const OVERLAY_PINNED_MARGIN_PX = 16;
export const OVERLAY_TOAST_SURFACE_INSET_BELOW = `calc(100% + ${OVERLAY_TOAST_GAP_PX}px) 0 auto 12px`;
export const OVERLAY_TOAST_SURFACE_INSET_ABOVE = `auto 0 calc(100% + ${OVERLAY_TOAST_GAP_PX}px) 12px`;
export const OVERLAY_TOAST_SURFACE_INSET_INSIDE = "auto 0 12px 12px";

/**
 * Regex patterns at module level for performance (lint/performance/useTopLevelRegex)
 */
const SELECTION_SECONDARY_REGEX = /^選択範囲:\s*\n([\s\S]*)$/;

/**
 * Convert status to Japanese label
 */
export function statusLabelFromStatus(
  status: OverlayViewModel["status"]
): string {
  if (status === "loading") {
    return "処理中...";
  }
  if (status === "error") {
    return "エラー";
  }
  return "";
}

/**
 * Convert source to Japanese label
 */
export function sourceLabelFromSource(source: SummarySource): string {
  return source === "selection" ? "選択範囲" : "ページ本文";
}

/**
 * Derive secondary text and selection text from secondary string
 */
export function deriveSecondaryText(secondary: string): {
  selectionText: string;
  secondaryText: string;
} {
  const selectionSplit = splitSelectionSecondary(secondary);
  const selectionText = selectionSplit.selectionText;
  const secondaryText = selectionText
    ? selectionSplit.remainder
    : secondary.trim();
  return { selectionText, secondaryText };
}

/**
 * Check if primary text can be copied
 */
export function canCopyPrimaryFromViewModel(
  viewModel: OverlayViewModel
): boolean {
  return viewModel.status === "ready" && Boolean(viewModel.primary.trim());
}

/**
 * Check if calendar can be opened
 */
export function canOpenCalendarFromViewModel(
  viewModel: OverlayViewModel
): boolean {
  return (
    viewModel.mode === "event" &&
    viewModel.status === "ready" &&
    Boolean(viewModel.calendarUrl?.trim())
  );
}

/**
 * Check if ICS file can be downloaded
 */
export function canDownloadIcsFromViewModel(
  viewModel: OverlayViewModel
): boolean {
  return (
    viewModel.mode === "event" &&
    viewModel.status === "ready" &&
    Boolean(viewModel.ics?.trim())
  );
}

/**
 * Extract event from viewModel when ready
 */
export function readyEventFromViewModel(
  viewModel: OverlayViewModel
): ExtractedEvent | null {
  if (!(viewModel.mode === "event" && viewModel.status === "ready")) {
    return null;
  }
  return viewModel.event ?? null;
}

/**
 * Split selection secondary text into selection text and remainder
 * @internal
 */
function splitSelectionSecondary(secondary: string): {
  selectionText: string;
  remainder: string;
} {
  const raw = secondary.trim();
  const match = raw.match(SELECTION_SECONDARY_REGEX);
  if (!match) {
    return { selectionText: "", remainder: raw };
  }

  const afterPrefix = (match[1] ?? "").trim();
  if (!afterPrefix) {
    return { selectionText: "", remainder: "" };
  }

  const tokenHintMarker = "\n\nOpenAI API Token未設定の場合は、";
  const markerIndex = afterPrefix.indexOf(tokenHintMarker);
  if (markerIndex < 0) {
    return { selectionText: afterPrefix, remainder: "" };
  }

  const selectionText = afterPrefix.slice(0, markerIndex).trim();
  const remainder = afterPrefix.slice(markerIndex + 2).trim();
  return { selectionText, remainder };
}
