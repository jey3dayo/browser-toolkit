import { Result } from "@praha/byethrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SearchBlocklistMutateRequest,
  SearchBlocklistMutateResponse,
} from "@/background/runtime_types";
import { CountBar } from "@/content/search-blocklist-ui/CountBar";
import { FloatingWidget } from "@/content/search-blocklist-ui/FloatingWidget";
import {
  createBlocklistState,
  type StoredSearchBlocklistData,
} from "@/search-blocklist/state";
import {
  BLOCKLIST_BLOCKED_ATTR,
  BLOCKLIST_REVEALED_ATTR,
  type SearchBlocklistRule,
  type SearchResultEntry,
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

function resolvedRules(rules: SearchBlocklistRule[]) {
  return Promise.resolve(
    Result.succeed<StoredSearchBlocklistData>({ searchBlocklistRules: rules })
  );
}

function stubSendMessage(
  respond: (
    request: SearchBlocklistMutateRequest
  ) => SearchBlocklistMutateResponse
): ReturnType<typeof vi.fn> {
  const sendMessage = vi.fn(async (request: SearchBlocklistMutateRequest) =>
    respond(request)
  );
  vi.stubGlobal("chrome", {
    runtime: { sendMessage },
  });
  return sendMessage;
}

let cleanupTargets: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanupTargets) {
    cleanup();
  }
  cleanupTargets = [];
  vi.unstubAllGlobals();
});

describe("createBlocklistState add mutation failures", () => {
  it("returns addFailed when an add mutation response omits a usable error", async () => {
    stubSendMessage(() => ({ type: "Failure" }));
    const state = createBlocklistState("google", resolvedRules([]), () => []);
    await state.ready;

    const result = await state.addRule("new.example.com");

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("追加に失敗しました");
    }
  });
});

describe("CountBar", () => {
  it("renders nothing when nothing is blocked", async () => {
    const state = createBlocklistState("google", resolvedRules([]), () => []);
    await state.ready;

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
    const containerA = document.createElement("div");
    const containerB = document.createElement("div");
    document.body.append(containerA, containerB);
    const results: SearchResultEntry[] = [
      { container: containerA, title: "A", url: "https://example.com/a" },
      { container: containerB, title: "B", url: "https://example.com/b" },
    ];

    const state = createBlocklistState(
      "google",
      resolvedRules([{ createdAt: 0, id: "r1", pattern: "example.com" }]),
      () => results
    );
    await state.ready;
    expect(state.getSnapshot().blockedCount).toBe(2);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    cleanupTargets.push(() => {
      root.unmount();
      container.remove();
      containerA.remove();
      containerB.remove();
    });

    await act(async () => {
      root.render(<CountBar state={state} />);
      await flushEffects();
    });

    expect(container.textContent).toContain("2");

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    expect(containerA.hasAttribute(BLOCKLIST_REVEALED_ATTR)).toBe(false);

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await flushEffects();
    });

    expect(containerA.getAttribute(BLOCKLIST_REVEALED_ATTR)).toBe("1");
    expect(containerB.getAttribute(BLOCKLIST_REVEALED_ATTR)).toBe("1");
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

    const state = createBlocklistState("google", resolvedRules([]), () => [
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

    const state = createBlocklistState("google", resolvedRules([]), () => [
      {
        container: resultContainer,
        title: "Example",
        url: "https://example.com/page",
      },
    ]);
    await state.ready;
    expect(state.getSnapshot().blockedCount).toBe(0);

    const sendMessage = stubSendMessage((request) => {
      expect(request.op).toBe("add");
      return Result.succeed({
        revision: 1,
        rules: [
          {
            createdAt: 0,
            id: "new-rule",
            pattern: "example.com",
          },
        ],
        skippedCount: 0,
      });
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

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "*://*.custom-pattern.example/*",
      })
    );
    expect(resultContainer.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");
  });

  it("renders no inert Base UI backdrop layer when the dialog opens", async () => {
    const resultContainer = document.createElement("div");
    resultContainer.getBoundingClientRect = () => new DOMRect(0, 20, 300, 20);
    document.body.appendChild(resultContainer);

    const state = createBlocklistState("google", resolvedRules([]), () => [
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
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await flushEffects();
    });

    expect(
      shadow.querySelector('[aria-label="このサイトをブロック"]')
    ).not.toBeNull();
    expect(shadow.querySelector("[data-base-ui-inert]")).toBeNull();
  });
});
