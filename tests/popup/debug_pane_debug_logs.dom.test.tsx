import { Result } from "@praha/byethrow";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DebugPane } from "@/popup/panes/DebugPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { PopupRuntime } from "@/popup/runtime";
import { flush } from "../helpers/async";

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
    getSearchResultTabId: async () => Result.succeed(1),
    isExtensionPage: true,
    matchesFocusOverridePatterns: () => false,
    openOptionsPane: async () => Result.succeed(),
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

function debugModeRuntime(
  sendMessageToBackground: PopupRuntime["sendMessageToBackground"]
): PopupRuntime {
  return buildRuntime({
    sendMessageToBackground,
    storageLocalGet: async () => Result.succeed({ debugMode: true }),
  });
}

describe("DebugPane debug log loading failures", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("統計取得が ok:false のとき統計エラーを通知する", async () => {
    const runtime = debugModeRuntime(async () =>
      Result.succeed({ error: "x", ok: false })
    );
    const props = buildProps(runtime);
    await renderDebugPane(props);

    expect(props.notify.error).toHaveBeenCalledWith(
      "ログ統計の読み込みに失敗しました"
    );
  });

  it("ログ取得が ok:false のときエラーを通知しログ表示を開かない", async () => {
    const runtime = debugModeRuntime(async (message) =>
      Result.succeed(
        message.action === "getDebugLogs"
          ? { error: "x", ok: false }
          : { entryCount: 1, ok: true, sizeKB: "0.01" }
      )
    );
    const props = buildProps(runtime);
    const container = await renderDebugPane(props);

    const button = container.querySelector<HTMLButtonElement>(
      '[data-testid="show-debug-logs"]'
    );
    await act(async () => {
      button?.click();
      await flush(setTimeout);
    });

    expect(props.notify.error).toHaveBeenCalledWith(
      "ログの読み込みに失敗しました"
    );
    expect(
      container.querySelector('[data-testid="hide-debug-logs"]')
    ).toBeNull();
  });
});
