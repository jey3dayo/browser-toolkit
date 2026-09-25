import { Result } from "@praha/byethrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloatingWidget } from "@/content/search-blocklist-ui/FloatingWidget";
import {
  createBlocklistState,
  type StoredSearchBlocklistData,
} from "@/search-blocklist/state";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function flushEffects(times = 3): Promise<void> {
  await Array.from({ length: times }).reduce<Promise<void>>(
    (previous) =>
      previous.then(
        () => new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      ),
    Promise.resolve()
  );
}

function mockChromeStorage(): void {
  vi.stubGlobal("chrome", {
    runtime: {
      lastError: undefined,
      sendMessage: vi.fn(() =>
        Promise.resolve({
          type: "Success",
          value: { revision: 2, rules: [] },
        })
      ),
    },
    storage: {
      local: {
        get: vi.fn(
          (
            _keys: string[],
            callback: (items: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        ),
        set: vi.fn((_items: unknown, callback?: () => void) => {
          callback?.();
        }),
      },
    },
  });
}

let cleanupTargets: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanupTargets) {
    cleanup();
  }
  cleanupTargets = [];
  vi.unstubAllGlobals();
});

function mountWidget(): {
  host: HTMLDivElement;
  root: Root;
  shadow: ShadowRoot;
} {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const rootEl = document.createElement("div");
  shadow.appendChild(rootEl);
  const root = createRoot(rootEl);
  cleanupTargets.push(() => {
    root.unmount();
    host.remove();
  });
  return { host, root, shadow };
}

describe("FloatingWidget unblock dialog", () => {
  it("shows the normalized pattern, not the internal rule id, for a blocked result", async () => {
    mockChromeStorage();

    const resultContainer = document.createElement("div");
    resultContainer.getBoundingClientRect = () =>
      ({
        bottom: 40,
        height: 20,
        left: 0,
        right: 300,
        top: 20,
        width: 300,
      }) as DOMRect;
    document.body.appendChild(resultContainer);

    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          {
            createdAt: 0,
            id: "sbl:example-com-14124df5",
            pattern: "example.com",
          },
        ],
      })
    );

    const state = createBlocklistState("google", loaded, () => [
      {
        container: resultContainer,
        title: "Example",
        url: "https://example.com/page",
      },
    ]);
    await state.ready;

    const { host, shadow, root } = mountWidget();

    await act(async () => {
      root.render(<FloatingWidget host={host} state={state} />);
      await flushEffects();
    });

    act(() => {
      resultContainer.dispatchEvent(
        new PointerEvent("pointerover", { bubbles: true })
      );
    });

    const trigger = shadow.querySelector("button");
    act(() => {
      trigger?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    const rulesToRemoveTextarea = Array.from(
      shadow.querySelectorAll<HTMLTextAreaElement>("textarea")
    ).find((el) => el.readOnly);

    expect(rulesToRemoveTextarea?.value).toBe("*://*.example.com/*");
    expect(rulesToRemoveTextarea?.value).not.toContain("sbl:example-com");
  });
});

describe("createBlocklistState snapshot identity", () => {
  it("keeps returning the same snapshot reference across repeated unchanged scans", async () => {
    mockChromeStorage();

    const resultContainer = document.createElement("div");
    document.body.appendChild(resultContainer);
    const result = {
      container: resultContainer,
      title: "Example",
      url: "https://example.com/page",
    };

    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "example.com" },
        ],
      })
    );
    const state = createBlocklistState("google", loaded, () => [result]);
    await state.ready;

    const first = state.getSnapshot();
    state.applyResults([result]);
    const second = state.getSnapshot();

    expect(second).toBe(first);
  });
});
