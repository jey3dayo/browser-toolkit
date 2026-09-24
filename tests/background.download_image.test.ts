import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

describe("background: downloadImage handler", () => {
  let chromeStub: ChromeStub;
  let listeners: Array<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.resetModules();
    listeners = [];
    chromeStub = createChromeStub({ listeners });
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads the original-quality URL with a safe filename for a valid pbs.twimg.com media URL", async () => {
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    registerRuntimeMessageHandlers();
    const [listener] = listeners;

    const sendResponse = vi.fn();
    listener(
      {
        action: "downloadImage",
        url: "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=large",
      },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1);
    });

    expect(chromeStub.downloads.download).toHaveBeenCalledWith({
      filename: "AbCdEfGh.webp",
      url: "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=orig",
    });
    const [response] = sendResponse.mock.calls[0];
    expect(Result.isSuccess(response)).toBe(true);
  });

  it("rejects an untrusted URL without calling chrome.downloads.download", async () => {
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    registerRuntimeMessageHandlers();
    const [listener] = listeners;

    const sendResponse = vi.fn();
    listener(
      {
        action: "downloadImage",
        url: "https://pbs.twimg.com.evil.com/media/AbCdEfGh",
      },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1);
    });

    expect(chromeStub.downloads.download).not.toHaveBeenCalled();
    const [response] = sendResponse.mock.calls[0];
    expect(Result.isFailure(response)).toBe(true);
  });

  it("surfaces a failure Result when chrome.downloads.download rejects", async () => {
    chromeStub.downloads.download.mockRejectedValueOnce(new Error("boom"));

    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    registerRuntimeMessageHandlers();
    const [listener] = listeners;

    const sendResponse = vi.fn();
    listener(
      { action: "downloadImage", url: "https://pbs.twimg.com/media/AbCdEfGh" },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1);
    });

    const [response] = sendResponse.mock.calls[0];
    expect(Result.isFailure(response)).toBe(true);
  });
});
