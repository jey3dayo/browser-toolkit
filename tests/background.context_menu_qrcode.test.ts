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
      pageUrl: "https://example.com/fallback",
      tab: {},
      tabId: 12,
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

  it("notifies with localized labels when no URL is available", async () => {
    const { handleQrCodeContextMenuClick } = await import(
      "@/background/context_menu_qrcode"
    );

    await handleQrCodeContextMenuClick({
      tab: {},
      tabId: 56,
    });

    expect(showErrorNotificationMock).toHaveBeenCalledWith({
      errorMessage: "このページのURLを取得できませんでした",
      hint: "ページを再読み込みしてから、もう一度お試しください。",
      title: "QRコードを表示できません",
    });
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
      tab: { url: "https://example.com/retry" },
      tabId: 34,
    });

    expect(chromeStub.scripting.executeScript).toHaveBeenCalledWith({
      files: ["dist/content.js"],
      target: { tabId: 34 },
    });
    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(showErrorNotificationMock).not.toHaveBeenCalled();
  });
});
