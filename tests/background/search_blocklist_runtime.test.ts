import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "../helpers/chromeStub";

type ExtendedChromeStub = ChromeStub & {
  tabs: ChromeStub["tabs"] & { create: ReturnType<typeof vi.fn> };
  runtime: ChromeStub["runtime"] & { getURL: ReturnType<typeof vi.fn> };
};

function stubChromeWithTabsCreate(
  listeners: Array<(...args: unknown[]) => unknown>
): ExtendedChromeStub {
  const chromeStub = createChromeStub({ listeners }) as ExtendedChromeStub;
  chromeStub.tabs.create = vi.fn(async (createProperties: { url: string }) => ({
    id: 1,
    url: createProperties.url,
  }));
  chromeStub.runtime.getURL = vi.fn((path: string) => path);
  vi.stubGlobal("chrome", chromeStub);
  return chromeStub;
}

describe("background: search blocklist runtime requests", () => {
  let listeners: Array<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.resetModules();
    listeners = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the surface page that hosts the requested pane", async () => {
    const chromeStub = stubChromeWithTabsCreate(listeners);
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    registerRuntimeMessageHandlers();
    const [listener] = listeners;

    const sendResponse = vi.fn();
    listener(
      { action: "openPopupPane", paneId: "pane-history" },
      {},
      sendResponse
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeStub.tabs.create).toHaveBeenCalledWith({
      url: "options.html#pane-history",
    });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it("falls back to the default pane for an unknown pane id", async () => {
    const chromeStub = stubChromeWithTabsCreate(listeners);
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    registerRuntimeMessageHandlers();
    const [listener] = listeners;

    const sendResponse = vi.fn();
    listener(
      { action: "openPopupPane", paneId: "not-a-real-pane" },
      {},
      sendResponse
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeStub.tabs.create).toHaveBeenCalledWith({
      url: "popup.html#pane-actions",
    });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it("keeps openPopupSettings opening the settings pane", async () => {
    const chromeStub = stubChromeWithTabsCreate(listeners);
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    registerRuntimeMessageHandlers();
    const [listener] = listeners;

    const sendResponse = vi.fn();
    listener({ action: "openPopupSettings" }, {}, sendResponse);
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeStub.tabs.create).toHaveBeenCalledWith({
      url: "options.html#pane-settings",
    });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});
