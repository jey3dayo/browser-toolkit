import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPENAI_MODEL, OPENAI_MODELS } from "@/constants/models";
import { flush } from "../helpers/async";
import { type ChromeStub, createChromeStub } from "../helpers/chromeStub";

const BACKGROUND_IMPORT_TEST_TIMEOUT_MS = 15_000;

describe("background: OpenAI model selection", () => {
  let listeners: Array<(...args: unknown[]) => unknown>;
  let chromeStub: ChromeStub;
  let storedModel: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    listeners = [];
    storedModel = OPENAI_MODELS.GPT_6_1_SOL;
    chromeStub = createChromeStub({ listeners });

    chromeStub.storage.local.get.mockImplementation(
      (keys: string[], callback: (items: unknown) => void) => {
        chromeStub.runtime.lastError = null;
        const keyList = Array.isArray(keys) ? keys : [String(keys)];
        const items: Record<string, unknown> = {};
        if (keyList.includes("openaiApiToken")) {
          items.openaiApiToken = "sk-test";
        }
        if (keyList.includes("openaiCustomPrompt")) {
          items.openaiCustomPrompt = "";
        }
        if (keyList.includes("openaiModel") && storedModel !== undefined) {
          items.openaiModel = storedModel;
        }
        callback(items);
      }
    );

    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      expected: OPENAI_MODELS.GPT_6_1_SOL,
      stored: OPENAI_MODELS.GPT_6_1_SOL,
    },
    { expected: DEFAULT_OPENAI_MODEL, stored: undefined },
  ])(
    "sends $expected without temperature when saved model is $stored",
    async ({ stored, expected }) => {
      storedModel = stored;
      let capturedBody: unknown;

      const fetchSpy = vi.fn((_url: string, options?: unknown) => {
        const body =
          typeof (options as { body?: unknown }).body === "string"
            ? (options as { body: string }).body
            : "";
        capturedBody = JSON.parse(body);
        return Promise.resolve({
          json: () =>
            Promise.resolve({ choices: [{ message: { content: "ok" } }] }),
          ok: true,
          status: 200,
        } as unknown);
      });

      vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);

      await import("@/background.ts");

      const [listener] = listeners;
      if (!listener) {
        throw new Error("missing runtime.onMessage listener");
      }

      const sendResponse = vi.fn();
      listener(
        {
          action: "summarizeText",
          target: { source: "page", text: "hello", title: "t", url: "u" },
        },
        {},
        sendResponse
      );

      await flush(setTimeout, 6);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(capturedBody).toEqual(
        expect.objectContaining({ model: expected })
      );
      expect(capturedBody).not.toHaveProperty("temperature");
    },
    BACKGROUND_IMPORT_TEST_TIMEOUT_MS
  );
});
