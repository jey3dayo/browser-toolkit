export type ActivateModalOptions = {
  // Focus lives inside a ShadowRoot, so `document.activeElement` only ever
  // resolves to the shadow host; callers pass their own shadow's activeElement.
  getActiveElement: () => Element | null;
  getFocusables: () => readonly HTMLElement[];
  onClose: () => void;
  preventDefaultKeys?: readonly string[];
};

export type DeactivateModal = () => void;

// content.js and image-zoom.js are separate bundles in the same isolated
// world: module-scope state isn't shared between them, but `globalThis` is.
function getModalStack(): symbol[] {
  const stack = globalThis.__MBU_MODAL_STACK__;
  if (stack) {
    return stack;
  }
  const created: symbol[] = [];
  globalThis.__MBU_MODAL_STACK__ = created;
  return created;
}

function isTopModal(token: symbol): boolean {
  return getModalStack().at(-1) === token;
}

function popModal(token: symbol): void {
  const stack = getModalStack();
  const index = stack.indexOf(token);
  if (index !== -1) {
    stack.splice(index, 1);
  }
}

function cycleFocus(
  focusables: readonly HTMLElement[],
  activeElement: Element | null,
  shiftKey: boolean
): void {
  if (focusables.length === 0) {
    return;
  }
  const currentIndex =
    activeElement instanceof window.HTMLElement
      ? focusables.indexOf(activeElement)
      : -1;
  if (currentIndex === -1) {
    focusables[shiftKey ? focusables.length - 1 : 0]?.focus();
    return;
  }
  const delta = shiftKey ? -1 : 1;
  const nextIndex =
    (((currentIndex + delta) % focusables.length) + focusables.length) %
    focusables.length;
  focusables[nextIndex]?.focus();
}

// Only the top modal acts and stops keys; window-capture listeners registered
// before activation still run first (see docs/style-management.md).
export function activateModal(options: ActivateModalOptions): DeactivateModal {
  const token = Symbol("modal");
  getModalStack().push(token);

  const previousActiveElement =
    document.activeElement instanceof window.HTMLElement
      ? document.activeElement
      : null;

  function handleKeyDown(e: KeyboardEvent): void {
    if (!isTopModal(token)) {
      return;
    }
    e.stopImmediatePropagation();
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
    if (isTopModal(token)) {
      e.stopImmediatePropagation();
    }
  }

  function handleKeyPress(e: KeyboardEvent): void {
    if (isTopModal(token)) {
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("keypress", handleKeyPress, true);

  return function deactivateModal(): void {
    popModal(token);
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("keyup", handleKeyUp, true);
    window.removeEventListener("keypress", handleKeyPress, true);
    previousActiveElement?.focus();
  };
}
