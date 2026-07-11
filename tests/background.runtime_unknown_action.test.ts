import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";

describe("background: runtime unknown action handling", () => {
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

  it("responds synchronously with a failure Result for an unknown action", async () => {
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );

    registerRuntimeMessageHandlers();
    expect(listeners).toHaveLength(1);
    const listener = listeners[0];

    const sendResponse = vi.fn();
    const returnValue = listener(
      { action: "definitelyNotARealAction" },
      {},
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledTimes(1);
    const [response] = sendResponse.mock.calls[0];
    expect(Result.isFailure(response)).toBe(true);
    expect(returnValue).toBe(false);
  });

  it("delegates to the matching handler for a known action", async () => {
    const { registerRuntimeMessageHandlers } = await import(
      "@/background/runtime"
    );
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    registerRuntimeMessageHandlers();
    const listener = listeners[0];

    const knownAction = Object.keys(
      runtimeHandlers
    )[0] as keyof typeof runtimeHandlers;
    const handlerSpy = vi
      .spyOn(runtimeHandlers, knownAction)
      .mockReturnValue(true);

    const sendResponse = vi.fn();
    const returnValue = listener({ action: knownAction }, {}, sendResponse);

    expect(handlerSpy).toHaveBeenCalledTimes(1);
    expect(returnValue).toBe(true);

    handlerSpy.mockRestore();
  });
});
