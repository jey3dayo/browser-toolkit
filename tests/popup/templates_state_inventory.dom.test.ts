import { Result } from "@praha/byethrow";
import type { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTemplatesState } from "@/popup/panes/templates/useTemplatesState";
import type { PopupRuntime } from "@/popup/runtime";
import {
  DEFAULT_TEXT_TEMPLATES,
  generateTemplateId,
  type TextTemplate,
} from "@/text_templates";
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

type TemplatesProbe = ReturnType<typeof useTemplatesState>;
type NotifierStub = ReturnType<typeof createNotifierStub>;

const Probe = (props: {
  notify: NotifierStub;
  output: { current: TemplatesProbe | null };
  runtime: PopupRuntime;
}): null => {
  props.output.current = useTemplatesState({
    notify: props.notify,
    runtime: props.runtime,
  });
  return null;
};

const template = (title: string, content = `${title} body`): TextTemplate => ({
  content,
  hidden: false,
  id: generateTemplateId(title),
  title,
});

function createInitialTemplates(): TextTemplate[] {
  return [template("first"), template("second")];
}

async function mountHook(params: {
  dom: JSDOM;
  notify: NotifierStub;
  storageStub: PopupSyncStorageStub;
  storageSyncSet?: PopupSyncStorageStub["set"];
}): Promise<{ output: { current: TemplatesProbe | null }; root: Root }> {
  const container = params.dom.window.document.createElement("div");
  params.dom.window.document.body.append(container);
  const root = createRoot(container);

  const runtime = createPopupRuntimeStub({
    storageSyncGet: params.storageStub.get,
    storageSyncSet: params.storageSyncSet ?? params.storageStub.set,
  });

  const output: { current: TemplatesProbe | null } = { current: null };
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

describe("popup templates state inventory (characterization)", () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.resetModules();
    dom = createPopupDom("chrome-extension://test/popup.html#pane-actions");
  });

  afterEach(() => {
    dom.window.close();
  });

  it("persists a hidden toggle without touching other templates", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    const initial = createInitialTemplates();
    await act(async () => {
      await output.current?.toggleTemplateHidden(initial[0].id, true);
      await flush(dom.window);
    });

    expect(notify.error).not.toHaveBeenCalled();
    expect(storageStub.store.textTemplates).toEqual([
      { ...initial[0], hidden: true },
      initial[1],
    ]);
    expect(output.current?.templates).toEqual([
      { ...initial[0], hidden: true },
      initial[1],
    ]);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("appends a new template from the editor inputs and clears editing state", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.startNew();
      output.current?.setTitleInput("new title");
      output.current?.setContentInput("new content");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveEdit();
      await flush(dom.window);
    });

    const expectedNext: TextTemplate[] = [
      ...createInitialTemplates(),
      {
        content: "new content",
        hidden: false,
        id: generateTemplateId("new title"),
        title: "new title",
      },
    ];
    expect(storageStub.store.textTemplates).toEqual(expectedNext);
    expect(output.current?.templates).toEqual(expectedNext);
    expect(output.current?.editingId).toBeNull();
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("renames an existing template in place", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    const initial = createInitialTemplates();
    await act(async () => {
      output.current?.startEdit(initial[0]);
      output.current?.setTitleInput("renamed");
      output.current?.setContentInput("renamed body");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveEdit();
      await flush(dom.window);
    });

    const expectedNext = [
      { ...initial[0], content: "renamed body", title: "renamed" },
      initial[1],
    ];
    expect(storageStub.store.textTemplates).toEqual(expectedNext);
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("removes only the targeted template", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    const initial = createInitialTemplates();
    await act(async () => {
      await output.current?.removeTemplate(initial[0].id);
      await flush(dom.window);
    });

    expect(storageStub.store.textTemplates).toEqual([initial[1]]);
    expect(output.current?.templates).toEqual([initial[1]]);
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("persists the exact order given by a reorder", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    const initial = createInitialTemplates();
    const reordered = [initial[1], initial[0]];
    await act(async () => {
      await output.current?.handleReorder(reordered);
      await flush(dom.window);
    });

    expect(storageStub.store.textTemplates).toEqual(reordered);
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("resets storage to the default templates", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      await output.current?.resetToDefaults();
      await flush(dom.window);
    });

    expect(storageStub.store.textTemplates).toEqual(DEFAULT_TEXT_TEMPLATES);
    expect(notify.success).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("rejects adding a template whose title duplicates an existing one", async () => {
    const initial = createInitialTemplates();
    const storageStub = createSyncStorageStub({
      textTemplates: initial,
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.startNew();
      output.current?.setTitleInput("second");
      output.current?.setContentInput("dup content");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveEdit();
      await flush(dom.window);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
    expect(storageStub.store.textTemplates).toEqual(initial);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("rejects a whitespace-only title without saving", async () => {
    const initial = createInitialTemplates();
    const storageStub = createSyncStorageStub({
      textTemplates: initial,
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({ dom, notify, storageStub });

    await act(async () => {
      output.current?.startNew();
      output.current?.setTitleInput("   ");
      output.current?.setContentInput("content");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveEdit();
      await flush(dom.window);
    });

    expect(notify.error).toHaveBeenCalled();
    expect(storageStub.store.textTemplates).toEqual(initial);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });

  it("rolls back the view and notifies failure when the save fails", async () => {
    const initial = createInitialTemplates();
    const storageStub = createSyncStorageStub({
      textTemplates: initial,
    });
    const notify = createNotifierStub();
    const { output, root } = await mountHook({
      dom,
      notify,
      storageStub,
      storageSyncSet: async () => Result.fail("save failed"),
    });

    await act(async () => {
      output.current?.startNew();
      output.current?.setTitleInput("added");
      output.current?.setContentInput("added body");
      await flush(dom.window);
    });
    await act(async () => {
      await output.current?.saveEdit();
      await flush(dom.window);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
    expect(storageStub.store.textTemplates).toEqual(initial);
    expect(output.current?.templates).toEqual(initial);

    await act(async () => {
      await root.unmount();
      await flush(dom.window);
    });
  });
});
