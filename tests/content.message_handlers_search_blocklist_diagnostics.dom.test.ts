import { describe, expect, it, vi } from "vitest";
import {
  createMessageListener,
  type MessageHandlerDeps,
} from "@/content/message-handlers";
import type { SearchBlocklistDiagnosticsResponse } from "@/content-script-messages";

function buildDeps(
  getSearchBlocklistDiagnostics: () => SearchBlocklistDiagnosticsResponse
): MessageHandlerDeps {
  return {
    enableTableSortWithNotification: vi.fn(),
    getOrCreateToastMount: vi.fn(async () => null),
    getSearchBlocklistDiagnostics,
    showActionOverlay: vi.fn(),
    showNotification: vi.fn(),
    showQrCodeOverlay: vi.fn(),
    showSummaryOverlay: vi.fn(),
    startTableObserverWithNotification: vi.fn(),
  };
}

describe("content message handlers: getSearchBlocklistDiagnostics", () => {
  it("responds with the diagnostics deps returns for a search-results page", () => {
    const response: SearchBlocklistDiagnosticsResponse = {
      available: true,
      blockedCount: 2,
      detectedCount: 5,
      engineId: "google",
      ruleRevision: 3,
    };
    const listener = createMessageListener(buildDeps(() => response));
    const sendResponse = vi.fn();

    listener(
      { action: "getSearchBlocklistDiagnostics" },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith(response);
  });

  it("responds with an unavailable diagnostics payload off search-results pages", () => {
    const listener = createMessageListener(
      buildDeps(() => ({ available: false }))
    );
    const sendResponse = vi.fn();

    listener(
      { action: "getSearchBlocklistDiagnostics" },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith({ available: false });
  });
});
