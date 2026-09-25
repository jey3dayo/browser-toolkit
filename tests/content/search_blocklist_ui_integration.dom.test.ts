import { Result } from "@praha/byethrow";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEARCH_BLOCKLIST_COUNT_BAR_HOST_ID,
  SEARCH_BLOCKLIST_WIDGET_HOST_ID,
} from "@/content/search-blocklist-ui/constants";
import {
  createBlocklistState,
  type StoredSearchBlocklistData,
} from "@/search-blocklist/state";
import type { SearchResultEntry } from "@/search-blocklist/types";
import { createChromeStub } from "../helpers/chromeStub";

async function flush(times = 5): Promise<void> {
  await Array.from({ length: times }).reduce<Promise<void>>(
    (previous) =>
      previous.then(
        () => new Promise<void>((resolve) => setTimeout(resolve, 0))
      ),
    Promise.resolve()
  );
}

function resolvedRules(pattern: string) {
  return Promise.resolve(
    Result.succeed<StoredSearchBlocklistData>({
      searchBlocklistRules: [{ createdAt: 0, id: "r1", pattern }],
    })
  );
}

describe("startSearchBlocklistUi", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    vi.stubGlobal("chrome", {
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
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mounts the count bar next to the first connected result and re-anchors it once that result is disconnected from the DOM", async () => {
    const { startSearchBlocklistUi } = await import(
      "@/content/search-blocklist-ui"
    );

    const parentA = document.createElement("div");
    const parentB = document.createElement("div");
    document.body.append(parentA, parentB);
    const first = document.createElement("div");
    parentA.appendChild(first);
    const second = document.createElement("div");
    const third = document.createElement("div");
    parentB.append(second, third);

    const results: SearchResultEntry[] = [
      {
        container: first,
        title: "First",
        url: "https://blocked.example.com/1",
      },
      {
        container: second,
        title: "Second",
        url: "https://blocked.example.com/2",
      },
      {
        container: third,
        title: "Third",
        url: "https://blocked.example.com/3",
      },
    ];

    const state = createBlocklistState(
      "google",
      resolvedRules("*://*.blocked.example.com/*"),
      () => results
    );

    await startSearchBlocklistUi(state);
    await flush();

    expect(state.getSnapshot().blockedCount).toBe(3);

    const widgetHost = document.getElementById(SEARCH_BLOCKLIST_WIDGET_HOST_ID);
    const countBarHost = document.getElementById(
      SEARCH_BLOCKLIST_COUNT_BAR_HOST_ID
    );
    expect(widgetHost).not.toBeNull();
    expect(countBarHost).not.toBeNull();
    expect(countBarHost?.parentElement).toBe(parentA);
    expect(countBarHost?.nextSibling).toBe(first);

    first.remove();
    state.setRevealed(true);
    await flush();

    expect(countBarHost?.parentElement).toBe(parentB);
    expect(countBarHost?.nextSibling).toBe(second);
  });
});

describe("content.ts search blocklist bootstrap", () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.resetModules();
    (
      globalThis as unknown as { __MBU_CONTENT_STATE__?: unknown }
    ).__MBU_CONTENT_STATE__ = undefined;
    (
      globalThis as unknown as { __MBU_BLOCKLIST_STATE__?: unknown }
    ).__MBU_BLOCKLIST_STATE__ = undefined;

    dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "https://example.com/",
    });

    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", createChromeStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not mount the search blocklist UI when __MBU_BLOCKLIST_STATE__ is absent", async () => {
    await import("@/content.ts");
    await flush();

    expect(
      dom.window.document.getElementById(SEARCH_BLOCKLIST_WIDGET_HOST_ID)
    ).toBeNull();
    expect(
      dom.window.document.getElementById(SEARCH_BLOCKLIST_COUNT_BAR_HOST_ID)
    ).toBeNull();
  });
});
