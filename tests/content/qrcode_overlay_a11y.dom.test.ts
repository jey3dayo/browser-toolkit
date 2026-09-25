import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeQrCodeOverlay,
  showQrCodeOverlay,
} from "@/content/qrcode-overlay";

vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("QR code overlay accessibility", () => {
  afterEach(() => {
    // Wiping the DOM alone leaves the modal's window-capture key listeners
    // and its stack token attached, so close it explicitly first.
    closeQrCodeOverlay();
    document.body.innerHTML = "";
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("renders the QR overlay as a labelled modal dialog and focuses close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "open";
    document.body.appendChild(trigger);
    trigger.focus();

    showQrCodeOverlay("https://example.com", "light");

    const host = document.getElementById("browser-toolkit-qrcode");
    const shadow = host?.shadowRoot;
    const dialog = shadow?.querySelector('[role="dialog"]');
    const closeButton = shadow?.querySelector("button");

    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(closeButton).toBe(shadow?.activeElement);
  });

  it("traps Tab on the close button and keeps it from reaching the page", () => {
    const pageListener = vi.fn();
    window.addEventListener("keydown", pageListener);

    showQrCodeOverlay("https://example.com", "light");
    const shadow = document.getElementById(
      "browser-toolkit-qrcode"
    )?.shadowRoot;
    const closeButton = shadow?.querySelector("button");
    expect(closeButton).toBe(shadow?.activeElement);

    const tabEvent = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "Tab",
    });
    window.dispatchEvent(tabEvent);
    expect(closeButton).toBe(shadow?.activeElement);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(pageListener).not.toHaveBeenCalled();

    const shiftTabEvent = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "Tab",
      shiftKey: true,
    });
    window.dispatchEvent(shiftTabEvent);
    expect(closeButton).toBe(shadow?.activeElement);
    expect(shiftTabEvent.defaultPrevented).toBe(true);

    window.removeEventListener("keydown", pageListener);
  });

  it("isolates page key listeners while open", () => {
    const pageListener = vi.fn();
    window.addEventListener("keydown", pageListener);

    showQrCodeOverlay("https://example.com", "light");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "l" })
    );

    expect(pageListener).not.toHaveBeenCalled();
    expect(document.getElementById("browser-toolkit-qrcode")).not.toBeNull();

    window.removeEventListener("keydown", pageListener);
  });

  it("closes on Escape and does not let it reach page listeners", () => {
    const pageListener = vi.fn();
    window.addEventListener("keydown", pageListener);

    showQrCodeOverlay("https://example.com", "light");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "Escape" })
    );

    expect(document.getElementById("browser-toolkit-qrcode")).toBeNull();
    expect(pageListener).not.toHaveBeenCalled();

    window.removeEventListener("keydown", pageListener);
  });

  it("restores focus to the trigger on close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "open";
    document.body.appendChild(trigger);
    trigger.focus();

    showQrCodeOverlay("https://example.com", "light");
    expect(document.activeElement).not.toBe(trigger);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "Escape" })
    );

    expect(document.activeElement).toBe(trigger);
  });
});
