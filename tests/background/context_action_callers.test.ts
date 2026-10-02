import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleContextMenuClick } from "@/background/context_menu_actions";
import { runtimeHandlers } from "@/background/runtime_handlers";
import type { BackgroundRequest } from "@/background/types";
import { t } from "@/i18n";
import {
  actionTarget,
  createContextActionHarness,
  eventAction,
  eventDisplayText,
  extractedEvent,
  textAction,
} from "../helpers/contextActionHarness";

type RunRequest = Extract<BackgroundRequest, { action: "runContextAction" }>;

async function runRuntimeRequest(overrides: Partial<RunRequest> = {}) {
  const sendResponse = vi.fn();
  const keepChannelOpen = runtimeHandlers.runContextAction(
    {
      action: "runContextAction",
      actionId: textAction.id,
      source: "popup",
      tabId: 7,
      target: actionTarget,
      ...overrides,
    },
    sendResponse
  );
  expect(keepChannelOpen).toBe(true);
  await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledTimes(1));
  return sendResponse.mock.calls[0][0];
}

const menuParams = {
  actionId: textAction.id,
  info: { menuItemId: textAction.id, selectionText: " Release planning " },
  tabId: 7,
};

describe("Context Action caller contracts", () => {
  let harness: ReturnType<typeof createContextActionHarness>;

  beforeEach(() => {
    harness = createContextActionHarness();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the exact text runtime payload without leaking the executor kind", async () => {
    harness.respondWithText("Summary");

    expect(await runRuntimeRequest()).toStrictEqual(
      Result.succeed({
        resultType: "text",
        source: "selection",
        text: "Summary",
      })
    );
    expect(harness.chrome.tabs.sendMessage).not.toHaveBeenCalled();
    expect(harness.notifications.create).not.toHaveBeenCalled();
  });

  it("keeps the exact event runtime payload without leaking structured event data", async () => {
    harness.respondWithText(JSON.stringify(extractedEvent));

    expect(await runRuntimeRequest({ actionId: eventAction.id })).toStrictEqual(
      Result.succeed({
        eventText: eventDisplayText,
        resultType: "event",
        source: "selection",
      })
    );
    expect(harness.notifications.create).not.toHaveBeenCalled();
  });

  it("resolves a missing runtime target through the existing selection-aware request", async () => {
    harness.respondWithText("Summary");

    expect(await runRuntimeRequest({ target: undefined })).toStrictEqual(
      Result.succeed({
        resultType: "text",
        source: "selection",
        text: "Summary",
      })
    );
    expect(harness.chrome.tabs.sendMessage).toHaveBeenCalledExactlyOnceWith(
      7,
      { action: "getSummaryTargetText" },
      expect.any(Function)
    );
  });

  it("returns missing actions without executing them", async () => {
    expect(await runRuntimeRequest({ actionId: "missing" })).toStrictEqual(
      Result.fail(t("background.runtime.actionMissing"))
    );
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { action: textAction, source: "popup" },
    { action: eventAction, source: "popup" },
    { action: textAction, source: "contextMenu" },
    { action: eventAction, source: undefined },
  ] as const)(
    "keeps $action.kind failures silent for runtime source $source",
    async ({ action, source }) => {
      harness.respondWithError("Provider failed");

      expect(
        await runRuntimeRequest({ actionId: action.id, source })
      ).toStrictEqual(Result.fail("Provider failed"));
      expect(harness.notifications.create).not.toHaveBeenCalled();
      expect(harness.chrome.tabs.sendMessage).not.toHaveBeenCalled();
    }
  );

  it("shows the token hint only for event failures with runtime contextMenu source", async () => {
    harness.respondWithError("Provider failed");

    expect(
      await runRuntimeRequest({
        actionId: eventAction.id,
        source: "contextMenu",
      })
    ).toStrictEqual(Result.fail("Provider failed"));
    expect(harness.notifications.create).toHaveBeenCalledExactlyOnceWith({
      iconUrl: "chrome-extension://test/images/icon128.png",
      message: `Provider failed\n\n${t("background.runtime.tokenHint")}`,
      priority: 1,
      title: "予定抽出に失敗しました",
      type: "basic",
    });
    expect(harness.chrome.tabs.sendMessage).toHaveBeenCalledExactlyOnceWith(
      7,
      {
        action: "showActionOverlay",
        mode: "event",
        primary: "Provider failed",
        secondary: t("background.runtime.tokenHint"),
        source: "selection",
        status: "error",
        title: "予定抽出",
      },
      expect.any(Function)
    );
  });

  it("still responds with the execution error when the runtime error overlay is unavailable", async () => {
    harness.respondWithError("Provider failed");
    harness.chrome.tabs.sendMessage.mockImplementation(
      (_tabId: number, _message: unknown, callback: () => void) => {
        harness.chrome.runtime.lastError = { message: "Page unavailable" };
        callback();
        harness.chrome.runtime.lastError = null;
      }
    );

    expect(
      await runRuntimeRequest({
        actionId: eventAction.id,
        source: "contextMenu",
      })
    ).toStrictEqual(Result.fail("Provider failed"));
    expect(harness.notifications.create).toHaveBeenCalledTimes(1);
  });

  it("maps unexpected execution exceptions to the existing runtime failure response", async () => {
    harness.chrome.storage.local.get.mockImplementationOnce(() => {
      throw new Error("Storage unavailable");
    });

    expect(await runRuntimeRequest()).toStrictEqual(
      Result.fail("Storage unavailable")
    );
    expect(harness.notifications.create).not.toHaveBeenCalled();
  });

  it.each([textAction, eventAction])(
    "keeps the direct $kind menu loading and ready overlay payloads",
    async (action) => {
      harness.respondWithText(
        action.kind === "event" ? JSON.stringify(extractedEvent) : "Summary"
      );

      await handleContextMenuClick({ ...menuParams, actionId: action.id }, [
        action,
      ]);

      expect(harness.chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(harness.chrome.tabs.sendMessage).toHaveBeenNthCalledWith(
        1,
        7,
        {
          action: "showActionOverlay",
          mode: action.kind,
          secondary: "選択範囲:\nRelease planning",
          source: "selection",
          status: "loading",
          title: `${action.title}（選択範囲）`,
        },
        expect.any(Function)
      );
      expect(harness.chrome.tabs.sendMessage).toHaveBeenNthCalledWith(
        2,
        7,
        {
          action: "showActionOverlay",
          ...(action.kind === "event" ? { event: extractedEvent } : {}),
          mode: action.kind,
          primary: action.kind === "event" ? eventDisplayText : "Summary",
          secondary: "選択範囲:\nRelease planning",
          source: "selection",
          status: "ready",
          title: `${action.title}（選択範囲）`,
        },
        expect.any(Function)
      );
      expect(harness.notifications.create).not.toHaveBeenCalled();
    }
  );

  it.each([textAction, eventAction])(
    "keeps direct $kind menu error notifications and selection context without a token hint",
    async (action) => {
      harness.respondWithError("Provider failed");

      await handleContextMenuClick({ ...menuParams, actionId: action.id }, [
        action,
      ]);

      expect(harness.notifications.create).toHaveBeenCalledExactlyOnceWith({
        iconUrl: "chrome-extension://test/images/icon128.png",
        message: "Provider failed",
        priority: 1,
        title: `${action.title}に失敗しました`,
        type: "basic",
      });
      expect(harness.chrome.tabs.sendMessage).toHaveBeenLastCalledWith(
        7,
        {
          action: "showActionOverlay",
          mode: action.kind,
          primary: "Provider failed",
          secondary: "選択範囲:\nRelease planning",
          source: "selection",
          status: "error",
          title: `${action.title}（選択範囲）`,
        },
        expect.any(Function)
      );
    }
  );

  it("resolves page text for a menu click without a selection", async () => {
    harness.respondWithText("Summary");
    harness.chrome.tabs.sendMessage.mockImplementation(
      (
        _tabId: number,
        _message: unknown,
        callback: (response: unknown) => void
      ) => {
        callback({ ...actionTarget, source: "page" });
      }
    );

    await handleContextMenuClick(
      { ...menuParams, info: { menuItemId: textAction.id } },
      [textAction]
    );

    expect(harness.chrome.tabs.sendMessage).toHaveBeenNthCalledWith(
      2,
      7,
      { action: "getSummaryTargetText", ignoreSelection: true },
      expect.any(Function)
    );
    expect(harness.chrome.tabs.sendMessage).toHaveBeenLastCalledWith(
      7,
      {
        action: "showActionOverlay",
        mode: "text",
        primary: "Summary",
        secondary: undefined,
        source: "page",
        status: "ready",
        title: `${textAction.title}（ページ本文）`,
      },
      expect.any(Function)
    );
  });
});
