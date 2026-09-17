import { Result } from "@praha/byethrow";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DebugPane } from "@/popup/panes/DebugPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { PopupRuntime } from "@/popup/runtime";
import { flush } from "./helpers/async";

function buildRuntime(overrides: Partial<PopupRuntime> = {}): PopupRuntime {
  return {
    diagnoseFocusOverride: async () =>
      Result.succeed({
        hasFocus: true,
        hidden: false,
        markerPresent: false,
        visibilityState: "visible",
      }),
    getActiveTab: async () => Result.succeed(null),
    getActiveTabId: async () => Result.succeed(1),
    isExtensionPage: true,
    matchesFocusOverridePatterns: () => false,
    openUrl: () => {
      // no-op
    },
    reloadTab: async () => Result.succeed(),
    sendMessageToBackground: async () => Result.succeed({}),
    sendMessageToTab: async () => Result.succeed({ available: false }),
    storageLocalGet: async () => Result.succeed({}),
    storageLocalRemove: async () => Result.succeed(),
    storageLocalSet: async () => Result.succeed(),
    storageSyncGet: async () => Result.succeed({}),
    storageSyncSet: async () => Result.succeed(),
    ...overrides,
  };
}

function buildProps(runtime: PopupRuntime): PopupPaneBaseProps {
  return {
    notify: {
      error: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    },
    runtime,
  };
}

async function renderDebugPane(
  props: PopupPaneBaseProps
): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(DebugPane, props));
    await flush(setTimeout);
  });
  return container;
}

describe("DebugPane search blocklist diagnostics", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("queries the active tab and shows counts for a valid response", async () => {
    const sendMessageToTab = vi.fn(async () =>
      Result.succeed({
        available: true,
        blockedCount: 3,
        detectedCount: 10,
        engineId: "google",
        ruleRevision: 2,
      })
    );
    const runtime = buildRuntime({ sendMessageToTab });
    const container = await renderDebugPane(buildProps(runtime));

    expect(sendMessageToTab).toHaveBeenCalledWith(1, {
      action: "getSearchBlocklistDiagnostics",
    });
    expect(container.textContent).toContain("10");
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("google");
  });

  it("shows the not-a-search-page state when the tab reports unavailable", async () => {
    const runtime = buildRuntime({
      sendMessageToTab: async () => Result.succeed({ available: false }),
    });
    const container = await renderDebugPane(buildProps(runtime));

    expect(container.textContent).toContain(
      "アクティブなタブは検索結果ページではありません"
    );
  });

  it("rejects a response with a negative count", async () => {
    const runtime = buildRuntime({
      sendMessageToTab: async () =>
        Result.succeed({
          available: true,
          blockedCount: -1,
          detectedCount: 10,
          engineId: "google",
          ruleRevision: 2,
        }),
    });
    const container = await renderDebugPane(buildProps(runtime));

    expect(container.textContent).toContain("取得できませんでした");
  });

  it("rejects a response with an oversized engineId", async () => {
    const runtime = buildRuntime({
      sendMessageToTab: async () =>
        Result.succeed({
          available: true,
          blockedCount: 1,
          detectedCount: 1,
          engineId: "x".repeat(1000),
          ruleRevision: 1,
        }),
    });
    const container = await renderDebugPane(buildProps(runtime));

    expect(container.textContent).toContain("取得できませんでした");
  });

  it("shows the unavailable state when sending the message fails", async () => {
    const runtime = buildRuntime({
      sendMessageToTab: async () => Result.fail("no receiving end"),
    });
    const container = await renderDebugPane(buildProps(runtime));

    expect(container.textContent).toContain("取得できませんでした");
  });
});
