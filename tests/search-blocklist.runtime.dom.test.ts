import { Result } from "@praha/byethrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchBlocklistMutateResponse } from "@/background/runtime_types";
import {
  createBlocklistState,
  type StoredSearchBlocklistData,
} from "@/search-blocklist/state";
import {
  BLOCKLIST_BLOCKED_ATTR,
  BLOCKLIST_REVEALED_ATTR,
  BLOCKLIST_SCAN_ATTR,
  type SearchBlocklistRule,
} from "@/search-blocklist/types";
import { type StorageError, storageLocalGet } from "@/storage/helpers";

function createContainer(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function mockChromeStorage(
  initialRules: SearchBlocklistRule[] = [],
  mutationResponse: SearchBlocklistMutateResponse = {
    type: "Success",
    value: { revision: 1, rules: initialRules },
  }
): {
  failNextRead: () => void;
  store: Map<string, unknown>;
} {
  const store = new Map<string, unknown>();
  store.set("searchBlocklistRules", initialRules);
  let shouldFailNextRead = false;

  vi.stubGlobal("chrome", {
    runtime: {
      lastError: undefined,
      sendMessage: vi.fn(async () => mutationResponse),
    },
    storage: {
      local: {
        get: vi.fn(
          (
            keys: string[],
            callback: (items: Record<string, unknown>) => void
          ) => {
            if (shouldFailNextRead) {
              shouldFailNextRead = false;
              global.chrome.runtime.lastError = { message: "temporary" };
              callback({});
              global.chrome.runtime.lastError = undefined;
              return;
            }
            const items: Record<string, unknown> = {};
            for (const key of keys) {
              if (store.has(key)) {
                items[key] = store.get(key);
              }
            }
            callback(items);
          }
        ),
        set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
          for (const [key, value] of Object.entries(items)) {
            store.set(key, value);
          }
          callback?.();
        }),
      },
    },
  });

  return {
    failNextRead: () => {
      shouldFailNextRead = true;
    },
    store,
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("createBlocklistState fail-open behavior", () => {
  it("resolves ready without rejecting when the storage read fails", async () => {
    mockChromeStorage();
    const failedRead: Promise<
      Result.Result<StoredSearchBlocklistData, StorageError>
    > = Promise.resolve(
      Result.fail({ message: "boom", type: "runtime-error" })
    );

    const state = createBlocklistState("google", failedRead, () => []);

    await expect(state.ready).resolves.toBeUndefined();
    expect(state.getSnapshot().blockedCount).toBe(0);
  });

  it("does not hide any result before the rule read resolves", () => {
    mockChromeStorage();
    const pendingRead: Promise<
      Result.Result<StoredSearchBlocklistData, StorageError>
    > = new Promise(() => {
      // intentionally never resolves within this test
    });

    const container = createContainer();
    const state = createBlocklistState("google", pendingRead, () => []);

    state.applyResults([
      { container, title: "Example", url: "https://example.com/" },
    ]);

    expect(container.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);
  });
});

describe("createBlocklistState rule loading", () => {
  it("normalizes a raw pattern saved by the popup before matching", async () => {
    mockChromeStorage([{ createdAt: 0, id: "r1", pattern: "example.com" }]);
    const loaded = storageLocalGet<StoredSearchBlocklistData>([
      "searchBlocklistRules",
    ]);
    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => []);

    await state.ready;
    state.applyResults([
      { container, title: "Example", url: "https://example.com/page" },
    ]);

    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");
    expect(state.getSnapshot().blockedCount).toBe(1);
  });

  it("does not load stored rules after the rule limit is exceeded", async () => {
    const tooManyRules = Array.from(
      { length: 2001 },
      (_, index): SearchBlocklistRule => ({
        createdAt: index,
        id: `r${index}`,
        pattern: "example.com",
      })
    );
    mockChromeStorage(tooManyRules);
    const loaded = storageLocalGet<StoredSearchBlocklistData>([
      "searchBlocklistRules",
    ]);
    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => []);

    await state.ready;
    state.applyResults([
      { container, title: "Example", url: "https://example.com/page" },
    ]);

    expect(container.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);
  });

  it("does not load stored rules with an invalid shape", async () => {
    const storage = mockChromeStorage();
    storage.store.set("searchBlocklistRules", [
      { createdAt: "invalid", id: "r1", pattern: "example.com" },
    ]);
    const loaded = storageLocalGet<StoredSearchBlocklistData>([
      "searchBlocklistRules",
    ]);
    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => []);

    await state.ready;
    state.applyResults([
      { container, title: "Example", url: "https://example.com/page" },
    ]);

    expect(container.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);
  });
});

