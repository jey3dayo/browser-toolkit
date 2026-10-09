import { Result } from "@praha/byethrow";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryPane } from "@/popup/panes/HistoryPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { PopupRuntime } from "@/popup/runtime";
import { flush } from "../helpers/async";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function buildRuntime(): PopupRuntime {
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
    storageLocalGet: async () =>
      Result.succeed({
        actionHistory: [
          {
            actionTitle: "要約",
            createdAt: 1,
            id: "h1",
            text: "  copied text \n",
          },
        ],
      }),
    storageLocalRemove: async () => Result.succeed(),
    storageLocalSet: async () => Result.succeed(),
    storageSyncGet: async () => Result.succeed({}),
    storageSyncSet: async () => Result.succeed(),
  };
}

const mountedRoots: Root[] = [];

async function renderHistoryPane(
  props: PopupPaneBaseProps
): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  await act(async () => {
    root.render(createElement(HistoryPane, props));
    await flush(setTimeout);
  });
  return container;
}

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

async function clickCopy(container: HTMLDivElement): Promise<void> {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "コピー"
  );
  expect(button).toBeDefined();
  await act(async () => {
    button?.click();
    await flush(setTimeout);
  });
}

describe("HistoryPane copy", () => {
  afterEach(async () => {
    await act(async () => {
      for (const root of mountedRoots.splice(0)) {
        root.unmount();
      }
      await flush(setTimeout);
    });
    document.body.innerHTML = "";
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("トリム済みの本文をコピーして成功を通知する", async () => {
    const writeText = vi.fn(async (_text: string) => {
      // resolves
    });
    stubClipboard(writeText);
    const props: PopupPaneBaseProps = {
      notify: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
      runtime: buildRuntime(),
    };
    const container = await renderHistoryPane(props);

    await clickCopy(container);

    expect(writeText).toHaveBeenCalledWith("copied text");
    expect(props.notify.success).toHaveBeenCalledWith("コピーしました");
    expect(props.notify.error).not.toHaveBeenCalled();
  });

  it("書き込みが失敗したらコピー失敗を通知する", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    const props: PopupPaneBaseProps = {
      notify: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
      runtime: buildRuntime(),
    };
    const container = await renderHistoryPane(props);

    await clickCopy(container);

    expect(props.notify.error).toHaveBeenCalledWith("コピーに失敗しました");
    expect(props.notify.success).not.toHaveBeenCalled();
  });
});
