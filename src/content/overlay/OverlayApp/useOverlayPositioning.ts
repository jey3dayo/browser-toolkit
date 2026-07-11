import { useLayoutEffect, useRef, useState } from "react";
import type { OverlayViewModel } from "../OverlayApp";
import {
  type DragOffset,
  endOverlayDrag,
  getPanelSize,
  moveOverlayDrag,
  type PanelSize,
  type Point,
  positionOverlayHost,
  startOverlayDrag,
  toggleOverlayPinned,
  updateOverlayToastSurfaceInset,
} from "../overlayPosition";

type Params = {
  host: HTMLDivElement;
  viewModel: OverlayViewModel;
  panelRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Manage overlay drag/pin/position state: panel size tracking via
 * ResizeObserver, host position updates, and pointer-drag handlers.
 */
export function useOverlayPositioning(params: Params) {
  const { host, viewModel, panelRef } = params;
  const panelSizeRef = useRef<PanelSize>({ width: 520, height: 300 });
  const [pinned, setPinned] = useState(false);
  const [pinnedPos, setPinnedPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<DragOffset | null>(null);
  const updateOverlayPositionRef = useRef<() => void>(() => undefined);

  updateOverlayPositionRef.current = (): void => {
    positionOverlayHost({
      open: viewModel.open,
      host,
      size: panelSizeRef.current,
      pinned,
      pinnedPos,
      anchorRect: viewModel.anchorRect,
    });
    updateOverlayToastSurfaceInset({
      host,
      panel: panelRef.current,
    });
  };

  useLayoutEffect(() => {
    if (!viewModel.open) {
      return;
    }

    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") {
      return;
    }

    let lastWidth = 0;
    let lastHeight = 0;

    const commit = (size: PanelSize): void => {
      const width = Math.round(size.width);
      const height = Math.round(size.height);
      if (width <= 0 || height <= 0) {
        return;
      }
      if (width === lastWidth && height === lastHeight) {
        return;
      }
      lastWidth = width;
      lastHeight = height;
      panelSizeRef.current = { width, height };
      updateOverlayPositionRef.current();
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      commit({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(panel);
    commit(getPanelSize(panel));

    return () => {
      observer.disconnect();
    };
  }, [viewModel.open, panelRef]);

  useLayoutEffect(() => {
    updateOverlayPositionRef.current();
  });

  useLayoutEffect(() => {
    if (!viewModel.open) {
      return;
    }

    const updatePosition = (): void => {
      updateOverlayPositionRef.current();
    };

    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [viewModel.open]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    startOverlayDrag({
      event,
      host,
      dragOffsetRef,
      setDragging,
      setPinnedPos,
    });
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    moveOverlayDrag({
      event,
      pinned,
      panel: panelRef.current,
      dragging,
      dragOffsetRef,
      setPinned,
      setPinnedPos,
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    endOverlayDrag({ event, dragging, dragOffsetRef, setDragging });
  };

  const togglePinned = (): void => {
    toggleOverlayPinned({ pinned, setPinned, setPinnedPos });
  };

  return { pinned, dragging, startDrag, moveDrag, endDrag, togglePinned };
}
