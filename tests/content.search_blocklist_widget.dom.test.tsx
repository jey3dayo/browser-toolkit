import { Result } from "@praha/byethrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountBar } from "@/content/search-blocklist-ui/CountBar";
import { FloatingWidget } from "@/content/search-blocklist-ui/FloatingWidget";
import type {
  BlocklistSnapshot,
  BlocklistState,
} from "@/search-blocklist/types";

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

type FakeBlocklistState = BlocklistState & {
  setSnapshot: (next: BlocklistSnapshot) => void;
};

function createFakeState(initial: BlocklistSnapshot): FakeBlocklistState {
  let snapshot = initial;
  const listeners = new Set<() => void>();

  return {
    addRule: vi.fn(async () => Result.succeed(undefined)),
    getSnapshot: () => snapshot,
    ready: Promise.resolve(),
    removeRules: vi.fn(async () => Result.succeed(undefined)),
    setRevealed: vi.fn(),
    setSnapshot: (next) => {
      snapshot = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let cleanupTargets: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanupTargets) {
    cleanup();
  }
  cleanupTargets = [];
});

describe("CountBar", () => {
  it("renders nothing when nothing is blocked", async () => {
    const state = createFakeState({
      blockedCount: 0,
      engineId: "google",
      entries: [],
      ruleRevision: 1,
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    cleanupTargets.push(() => {
      root.unmount();
      container.remove();
    });

    await act(async () => {
      root.render(<CountBar state={state} />);
      await flushEffects();
    });

    expect(container.textContent).toBe("");
  });

  it("shows the blocked count and toggles reveal on click", async () => {
    const state = createFakeState({
      blockedCount: 2,
      engineId: "google",
      entries: [],
      ruleRevision: 1,
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    cleanupTargets.push(() => {
      root.unmount();
      container.remove();
    });

    await act(async () => {
      root.render(<CountBar state={state} />);
      await flushEffects();
    });

    expect(container.textContent).toContain("2");

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await flushEffects();
    });

    expect(state.setRevealed).toHaveBeenCalledWith(true);
  });
});

describe("FloatingWidget", () => {
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

  it("shows a single trigger positioned at the hovered result and hides on leave", async () => {
    const resultContainer = document.createElement("div");
    resultContainer.innerHTML = "<h3>Example</h3>";
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

    const unrelated = document.createElement("div");
    document.body.appendChild(unrelated);

    const state = createFakeState({
      blockedCount: 0,
      engineId: "google",
      entries: [
        {
          blocked: false,
          container: resultContainer,
          matchedRuleIds: [],
          title: "Example",
          url: "https://example.com/page",
        },
      ],
      ruleRevision: 1,
    });

    const { host, shadow, root } = mountWidget();

    await act(async () => {
      root.render(<FloatingWidget host={host} state={state} />);
      await flushEffects();
    });

    expect(shadow.querySelector("button")).toBeNull();

    act(() => {
      resultContainer.dispatchEvent(
        new PointerEvent("pointerover", { bubbles: true })
      );
    });

    const trigger = shadow.querySelector("button");
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-label")).toBe("この検索結果をブロック");

    act(() => {
      unrelated.dispatchEvent(
        new PointerEvent("pointerover", { bubbles: true })
      );
    });

    expect(shadow.querySelector("button")).toBeNull();
  });

  it("submits the edited rule pattern via state.addRule when Block is clicked", async () => {
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

    const state = createFakeState({
      blockedCount: 0,
      engineId: "google",
      entries: [
        {
          blocked: false,
          container: resultContainer,
          matchedRuleIds: [],
          title: "Example",
          url: "https://example.com/page",
        },
      ],
      ruleRevision: 1,
    });

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

    const textarea = shadow.querySelector("textarea");
    expect(textarea?.value).toBe("example.com");

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(textarea, "custom-pattern.example");
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
      await flushEffects();
    });

    const buttons = Array.from(shadow.querySelectorAll("button"));
    const blockButton = buttons.find((btn) => btn.textContent === "ブロック");
    expect(blockButton).toBeDefined();

    await act(async () => {
      blockButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await flushEffects();
    });

    expect(state.addRule).toHaveBeenCalledWith("custom-pattern.example");
  });
});
