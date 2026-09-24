import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeQrCodeOverlay,
  showQrCodeOverlay,
} from "@/content/qrcode-overlay";
import { closeImageViewer, openImageViewer } from "@/image-zoom/viewer";

vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
  },
}));

const VIEWER_URL = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=orig";

function getViewerHost(): HTMLDivElement | null {
  const el = document.getElementById("browser-toolkit-image-zoom");
  return el instanceof window.HTMLDivElement ? el : null;
}

function getQrHost(): HTMLDivElement | null {
  const el = document.getElementById("browser-toolkit-qrcode");
  return el instanceof window.HTMLDivElement ? el : null;
}

function dispatchKeydown(key: string, extra?: { shiftKey: boolean }): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { cancelable: true, key, ...extra })
  );
}

describe("modal stack across the viewer and QR overlay bundles", () => {
  afterEach(() => {
    closeImageViewer();
    closeQrCodeOverlay();
    document.body.innerHTML = "";
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("Escape closes only the topmost modal, then the next Escape closes the other", () => {
    openImageViewer(VIEWER_URL, "light");
    showQrCodeOverlay("https://example.com", "light");
    expect(getViewerHost()).not.toBeNull();
    expect(getQrHost()).not.toBeNull();

    dispatchKeydown("Escape");
    expect(getQrHost()).toBeNull();
    expect(getViewerHost()).not.toBeNull();

    dispatchKeydown("Escape");
    expect(getViewerHost()).toBeNull();
  });

  it("restores focus to the viewer's focused button after closing the QR stacked on top", () => {
    openImageViewer(VIEWER_URL, "light");
    const viewerShadow = getViewerHost()?.shadowRoot;
    const viewerFocused = viewerShadow?.activeElement;
    expect(viewerFocused).toBeInstanceOf(window.HTMLButtonElement);

    showQrCodeOverlay("https://example.com", "light");
    dispatchKeydown("Escape");

    expect(getQrHost()).toBeNull();
    expect(viewerShadow?.activeElement).toBe(viewerFocused);
  });

  it("Tab while both are open cycles focus only within the topmost modal (QR)", () => {
    openImageViewer(VIEWER_URL, "light");
    showQrCodeOverlay("https://example.com", "light");

    const qrShadow = getQrHost()?.shadowRoot;
    const qrCloseButton = qrShadow?.querySelector("button");
    expect(qrCloseButton).toBe(qrShadow?.activeElement);

    dispatchKeydown("Tab");
    expect(qrCloseButton).toBe(qrShadow?.activeElement);

    dispatchKeydown("Tab", { shiftKey: true });
    expect(qrCloseButton).toBe(qrShadow?.activeElement);
  });

  it("does not run a window-capture keydown listener added after activation", () => {
    openImageViewer(VIEWER_URL, "light");

    const lateListener = vi.fn();
    window.addEventListener("keydown", lateListener, true);
    dispatchKeydown("l");
    window.removeEventListener("keydown", lateListener, true);

    expect(lateListener).not.toHaveBeenCalled();
  });

  it("removes a non-top modal from the stack on close, leaving the top modal working", () => {
    openImageViewer(VIEWER_URL, "light");
    showQrCodeOverlay("https://example.com", "light");

    closeImageViewer();
    expect(getViewerHost()).toBeNull();
    expect(getQrHost()).not.toBeNull();

    dispatchKeydown("Escape");
    expect(getQrHost()).toBeNull();
  });
});
