import { useCallback, useEffect, useRef, useState } from "react";
import type { BlocklistEntry, BlocklistState } from "@/search-blocklist/types";
import type { Point } from "@/shared_types";
import { computeButtonPosition, findEntryForNode, isDomNode } from "./dom";

type UseHoveredEntryArgs = {
  host: HTMLElement;
  state: BlocklistState;
  frozen: boolean;
};

export function useHoveredEntry({ host, state, frozen }: UseHoveredEntryArgs): {
  hoveredEntry: BlocklistEntry | null;
  position: Point | null;
  clearHover: () => void;
} {
  const [hoveredEntry, setHoveredEntry] = useState<BlocklistEntry | null>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const frozenRef = useRef<boolean>(false);

  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  const clearHover = useCallback(() => {
    setHoveredEntry(null);
    setPosition(null);
  }, []);

  useEffect(() => {
    function handlePointerOver(event: PointerEvent): void {
      if (frozenRef.current === true) {
        return;
      }
      if (event.composedPath().includes(host)) {
        return;
      }
      const { target } = event;
      const node = isDomNode(target) ? target : null;
      const entry = findEntryForNode(node, state.getSnapshot().entries);
      if (!entry) {
        clearHover();
        return;
      }
      setHoveredEntry(entry);
      setPosition(
        computeButtonPosition(entry.container.getBoundingClientRect())
      );
    }

    document.addEventListener("pointerover", handlePointerOver, {
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
    };
  }, [host, state, clearHover]);

  useEffect(() => {
    if (frozenRef.current === true || !hoveredEntry) {
      return;
    }
    const trackedContainer = hoveredEntry.container;
    function handleReposition(): void {
      if (!trackedContainer.isConnected) {
        clearHover();
        return;
      }
      setPosition(
        computeButtonPosition(trackedContainer.getBoundingClientRect())
      );
    }
    window.addEventListener("scroll", handleReposition, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", handleReposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleReposition, {
        capture: true,
      });
      window.removeEventListener("resize", handleReposition);
    };
  }, [hoveredEntry, frozen, clearHover]);

  return { clearHover, hoveredEntry, position };
}
