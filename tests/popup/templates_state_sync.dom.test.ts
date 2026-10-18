import type { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTemplatesState } from "@/popup/panes/templates/useTemplatesState";
import type { PopupRuntime } from "@/popup/runtime";
import { generateTemplateId, type TextTemplate } from "@/text_templates";
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

const Probe = (props: {
  output: { current: TemplatesProbe | null };
  notify: ReturnType<typeof createNotifierStub>;
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
  storageStub: PopupSyncStorageStub;
}): Promise<{ output: { current: TemplatesProbe | null }; root: Root }> {
  const container = params.dom.window.document.createElement("div");
  params.dom.window.document.body.append(container);
  const root = createRoot(container);

  const runtime = createPopupRuntimeStub({
    storageSyncGet: params.storageStub.get,
    storageSyncSet: params.storageStub.set,
  });

  const output: { current: TemplatesProbe | null } = { current: null };
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

describe("popup templates state across two instances (onChanged rehydration)", () => {
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
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    vi.stubGlobal("chrome", { storage: { onChanged: storageStub.onChanged } });

    const first = await mountHook({ dom, storageStub });
    const second = await mountHook({ dom, storageStub });

    const initial = createInitialTemplates();
    await act(async () => {
      await first.output.current?.toggleTemplateHidden(initial[0].id, true);
      await flush(dom.window);
    });

    expect(second.output.current?.templates).toEqual([
      { ...initial[0], hidden: true },
      initial[1],
    ]);

    await act(async () => {
      second.output.current?.startNew();
      second.output.current?.setTitleInput("added");
      second.output.current?.setContentInput("added body");
      await flush(dom.window);
    });
    await act(async () => {
      await second.output.current?.saveEdit();
      await flush(dom.window);
    });

    const expected: TextTemplate[] = [
      { ...initial[0], hidden: true },
      initial[1],
      {
        content: "added body",
        hidden: false,
        id: generateTemplateId("added"),
        title: "added",
      },
    ];
    expect(storageStub.store.textTemplates).toEqual(expected);
    expect(first.output.current?.templates).toEqual(expected);
    expect(second.output.current?.templates).toEqual(expected);

    await unmountHook({ dom, root: first.root });
    await unmountHook({ dom, root: second.root });
  });

  it("rebases a save onto the latest storage after events skipped during editing", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    vi.stubGlobal("chrome", { storage: { onChanged: storageStub.onChanged } });

    const first = await mountHook({ dom, storageStub });
    const second = await mountHook({ dom, storageStub });

    await act(async () => {
      second.output.current?.startNew();
      second.output.current?.setTitleInput("added");
      second.output.current?.setContentInput("added body");
      await flush(dom.window);
    });

    const initial = createInitialTemplates();
    await act(async () => {
      await first.output.current?.toggleTemplateHidden(initial[0].id, true);
      await flush(dom.window);
    });

    await act(async () => {
      await second.output.current?.saveEdit();
      await flush(dom.window);
    });

    expect(storageStub.store.textTemplates).toEqual([
      { ...initial[0], hidden: true },
      initial[1],
      {
        content: "added body",
        hidden: false,
        id: generateTemplateId("added"),
        title: "added",
      },
    ]);

    await unmountHook({ dom, root: first.root });
    await unmountHook({ dom, root: second.root });
  });

  it("does not replace the list while a template is being edited", async () => {
    const storageStub = createSyncStorageStub({
      textTemplates: createInitialTemplates(),
    });
    vi.stubGlobal("chrome", { storage: { onChanged: storageStub.onChanged } });

    const { output, root } = await mountHook({ dom, storageStub });

    await act(async () => {
      output.current?.startNew();
      output.current?.setTitleInput("in progress");
      await flush(dom.window);
    });

    const foreignTemplates = [template("foreign")];
    await act(async () => {
      await storageStub.set({ textTemplates: foreignTemplates });
      await flush(dom.window);
    });

    expect(output.current?.editingId).toBe("new");
    expect(output.current?.templates).toEqual(createInitialTemplates());

    await act(async () => {
      output.current?.cancelEdit();
      await storageStub.set({ textTemplates: [template("later")] });
      await flush(dom.window);
    });

    expect(output.current?.templates).toEqual([template("later")]);

    await unmountHook({ dom, root });
  });
});
