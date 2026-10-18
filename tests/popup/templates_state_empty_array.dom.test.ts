import { Result } from "@praha/byethrow";
import type { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTemplatesState } from "@/popup/panes/templates/useTemplatesState";
import type { PopupRuntime } from "@/popup/runtime";
import type { SyncStorageData } from "@/storage/types";
import { DEFAULT_TEXT_TEMPLATES } from "@/text_templates";
import type { Notifier } from "@/ui/toast";
import { flush } from "../helpers/async";
import { createPopupDom } from "../helpers/popupDom";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type TemplatesProbe = ReturnType<typeof useTemplatesState>;

const Probe = (props: {
  notify: Notifier;
  output: { current: TemplatesProbe | null };
  runtime: PopupRuntime;
}): null => {
  props.output.current = useTemplatesState({
    notify: props.notify,
    runtime: props.runtime,
  });
  return null;
};

describe("popup templates state (empty array contract)", () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.resetModules();
    dom = createPopupDom("chrome-extension://test/popup.html#pane-actions");
  });

  afterEach(() => {
    dom.window.close();
  });

  const mountHook = async (params: {
    notify: Notifier;
    storageSyncGet: PopupRuntime["storageSyncGet"];
    storageSyncSet: PopupRuntime["storageSyncSet"];
  }): Promise<{ root: Root; state: { current: TemplatesProbe | null } }> => {
    const container = dom.window.document.createElement("div");
    dom.window.document.body.append(container);
    const root = createRoot(container);

    const runtime: PopupRuntime = {
      diagnoseFocusOverride: async () =>
        Result.succeed({
          hasFocus: true,
          hidden: false,
          markerPresent: false,
          visibilityState: "visible",
        }),
      getActiveTab: async () => Result.succeed(null),
      getActiveTabId: async () => Result.succeed(null),
      getSearchResultTabId: async () => Result.succeed(null),
      isExtensionPage: true,
      matchesFocusOverridePatterns: () => false,
      openUrl: () => {
        // no-op
      },
      reloadTab: async () => Result.succeed(),
      sendMessageToBackground: async () => Result.succeed({}),
      sendMessageToTab: async () => Result.succeed({}),
      storageLocalGet: async () => Result.succeed({}),
      storageLocalRemove: async () => Result.succeed(),
      storageLocalSet: async () => Result.succeed(),
      storageSyncGet: params.storageSyncGet,
      storageSyncSet: params.storageSyncSet,
    };

    const output: { current: TemplatesProbe | null } = { current: null };
    await act(async () => {
      root.render(
        createElement(Probe, {
          notify: params.notify,
          output,
          runtime,
        })
      );
      await flush(dom.window);
    });
    return { output, root };
  };

  it("keeps templates empty for an explicit [] in storage", async () => {
    const notify: Notifier = {
      error: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    };
    const storageSyncGet = vi.fn<PopupRuntime["storageSyncGet"]>(async () =>
      Result.succeed({ textTemplates: [] })
    );
    const storedItems: Partial<SyncStorageData>[] = [];
    const storageSyncSet = vi.fn<PopupRuntime["storageSyncSet"]>((items) => {
      storedItems.push(items);
      return Promise.resolve(Result.succeed());
    });

    const { root, output } = await mountHook({
      notify,
      storageSyncGet,
      storageSyncSet,
    });

    expect(output.current?.templates).toEqual([]);

    await act(async () => {
      await output.current?.toggleTemplateHidden("any-id", true);
      await flush(dom.window);
    });

    expect(storedItems).toEqual([{ textTemplates: [] }]);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("falls back to defaults for an undefined textTemplates in storage", async () => {
    const notify: Notifier = {
      error: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    };
    const storageSyncGet = vi.fn<PopupRuntime["storageSyncGet"]>(async () =>
      Result.succeed({ textTemplates: undefined })
    );
    const storageSyncSet = vi.fn<PopupRuntime["storageSyncSet"]>(async () =>
      Result.succeed()
    );

    const { root, output } = await mountHook({
      notify,
      storageSyncGet,
      storageSyncSet,
    });

    expect(output.current?.templates).toEqual(DEFAULT_TEXT_TEMPLATES);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });
});
