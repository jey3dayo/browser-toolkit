import type { Size } from "@/shared_types";
import type { OverlayViewModel } from "./OverlayApp";
import {
  clamp,
  OVERLAY_PINNED_MARGIN_PX,
  OVERLAY_TOAST_ESTIMATED_HEIGHT_PX,
  OVERLAY_TOAST_GAP_PX,
  OVERLAY_TOAST_SAFE_MARGIN_PX,
  OVERLAY_TOAST_SURFACE_INSET_ABOVE,
  OVERLAY_TOAST_SURFACE_INSET_BELOW,
  OVERLAY_TOAST_SURFACE_INSET_INSIDE,
} from "./overlayUtils";

export type Point = { left: number; top: number };
export type DragOffset = { x: number; y: number };
export type PanelSize = Size;
export type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * Get panel size from DOM element
 */
export function getPanelSize(panel: HTMLDivElement | null): PanelSize {
  const rect = panel?.getBoundingClientRect();
  return { width: rect?.width || 520, height: rect?.height || 300 };
}

/**
 * Update toast surface inset based on panel position
 */
export function updateOverlayToastSurfaceInset(params: {
  host: HTMLDivElement;
  panel: HTMLDivElement | null;
}): void {
  const panel = params.panel;
  const host = params.host;
  if (!panel) {
    host.style.setProperty(
      "--toast-surface-inset",
      OVERLAY_TOAST_SURFACE_INSET_BELOW
    );
    return;
  }

  const panelRect = panel.getBoundingClientRect();
  const required =
    OVERLAY_TOAST_GAP_PX +
    OVERLAY_TOAST_ESTIMATED_HEIGHT_PX +
    OVERLAY_TOAST_SAFE_MARGIN_PX;
  const spaceAbove = panelRect.top;
  const spaceBelow = window.innerHeight - panelRect.bottom;

  if (spaceBelow >= required) {
    host.style.setProperty(
      "--toast-surface-inset",
      OVERLAY_TOAST_SURFACE_INSET_BELOW
    );
    return;
  }
  if (spaceAbove >= required) {
    host.style.setProperty(
      "--toast-surface-inset",
      OVERLAY_TOAST_SURFACE_INSET_ABOVE
    );
    return;
  }

  host.style.setProperty(
    "--toast-surface-inset",
    OVERLAY_TOAST_SURFACE_INSET_INSIDE
  );
}

/**
 * Update host position with boundary clamping
 */
export function updateHostPosition(
  host: HTMLDivElement,
  size: PanelSize,
  point: Point
): void {
  const margin = OVERLAY_PINNED_MARGIN_PX;
  const maxLeft = Math.max(margin, window.innerWidth - size.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - size.height - margin);
  const left = clamp(point.left, margin, maxLeft);
  const top = clamp(point.top, margin, maxTop);
  host.style.left = `${Math.round(left)}px`;
  host.style.top = `${Math.round(top)}px`;
}

/**
 * Get pinned corner position (top-right)
 */
export function getPinnedCornerPoint(size: PanelSize): Point {
  return {
    left: window.innerWidth - size.width - OVERLAY_PINNED_MARGIN_PX,
    top: OVERLAY_PINNED_MARGIN_PX,
  };
}

/**
 * Position overlay host based on state (pinned, dragged, or anchored)
 */
export function positionOverlayHost(params: {
  open: boolean;
  host: HTMLDivElement;
  size: PanelSize;
  pinned: boolean;
  pinnedPos: Point | null;
  anchorRect: OverlayViewModel["anchorRect"];
}): void {
  if (!params.open) {
    return;
  }

  const size = params.size;

  if (params.pinned) {
    updateHostPosition(params.host, size, getPinnedCornerPoint(size));
    return;
  }

  if (params.pinnedPos) {
    updateHostPosition(params.host, size, params.pinnedPos);
    return;
  }

  const anchor = params.anchorRect;
  if (!anchor) {
    updateHostPosition(params.host, size, {
      left: window.innerWidth - size.width - 40,
      top: 16,
    });
    return;
  }

  updateHostPosition(params.host, size, {
    left: anchor.left,
    top: anchor.top + anchor.height + 10,
  });
}

/**
 * Drag handler parameter types
 */
export type OverlayDragBaseParams = {
  event: React.PointerEvent<HTMLElement>;
  dragOffsetRef: React.MutableRefObject<DragOffset | null>;
  setDragging: StateSetter<boolean>;
};

export type OverlayDragStartParams = OverlayDragBaseParams & {
  host: HTMLDivElement;
  setPinnedPos: StateSetter<Point | null>;
};

export type OverlayDragEndParams = OverlayDragBaseParams & {
  dragging: boolean;
};

export type OverlayPinnedParams = {
  pinned: boolean;
  setPinned: StateSetter<boolean>;
  setPinnedPos: StateSetter<Point | null>;
};

function computePinnedPositionFromDrag(params: {
  event: React.PointerEvent<HTMLElement>;
  dragOffset: DragOffset;
  size: PanelSize;
}): Point {
  const margin = OVERLAY_PINNED_MARGIN_PX;
  const maxLeft = Math.max(
    margin,
    window.innerWidth - params.size.width - margin
  );
  const maxTop = Math.max(
    margin,
    window.innerHeight - params.size.height - margin
  );
  return {
    left: clamp(params.event.clientX - params.dragOffset.x, margin, maxLeft),
    top: clamp(params.event.clientY - params.dragOffset.y, margin, maxTop),
  };
}

/**
 * Start overlay drag operation
 */
export function startOverlayDrag(params: OverlayDragStartParams): void {
  if (params.event.button !== 0) {
    return;
  }
  const target = params.event.target as HTMLElement | null;
  if (target?.closest("button")) {
    return;
  }
  params.event.preventDefault();
  const rect = params.host.getBoundingClientRect();
  const dragOffset = {
    x: params.event.clientX - rect.left,
    y: params.event.clientY - rect.top,
  };
  params.dragOffsetRef.current = dragOffset;
  params.setDragging(true);
  params.setPinnedPos(
    computePinnedPositionFromDrag({
      event: params.event,
      dragOffset,
      size: getPanelSize(params.host),
    })
  );
  try {
    params.event.currentTarget.setPointerCapture(params.event.pointerId);
  } catch {
    // no-op
  }
}

/**
 * Move overlay during drag operation
 */
export function moveOverlayDrag(
  params: {
    event: React.PointerEvent<HTMLElement>;
    panel: HTMLDivElement | null;
    dragging: boolean;
    dragOffsetRef: React.MutableRefObject<DragOffset | null>;
  } & OverlayPinnedParams
): void {
  if (!params.dragging) {
    return;
  }
  const offset = params.dragOffsetRef.current;
  if (!offset) {
    return;
  }

  if (params.pinned) {
    params.setPinned(false);
  }
  params.setPinnedPos(
    computePinnedPositionFromDrag({
      event: params.event,
      dragOffset: offset,
      size: getPanelSize(params.panel),
    })
  );
}

/**
 * End overlay drag operation
 */
export function endOverlayDrag(params: OverlayDragEndParams): void {
  if (!params.dragging) {
    return;
  }
  params.setDragging(false);
  params.dragOffsetRef.current = null;
  try {
    params.event.currentTarget.releasePointerCapture(params.event.pointerId);
  } catch {
    // no-op
  }
}

/**
 * Toggle overlay pinned state
 */
export function toggleOverlayPinned(params: OverlayPinnedParams): void {
  if (!params.pinned) {
    params.setPinned(true);
    params.setPinnedPos(null);
    return;
  }
  params.setPinned(false);
  params.setPinnedPos(null);
}
