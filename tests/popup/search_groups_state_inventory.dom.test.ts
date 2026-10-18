import type { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { useSearchGroupsState } from "@/popup/panes/useSearchGroupsState";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  generateGroupId,
  MAX_SEARCH_ENGINE_GROUPS,
  type SearchEngineGroup,
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
type NotifierStub = ReturnType<typeof createNotifierStub>;

const Probe = (props: {
  notify: NotifierStub;
  output: { current: SearchGroupsProbe | null };
  runtime: PopupPaneBaseProps["runtime"];
}): null => {
  props.output.current = useSearchGroupsState({
    notify: props.notify,
    runtime: props.runtime,
  });
  return null;
};

function syntheticGroup(index: number): SearchEngineGroup {
  return {
    enabled: true,
    engineIds: [BUILTIN_SEARCH_ENGINE_IDS.GOOGLE],
    id: `group:test-${index}`,
    name: `グループ${index}`,
  };
}

async function mountHook(params: {
  dom: JSDOM;
  notify: NotifierStub;
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
        notify: params.notify,
        output,
        runtime,
      })
    );
    await flush(params.dom.window);
  });
  return { output, root };
}

describe("popup search groups state inventory (characterization)", () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.resetModules();
    dom = createPopupDom("chrome-extension://test/popup.html#pane-actions");
  });

  afterEach(() => {
    dom.window.close();
  });

  it("loads default groups and engines from storage", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    expect(output.current?.groups).toEqual(DEFAULT_SEARCH_ENGINE_GROUPS);
    expect(output.current?.engines).toEqual(DEFAULT_SEARCH_ENGINES);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("persists toggling the enabled flag of a group", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      await output.current?.toggleGroupEnabled(
        DEFAULT_SEARCH_ENGINE_GROUPS[0].id,
        false
      );
      await flush(dom.window);
    });

    const expected = DEFAULT_SEARCH_ENGINE_GROUPS.map((group, index) =>
      index === 0 ? { ...group, enabled: false } : group
    );
    expect(storageStub.store.searchEngineGroups).toEqual(expected);
    expect(output.current?.groups).toEqual(expected);
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("renames a group in place and clears the editing state", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.startEditingGroupName(DEFAULT_SEARCH_ENGINE_GROUPS[0]);
      output.current?.setEditingNameValue("お買物改");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveGroupName(DEFAULT_SEARCH_ENGINE_GROUPS[0].id);
      await flush(dom.window);
    });

    const expected = [
      { ...DEFAULT_SEARCH_ENGINE_GROUPS[0], name: "お買物改" },
      DEFAULT_SEARCH_ENGINE_GROUPS[1],
    ];
    expect(storageStub.store.searchEngineGroups).toEqual(expected);
    expect(output.current?.editingNameGroupId).toBeNull();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("rejects a rename to a name that another group already has", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.startEditingGroupName(DEFAULT_SEARCH_ENGINE_GROUPS[0]);
      output.current?.setEditingNameValue(DEFAULT_SEARCH_ENGINE_GROUPS[1].name);
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveGroupName(DEFAULT_SEARCH_ENGINE_GROUPS[0].id);
      await flush(dom.window);
    });

    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(notify.error).not.toHaveBeenCalled();
    expect(storageStub.store.searchEngineGroups).toEqual(
      DEFAULT_SEARCH_ENGINE_GROUPS
    );

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("keeps at least one engine included in an edited group", async () => {
    const singleEngineGroup: SearchEngineGroup = {
      enabled: true,
      engineIds: [BUILTIN_SEARCH_ENGINE_IDS.GOOGLE],
      id: "group:single-engine",
      name: "単一",
    };
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [singleEngineGroup],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      await output.current?.toggleEngineInGroup(
        singleEngineGroup.id,
        BUILTIN_SEARCH_ENGINE_IDS.GOOGLE,
        false
      );
      await flush(dom.window);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(storageStub.store.searchEngineGroups).toEqual([singleEngineGroup]);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("adds an engine to a group", async () => {
    const [shopping, trend] = DEFAULT_SEARCH_ENGINE_GROUPS;
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [{ ...shopping }, { ...trend }],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      await output.current?.toggleEngineInGroup(
        shopping.id,
        BUILTIN_SEARCH_ENGINE_IDS.YOUTUBE,
        true
      );
      await flush(dom.window);
    });

    expect(storageStub.store.searchEngineGroups).toEqual([
      {
        ...shopping,
        engineIds: [...shopping.engineIds, BUILTIN_SEARCH_ENGINE_IDS.YOUTUBE],
      },
      trend,
    ]);
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("adds a new group with the first engine enabled", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.setNewGroupNameInput("特売");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.addNewGroup();
      await flush(dom.window);
    });

    const stored = storageStub.store.searchEngineGroups as SearchEngineGroup[];
    expect(stored).toHaveLength(3);
    expect(stored[2]).toEqual({
      enabled: true,
      engineIds: [DEFAULT_SEARCH_ENGINES[0].id],
      id: generateGroupId("特売"),
      name: "特売",
    });
    expect(output.current?.newGroupNameInput).toBe("");
    expect(output.current?.expandedGroupId).toBe(stored[2].id);
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("rejects adding a duplicate group name", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.setNewGroupNameInput(
        DEFAULT_SEARCH_ENGINE_GROUPS[0].name
      );
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.addNewGroup();
      await flush(dom.window);
    });

    expect(output.current?.newGroupNameError).not.toBeNull();
    expect(storageStub.store.searchEngineGroups).toEqual(
      DEFAULT_SEARCH_ENGINE_GROUPS
    );
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("rejects adding a group once the maximum count is reached", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: Array.from(
        { length: MAX_SEARCH_ENGINE_GROUPS },
        (_, index) => syntheticGroup(index)
      ),
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.setNewGroupNameInput("another group");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.addNewGroup();
      await flush(dom.window);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
    expect(storageStub.store.searchEngineGroups).toHaveLength(
      MAX_SEARCH_ENGINE_GROUPS
    );

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("removes a group", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      await output.current?.removeGroup(DEFAULT_SEARCH_ENGINE_GROUPS[0].id);
      await flush(dom.window);
    });

    expect(storageStub.store.searchEngineGroups).toEqual([
      DEFAULT_SEARCH_ENGINE_GROUPS[1],
    ]);
    expect(output.current?.groups).toEqual([DEFAULT_SEARCH_ENGINE_GROUPS[1]]);
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("persists the exact order given by a reorder", async () => {
    const storageStub = createSyncStorageStub({
      searchEngineGroups: [...DEFAULT_SEARCH_ENGINE_GROUPS],
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    const reordered = [...DEFAULT_SEARCH_ENGINE_GROUPS].reverse();
    await act(async () => {
      await output.current?.handleReorder(reordered);
      await flush(dom.window);
    });

    expect(storageStub.store.searchEngineGroups).toEqual(reordered);
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });
});