describe("createBlocklistState snapshots", () => {
  it("returns the same snapshot reference while the state is unchanged", async () => {
    mockChromeStorage();
    const state = createBlocklistState(
      "google",
      Promise.resolve(
        Result.succeed<StoredSearchBlocklistData>({
          searchBlocklistRules: [],
        })
      ),
      () => []
    );

    await state.ready;
    const firstSnapshot = state.getSnapshot();
    const secondSnapshot = state.getSnapshot();

    expect(secondSnapshot).toBe(firstSnapshot);
  });
});

describe("createBlocklistState rescan protocol", () => {
  it("re-judges a container when its result url is replaced", async () => {
    mockChromeStorage([
      { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
    ]);
    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
        ],
      })
    );

    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => []);
    await state.ready;

    state.applyResults([
      { container, title: "Example", url: "https://example.com/" },
    ]);
    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");

    state.applyResults([
      { container, title: "Other", url: "https://other.example.org/" },
    ]);
    expect(container.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);
  });

  it("removes the blocked attribute once the matching rule is deleted", async () => {
    mockChromeStorage(
      [{ createdAt: 0, id: "r1", pattern: "*://*.example.com/*" }],
      {
        type: "Success",
        value: { revision: 2, rules: [] },
      }
    );
    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
        ],
      })
    );

    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => [
      { container, title: "Example", url: "https://example.com/" },
    ]);
    await state.ready;

    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");

    const removed = await state.removeRules(["r1"]);
    expect(Result.isSuccess(removed)).toBe(true);
    expect(container.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);
  });

  it("scans the same unchanged container idempotently", async () => {
    mockChromeStorage([
      { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
    ]);
    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
        ],
      })
    );

    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => []);
    await state.ready;

    const result = {
      container,
      title: "Example",
      url: "https://example.com/",
    };
    state.applyResults([result]);
    const scanKeyAfterFirstPass = container.getAttribute(BLOCKLIST_SCAN_ATTR);
    const setAttributeSpy = vi.spyOn(container, "setAttribute");

    state.applyResults([result]);

    expect(container.getAttribute(BLOCKLIST_SCAN_ATTR)).toBe(
      scanKeyAfterFirstPass
    );
    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");
    expect(setAttributeSpy).not.toHaveBeenCalled();
  });

  it("adds the revealed attribute only when setRevealed(true) is active", async () => {
    mockChromeStorage([
      { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
    ]);
    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "*://*.example.com/*" },
        ],
      })
    );

    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => [
      { container, title: "Example", url: "https://example.com/" },
    ]);
    await state.ready;

    expect(container.hasAttribute(BLOCKLIST_REVEALED_ATTR)).toBe(false);

    state.setRevealed(true);
    expect(container.getAttribute(BLOCKLIST_REVEALED_ATTR)).toBe("1");

    state.setRevealed(false);
    expect(container.hasAttribute(BLOCKLIST_REVEALED_ATTR)).toBe(false);
  });

  it("reconciles removed and disconnected results from the latest scan", async () => {
    mockChromeStorage([{ createdAt: 0, id: "r1", pattern: "example.com" }]);
    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "example.com" },
        ],
      })
    );
    const firstContainer = createContainer();
    const secondContainer = createContainer();
    const state = createBlocklistState("google", loaded, () => []);
    await state.ready;

    state.applyResults([
      {
        container: firstContainer,
        title: "First",
        url: "https://example.com/first",
      },
      {
        container: secondContainer,
        title: "Second",
        url: "https://example.com/second",
      },
    ]);
    expect(state.getSnapshot().blockedCount).toBe(2);

    state.applyResults([
      {
        container: secondContainer,
        title: "Second",
        url: "https://example.com/second",
      },
    ]);
    expect(state.getSnapshot().entries).toHaveLength(1);
    expect(state.getSnapshot().blockedCount).toBe(1);
    expect(firstContainer.hasAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe(false);

    secondContainer.remove();
    state.applyResults([]);
    expect(state.getSnapshot().entries).toHaveLength(0);
    expect(state.getSnapshot().blockedCount).toBe(0);
  });

  it("keeps the loaded rules when a reload read fails", async () => {
    const storage = mockChromeStorage([
      { createdAt: 0, id: "r1", pattern: "example.com" },
    ]);
    const loaded = Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({
        searchBlocklistRules: [
          { createdAt: 0, id: "r1", pattern: "example.com" },
        ],
      })
    );
    const container = createContainer();
    const state = createBlocklistState("google", loaded, () => [
      { container, title: "Example", url: "https://example.com/page" },
    ]);
    await state.ready;

    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");
    storage.failNextRead();
    await state.reloadRulesFromStorage();

    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");
    expect(state.getSnapshot().blockedCount).toBe(1);
  });
});
