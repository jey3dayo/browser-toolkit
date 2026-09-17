import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DrawerDialog } from "@/components/shared/Dialog";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const POPUP_LABEL = "portal contract dialog";

type PortalContainer = React.ComponentProps<
  typeof DrawerDialog
>["portalContainer"];

function renderDialog(
  root: ReturnType<typeof createRoot>,
  portalContainer?: PortalContainer
): void {
  act(() => {
    root.render(
      <DrawerDialog
        defaultOpen
        popupAriaLabel={POPUP_LABEL}
        portalContainer={portalContainer}
        trigger={<span>trigger</span>}
        triggerAriaLabel="open dialog"
      >
        <p>dialog body</p>
      </DrawerDialog>
    );
  });
}

describe("DrawerDialog portalContainer", () => {
  let hostElement: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    hostElement = document.createElement("div");
    document.body.appendChild(hostElement);
    root = createRoot(hostElement);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    hostElement.remove();
  });

  it("portals into document.body when portalContainer is omitted (Sidebar default behavior)", () => {
    renderDialog(root);

    const popup = document.body.querySelector(`[aria-label="${POPUP_LABEL}"]`);

    expect(popup).not.toBeNull();
    expect(hostElement.contains(popup)).toBe(false);
    expect(document.body.contains(popup)).toBe(true);
  });

  it("portals into the given container when portalContainer is provided (ShadowRoot use case)", () => {
    const shadowHost = document.createElement("div");
    document.body.appendChild(shadowHost);
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });

    renderDialog(root, shadowRoot);

    const popupInShadow = shadowRoot.querySelector(
      `[aria-label="${POPUP_LABEL}"]`
    );
    const popupInBody = document.body.querySelector(
      `[aria-label="${POPUP_LABEL}"]`
    );

    expect(popupInShadow).not.toBeNull();
    expect(popupInBody).toBeNull();

    shadowHost.remove();
  });
});
