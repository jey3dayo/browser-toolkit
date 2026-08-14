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
  const panelSizeRef = useRef<PanelSize>({ height: 300, width: 520 });
  const [pinned, setPinned] = useState(false);
  const [pinnedPos, setPinnedPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<DragOffset | null>(null);
  const updateOverlayPositionRef = useRef<() => void>(() => undefined);

  updateOverlayPositionRef.current = (): void => {
    positionOverlayHost({
      anchorRect: viewModel.anchorRect,
      host,
      open: viewModel.open,
      pinned,
      pinnedPos,
      size: panelSizeRef.current,
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
      panelSizeRef.current = { height, width };
      updateOverlayPositionRef.current();
    };

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      commit({
        height: entry.contentRect.height,
        width: entry.contentRect.width,
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
      dragOffsetRef,
      event,
      host,
      setDragging,
      setPinnedPos,
    });
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    moveOverlayDrag({
      dragging,
      dragOffsetRef,
      event,
      panel: panelRef.current,
      pinned,
      setPinned,
      setPinnedPos,
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    endOverlayDrag({ dragging, dragOffsetRef, event, setDragging });
  };

  const togglePinned = (): void => {
    toggleOverlayPinned({ pinned, setPinned, setPinnedPos });
  };

  return { dragging, endDrag, moveDrag, pinned, startDrag, togglePinned };
}
