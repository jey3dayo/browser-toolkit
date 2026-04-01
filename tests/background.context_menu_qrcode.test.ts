import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

const debugLogMock = vi.fn(async () => {
  // no-op
});
const showErrorNotificationMock = vi.fn(async () => {
  // no-op
});

vi.mock("@/utils/debug_log", () => ({
  debugLog: debugLogMock,
}));

vi.mock("@/utils/notifications", () => ({
  showErrorNotification: showErrorNotificationMock,
}));

describe("background: QR code context menu", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    chromeStub = createChromeStub();
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to pageUrl when tab.url is unavailable", async () => {
    const { handleQrCodeContextMenuClick } = await import(
      "@/background/context_menu_qrcode"
    );

    await handleQrCodeContextMenuClick({
      tabId: 12,
      tab: {},
      pageUrl: "https://example.com/fallback",
    });

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledWith(
      12,
      {
        action: "showQrCodeOverlay",
        url: "https://example.com/fallback",
      },
      expect.any(Function)
    );
  });

  it("re-injects the content script and retries when the receiver is missing", async () => {
    let firstAttempt = true;
    chromeStub.tabs.sendMessage.mockImplementation(
      (
        _tabId: number,
        _message: unknown,
        callback?: (resp: unknown) => void
      ) => {
        if (firstAttempt) {
          firstAttempt = false;
          chromeStub.runtime.lastError = {
            message:
              "Could not establish connection. Receiving end does not exist.",
          };
          callback?.(undefined);
          chromeStub.runtime.lastError = null;
          return;
        }

        chromeStub.runtime.lastError = null;
        callback?.({ ok: true });
      }
    );

    const { handleQrCodeContextMenuClick } = await import(
      "@/background/context_menu_qrcode"
    );

    await handleQrCodeContextMenuClick({
      tabId: 34,
      tab: { url: "https://example.com/retry" },
    });

    expect(chromeStub.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 34 },
      files: ["dist/content.js"],
    });
    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(showErrorNotificationMock).not.toHaveBeenCalled();
  });
});
