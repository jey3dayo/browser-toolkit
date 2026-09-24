import { afterEach, describe, expect, it, vi } from "vitest";
import { activateModal, type DeactivateModal } from "@/ui/modal-controller";

type Setup = {
  buttons: HTMLButtonElement[];
  shadow: ShadowRoot;
};

function setup(count: number): Setup {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const buttons = Array.from({ length: count }, () => {
    const button = document.createElement("button");
    shadow.appendChild(button);
    return button;
  });
  return { buttons, shadow };
}

describe("modal-controller cycleFocus", () => {
  let deactivate: DeactivateModal | null = null;

  afterEach(() => {
    deactivate?.();
    deactivate = null;
    document.body.innerHTML = "";
  });

  it("Tab from outside the focusables focuses the first one", () => {
    const { shadow, buttons } = setup(3);
    deactivate = activateModal({
      getActiveElement: () => shadow.activeElement,
      getFocusables: () => buttons,
      onClose: vi.fn(),
    });

    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "Tab" })
    );

    expect(shadow.activeElement).toBe(buttons[0]);
  });

  it("Shift+Tab from outside the focusables focuses the last one", () => {
    const { shadow, buttons } = setup(3);
    deactivate = activateModal({
      getActiveElement: () => shadow.activeElement,
      getFocusables: () => buttons,
      onClose: vi.fn(),
    });

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        cancelable: true,
        key: "Tab",
        shiftKey: true,
      })
    );

    expect(shadow.activeElement).toBe(buttons.at(-1));
  });

  it("Tab from inside cycles forward and wraps to the first", () => {
    const { shadow, buttons } = setup(3);
    buttons.at(-1)?.focus();
    deactivate = activateModal({
      getActiveElement: () => shadow.activeElement,
      getFocusables: () => buttons,
      onClose: vi.fn(),
    });

    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "Tab" })
    );

    expect(shadow.activeElement).toBe(buttons[0]);
  });
});
