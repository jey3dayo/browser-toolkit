import type { BlocklistEntry } from "@/search-blocklist/types";
import type { Point, Size } from "@/shared_types";
import { SEARCH_BLOCKLIST_BUTTON_SIZE } from "./constants";

export function isDomNode(value: EventTarget | null): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodeType" in value &&
    typeof value.nodeType === "number"
  );
}

export function findEntryForNode(
  node: Node | null,
  entries: readonly BlocklistEntry[]
): BlocklistEntry | null {
  let current: Node | null = node;
  while (current) {
    const match = entries.find((entry) => entry.container === current);
    if (match) {
      return match;
    }
    current = current.parentNode;
  }
  return null;
}

export type ButtonPosition = Point;

export function computeButtonPosition(rect: DOMRect): ButtonPosition {
  return {
    left: Math.max(rect.right - SEARCH_BLOCKLIST_BUTTON_SIZE, 0),
    top: Math.max(rect.top, 0),
  };
}

const DIALOG_VIEWPORT_MARGIN = 16;
const DIALOG_TRIGGER_GAP = 8;

export type DialogTriggerRect = Pick<DOMRect, "top" | "right" | "bottom">;
export type DialogPlacement = "above" | "below";
export type DialogPosition = Point & { placement: DialogPlacement };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeDialogPosition(
  triggerRect: DialogTriggerRect,
  popupSize: Size,
  viewport: Size
): DialogPosition {
  const margin = DIALOG_VIEWPORT_MARGIN;
  const maxLeft = Math.max(margin, viewport.width - popupSize.width - margin);
  const left = clamp(triggerRect.right - popupSize.width, margin, maxLeft);

  const maxTop = Math.max(margin, viewport.height - popupSize.height - margin);
  const belowTop = triggerRect.bottom + DIALOG_TRIGGER_GAP;
  const fitsBelow = belowTop + popupSize.height <= viewport.height - margin;
  const spaceAbove = triggerRect.top;
  const spaceBelow = viewport.height - triggerRect.bottom;
  const placement: DialogPlacement =
    fitsBelow || spaceBelow >= spaceAbove ? "below" : "above";
  const idealTop =
    placement === "below"
      ? belowTop
      : triggerRect.top - DIALOG_TRIGGER_GAP - popupSize.height;
  const top = clamp(idealTop, margin, maxTop);

  return { left, placement, top };
}

export function suggestPatternFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function splitPatternLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
