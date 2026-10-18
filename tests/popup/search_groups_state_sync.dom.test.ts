import type { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { useSearchGroupsState } from "@/popup/panes/useSearchGroupsState";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  normalizeSearchEngineGroups,
} from "@/search_engine_groups";
import {
  BUILTIN_SEARCH_ENGINE_IDS,
  DEFAULT_SEARCH_ENGINES,
} from "@/search_engines";
import { flush } from "../helpers/async";
import { createPopupDom } from "../helpers/popupDom";
import {
  createNotifierStub,
  createPopupRuntimeStub,
  createSyncStorageStub,
  type PopupSyncStorageStub,
} from "../helpers/popupSyncStorageStub";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type SearchGroupsProbe = ReturnType<typeof useSearchGroupsState>;

const Probe = (props: {
  output: { current: SearchGroupsProbe | null };
  notify: ReturnType<typeof createNotifierStub>;
  runtime: PopupPaneBaseProps["runtime"];
}): null => {
  props.output.current = useSearchGroupsState({
    notify: props.notify,
    runtime: props.runtime,
  });
  return null;
};

async function mountHook(params: {
  dom: JSDOM;
  storageStub: PopupSyncStorageStub;
}): Promise<{ output: { current: SearchGroupsProbe | null }; root: Root }> {
  const container = params.dom.window.document.createElement("div");
  params.dom.window.document.body.append(container);
  const root = createRoot(container);

  const runtime = createPopupRuntimeStub({
    storageSyncGet: params.storageStub.get,
    storageSyncSet: params.storageStub.set,
  });

  const output: { current: SearchGroupsProbe | null } = { current: null };
  await act(async () => {
    root.render(
      createElement(Probe, {
        notify: createNotifierStub(),
        output,
        runtime,
      })
    );
    await flush(params.dom.window);
  });
  return { output, root };
}

async function unmountHook(params: { dom: JSDOM; root: Root }): Promise<void> {
  await act(async () => {
    await params.root.unmount();
    await flush(params.dom.window);
  });
}

function createDefaultStorageStub(): PopupSyncStorageStub {
  return createSyncStorageStub({
    searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
    searchEngines: [...DEFAULT_SEARCH_ENGINES],
  });
}

describe("popup search groups state across two instances (onChanged rehydration)", () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.resetModules();
    dom = createPopupDom("chrome-extension://test/popup.html#pane-actions");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    dom.window.close();
  });

  it("propagates one instance's save into the other without silent revert", async () => {
    const storageStub = createDefaultStorageStub();
    vi.stubGlobal("chrome", { storage: { onChanged: storageStub.onChanged } });

    const first = await mountHook({ dom, storageStub });
    const second = await mountHook({ dom, storageStub });

    const [shopping, trend] = DEFAULT_SEARCH_ENGINE_GROUPS;
    await act(async () => {
      await first.output.current?.toggleGroupEnabled(shopping.id, false);
      await flush(dom.window);
    });

    expect(second.output.current?.groups).toEqual([
      { ...shopping, enabled: false },
      trend,
    ]);

    await act(async () => {
      second.output.current?.startEditingGroupName(trend);
      second.output.current?.setEditingNameValue("お買物改");
      await flush(dom.window);
    });
    await act(async () => {
      await second.output.current?.saveGroupName(trend.id);
      await flush(dom.window);
    });

    const expected = [
      { ...shopping, enabled: false },
      { ...trend, name: "お買物改" },
    ];
    expect(
      normalizeSearchEngineGroups(storageStub.store.searchEngineGroups)
    ).toEqual(expected);
    expect(first.output.current?.groups).toEqual(expected);
    expect(second.output.current?.groups).toEqual(expected);

    await unmountHook({ dom, root: first.root });
    await unmountHook({ dom, root: second.root });
  });

  it("rebases a save onto the latest storage after events skipped during editing", async () => {
    const storageStub = createDefaultStorageStub();
    vi.stubGlobal("chrome", { storage: { onChanged: storageStub.onChanged } });

    const first = await mountHook({ dom, storageStub });
    const second = await mountHook({ dom, storageStub });

    const [shopping, trend] = DEFAULT_SEARCH_ENGINE_GROUPS;
    await act(async () => {
      second.output.current?.startEditingGroupName(trend);
      second.output.current?.setEditingNameValue("お買物改");
      await flush(dom.window);
    });

    await act(async () => {
      await first.output.current?.toggleGroupEnabled(shopping.id, false);
      await flush(dom.window);
    });

    await act(async () => {
      await second.output.current?.saveGroupName(trend.id);
      await flush(dom.window);
    });

    const expected = [
      { ...shopping, enabled: false },
      { ...trend, name: "お買物改" },
    ];
    expect(storageStub.store.searchEngineGroups).toEqual(expected);

    await unmountHook({ dom, root: first.root });
    await unmountHook({ dom, root: second.root });
  });

  it("does not replace the list while a group name is being edited", async () => {
    const storageStub = createDefaultStorageStub();
    vi.stubGlobal("chrome", { storage: { onChanged: storageStub.onChanged } });

    const { output, root } = await mountHook({ dom, storageStub });

    await act(async () => {
      output.current?.startEditingGroupName(DEFAULT_SEARCH_ENGINE_GROUPS[0]);
      output.current?.setEditingNameValue("editing");
      await flush(dom.window);
    });

    const foreignGroups = [
      {
        enabled: true,
        engineIds: [BUILTIN_SEARCH_ENGINE_IDS.GOOGLE],
        id: "group:foreign",
        name: "外部",
      },
    ];
    await act(async () => {
      await storageStub.set({ searchEngineGroups: foreignGroups });
      await flush(dom.window);
    });

    expect(output.current?.groups).toEqual(DEFAULT_SEARCH_ENGINE_GROUPS);

    await act(async () => {
      output.current?.cancelEditingGroupName();
      await storageStub.set({
        searchEngineGroups: [
          {
            enabled: true,
            engineIds: [BUILTIN_SEARCH_ENGINE_IDS.GOOGLE],
            id: "group:later",
            name: "後発",
          },
        ],
      });
      await flush(dom.window);
    });

    expect(output.current?.groups).toEqual([
      {
        enabled: true,
        engineIds: [BUILTIN_SEARCH_ENGINE_IDS.GOOGLE],
        id: "group:later",
        name: "後発",
      },
    ]);

    await unmountHook({ dom, root });
  });
});
