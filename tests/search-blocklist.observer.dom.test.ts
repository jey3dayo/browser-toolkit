import { Result } from "@praha/byethrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SearchEngineAdapter } from "@/search-blocklist/engines/types";
import { startSearchBlocklistRuntime } from "@/search-blocklist/runtime";
import type { StoredSearchBlocklistData } from "@/search-blocklist/state";
import {
  BLOCKLIST_BLOCKED_ATTR,
  type SearchResultEntry,
} from "@/search-blocklist/types";

const adapter: SearchEngineAdapter = {
  findResults: (root: ParentNode): SearchResultEntry[] => {
    const anchor = root.querySelector<HTMLAnchorElement>("a[href]");
    const container = anchor?.closest<HTMLElement>("[data-hveid]");
    if (!(anchor && container)) {
      return [];
    }
    return [
      {
        container,
        title: "Example result",
        url: anchor.href,
      },
    ];
  },
  id: "google",
  matches: () => true,
};

vi.mock("@/search-blocklist/engines/registry", () => ({
  findAdapterForLocation: (): SearchEngineAdapter => adapter,
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("startSearchBlocklistRuntime observer", () => {
  it("rescans when an existing result href changes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("chrome", {
      storage: {
        onChanged: {
          addListener: vi.fn(),
        },
      },
    });

    const container = document.createElement("div");
    container.setAttribute("data-hveid", "result-1");
    const anchor = document.createElement("a");
    anchor.href = "https://example.com/blocked";
    container.append(anchor);
    document.body.append(container);

    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
        ],
      })
    );
    const controller = startSearchBlocklistRuntime(loaded);
    await controller.ready;

    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");

    anchor.href = "https://other.example.org/visible";
    await vi.advanceTimersByTimeAsync(199);
    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");

    await vi.advanceTimersByTimeAsync(1);
    expect(container.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);
  });
});
