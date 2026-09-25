import { Result } from "@praha/byethrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchBlocklistMutateResponse } from "@/background/runtime_types";
import {
  createBlocklistState,
  type StoredSearchBlocklistData,
} from "@/search-blocklist/state";
import {
  BLOCKLIST_BLOCKED_ATTR,
  BLOCKLIST_SCAN_ATTR,
  type SearchBlocklistRule,
} from "@/search-blocklist/types";

const ADDED_RULE: SearchBlocklistRule = {
  createdAt: 0,
  id: "added",
  pattern: "*://*.blocked.example.com/*",
};

function stubMutationResponse(revision: number): void {
  const response: SearchBlocklistMutateResponse = {
    type: "Success",
    value: { revision, rules: [ADDED_RULE], skippedCount: 0 },
  };
  vi.stubGlobal("chrome", {
    runtime: {
      lastError: undefined,
      sendMessage: vi.fn(() => Promise.resolve(response)),
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

async function addRuleAndReturnScanKeys(
  backgroundRevision: number
): Promise<{ after: string | null; before: string | null }> {
  stubMutationResponse(backgroundRevision);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const result = {
    container,
    title: "Blocked",
    url: "https://blocked.example.com/page",
  };

  const state = createBlocklistState(
    "google",
    Promise.resolve(
      Result.succeed<StoredSearchBlocklistData>({ searchBlocklistRules: [] })
    ),
    () => [result]
  );
  await state.ready;

  const before = container.getAttribute(BLOCKLIST_SCAN_ATTR);
  const added = await state.addRule("blocked.example.com");
  expect(Result.isSuccess(added)).toBe(true);

  return { after: container.getAttribute(BLOCKLIST_SCAN_ATTR), before };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("createBlocklistState scan generation", () => {
  it("applies a rule added while the background revision equals the local one", async () => {
    const scanKeys = await addRuleAndReturnScanKeys(1);

    expect(scanKeys.before).not.toBeNull();
    expect(scanKeys.after).not.toBe(scanKeys.before);
    expect(
      document.body.firstElementChild?.getAttribute(BLOCKLIST_BLOCKED_ATTR)
    ).toBe("1");
  });

  it("keeps the local scan generation monotonic when the background revision moves backwards", async () => {
    stubMutationResponse(0);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const state = createBlocklistState(
      "google",
      Promise.resolve(
        Result.succeed<StoredSearchBlocklistData>({ searchBlocklistRules: [] })
      ),
      () => [
        {
          container,
          title: "Blocked",
          url: "https://blocked.example.com/page",
        },
      ]
    );
    await state.ready;

    const revisionBefore = state.getSnapshot().ruleRevision;
    await state.addRule("blocked.example.com");

    expect(state.getSnapshot().ruleRevision).toBeGreaterThan(revisionBefore);
    expect(container.getAttribute(BLOCKLIST_BLOCKED_ATTR)).toBe("1");
  });
});
