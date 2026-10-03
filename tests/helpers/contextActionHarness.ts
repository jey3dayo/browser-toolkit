import { vi } from "vitest";
import type { SummaryTarget } from "@/background/types";
import type { ContextAction } from "@/context_actions";
import { createChromeStub } from "./chromeStub";

export const actionTarget: SummaryTarget = {
  source: "selection",
  text: "Release planning",
  title: "Team notes",
  url: "https://example.com/notes",
};

export const textAction: ContextAction = {
  id: "custom:text",
  kind: "text",
  prompt: "  Summarize {{text}} from {{title}} ({{source}}) at {{url}}  ",
  title: "要約",
};

export const eventAction: ContextAction = {
  id: "custom:event",
  kind: "event",
  prompt: "",
  title: "予定抽出",
};

export const extractedEvent = {
  start: "2026-10-03",
  title: "Release planning",
};
export const eventDisplayText = "タイトル: Release planning\n日時: 2026-10-03";

export function createContextActionHarness() {
  const chrome = createChromeStub({ tabsSendMessageResponse: actionTarget });
  const notifications = { create: vi.fn(async () => "notification-id") };
  Object.assign(chrome.runtime, {
    getURL: (path: string) => `chrome-extension://test/${path}`,
  });
  chrome.storage.local.get.mockImplementation(
    (_keys: unknown, callback: (items: unknown) => void) => {
      callback({ aiProvider: "openai", openaiApiToken: "test-token" });
    }
  );
  chrome.storage.sync.get.mockImplementation(
    (_keys: unknown, callback: (items: unknown) => void) => {
      callback({ contextActions: [textAction, eventAction] });
    }
  );
  vi.stubGlobal("chrome", { ...chrome, notifications });

  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal("fetch", fetch);

  return {
    chrome,
    fetch,
    notifications,
    respondWithError(message: string) {
      fetch.mockImplementation(async () =>
        Response.json({ error: { message } }, { status: 400 })
      );
    },
    respondWithText(text: string) {
      fetch.mockImplementation(async () =>
        Response.json({ choices: [{ message: { content: text } }] })
      );
    },
    sentBody(): unknown {
      return JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    },
  };
}
