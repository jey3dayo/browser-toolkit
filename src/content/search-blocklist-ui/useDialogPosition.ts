import { type RefObject, useCallback, useLayoutEffect } from "react";
import { computeDialogPosition } from "./dom";

type UseDialogPositionArgs = {
  dialogOpen: boolean;
  popupEl: HTMLDivElement | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export function useDialogPosition({
  dialogOpen,
  popupEl,
  triggerRef,
}: UseDialogPositionArgs): void {
  const updateDialogPosition = useCallback(
    (popup: HTMLDivElement) => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const triggerRect = trigger.getBoundingClientRect();
      const dialogPosition = computeDialogPosition(
        triggerRect,
        { height: popup.offsetHeight, width: popup.offsetWidth },
        { height: window.innerHeight, width: window.innerWidth }
      );
      popup.style.top = `${Math.round(dialogPosition.top)}px`;
      popup.style.left = `${Math.round(dialogPosition.left)}px`;
      popup.style.transformOrigin =
        dialogPosition.placement === "below" ? "top right" : "bottom right";
    },
    [triggerRef]
  );

  useLayoutEffect(() => {
    if (!(dialogOpen && popupEl)) {
      return;
    }
    const handleReposition = () => updateDialogPosition(popupEl);
    handleReposition();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleReposition);
    observer?.observe(popupEl);
    window.addEventListener("resize", handleReposition);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleReposition);
    };
  }, [dialogOpen, popupEl, updateDialogPosition]);
}
