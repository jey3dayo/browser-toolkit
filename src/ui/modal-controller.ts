export type ActivateModalOptions = {
  // Focus lives inside a ShadowRoot, so `document.activeElement` only ever
  // resolves to the shadow host; callers pass their own shadow's activeElement.
  getActiveElement: () => Element | null;
  getFocusables: () => readonly HTMLElement[];
  onClose: () => void;
  preventDefaultKeys?: readonly string[];
};

export type DeactivateModal = () => void;

function cycleFocus(
  focusables: readonly HTMLElement[],
  activeElement: Element | null,
  shiftKey: boolean
): void {
  if (focusables.length === 0) {
    return;
  }
  if (focusables.length === 1) {
    focusables[0]?.focus();
    return;
  }
  const currentIndex =
    activeElement instanceof window.HTMLElement
      ? focusables.indexOf(activeElement)
      : -1;
  const base = currentIndex === -1 ? 0 : currentIndex;
  const delta = shiftKey ? -1 : 1;
  const nextIndex =
    (((base + delta) % focusables.length) + focusables.length) %
    focusables.length;
  focusables[nextIndex]?.focus();
}

// Page listeners never see keys while active; only Escape, Tab and
// preventDefaultKeys are preventDefault'ed so Enter/Space still activate buttons.
export function activateModal(options: ActivateModalOptions): DeactivateModal {
  const previousActiveElement =
    document.activeElement instanceof window.HTMLElement
      ? document.activeElement
      : null;

  function handleKeyDown(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      options.onClose();
      return;
    }
    if (options.preventDefaultKeys?.includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      cycleFocus(
        options.getFocusables(),
        options.getActiveElement(),
        e.shiftKey
      );
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    e.stopPropagation();
  }

  function handleKeyPress(e: KeyboardEvent): void {
    e.stopPropagation();
  }

  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("keypress", handleKeyPress, true);

  return function deactivateModal(): void {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("keyup", handleKeyUp, true);
    window.removeEventListener("keypress", handleKeyPress, true);
    previousActiveElement?.focus();
  };
}
