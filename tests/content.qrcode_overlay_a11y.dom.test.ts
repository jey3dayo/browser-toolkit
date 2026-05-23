import { afterEach, describe, expect, it, vi } from "vitest";
import { showQrCodeOverlay } from "@/content/qrcode-overlay";

vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("QR code overlay accessibility", () => {
  afterEach(() => {
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
});
