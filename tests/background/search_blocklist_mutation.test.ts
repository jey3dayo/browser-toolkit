import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchBlocklistMutateRequest } from "@/background/runtime_types";
import type { SearchBlocklistRule } from "@/search-blocklist/types";
import { createChromeStub } from "../helpers/chromeStub";

type MutationHandler = (
  request: SearchBlocklistMutateRequest,
  sendResponse: (response?: unknown) => void
) => boolean;

function sendMutation(
  handler: MutationHandler,
  request: SearchBlocklistMutateRequest
): Promise<void> {
  return new Promise((resolve) => {
    handler(request, () => resolve());
  });
}

function sendMutationForResponse(
  handler: MutationHandler,
  request: SearchBlocklistMutateRequest
): Promise<unknown> {
  return new Promise((resolve) => {
    handler(request, (response) => resolve(response));
  });
}

function successPayload(response: unknown): Record<string, unknown> {
  if (!(isRecord(response) && response.type === "Success")) {
    throw new Error(
      `expected a success response but received ${JSON.stringify(response)}`
    );
  }
  if (!isRecord(response.value)) {
    throw new Error("success response carried no payload");
  }
  return response.value;
}

function failureError(response: unknown): string {
  if (!(isRecord(response) && response.type === "Failure")) {
    throw new Error(
      `expected a failure response but received ${JSON.stringify(response)}`
    );
  }
  return String(response.error);
}

const REGEXP_RULE: SearchBlocklistRule = {
  createdAt: 1,
  id: "regexp-rule",
  pattern: "/regexp/",
};

const OVERSIZED_RULE: SearchBlocklistRule = {
  createdAt: 2,
  id: "oversized-rule",
  pattern: `*://*.${"a".repeat(250)}.com/*`,
};

const VALID_RULE: SearchBlocklistRule = {
  createdAt: 3,
  id: "valid-rule",
  pattern: "*://*.keep.example.com/*",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type DelayedStorage = {
  chrome: ReturnType<typeof createChromeStub>;
  getRules: () => unknown[];
  failNextWrite: () => void;
};

function createDelayedStorage(initialRules: unknown[] = []): DelayedStorage {
  const chrome = createChromeStub();
  let rules: unknown[] = [...initialRules];
  let shouldFailNextWrite = false;

  chrome.storage.local.get.mockImplementation(
    (_keys: unknown, callback?: (items: Record<string, unknown>) => void) => {
      setTimeout(() => {
        chrome.runtime.lastError = null;
        callback?.({ searchBlocklistRules: [...rules] });
      }, 5);
    }
  );
  chrome.storage.local.set.mockImplementation(
    (items: unknown, callback?: () => void) => {
      setTimeout(() => {
        if (shouldFailNextWrite) {
          shouldFailNextWrite = false;
          chrome.runtime.lastError = { message: "write failed" };
          callback?.();
          chrome.runtime.lastError = null;
          return;
        }
        if (isRecord(items) && Array.isArray(items.searchBlocklistRules)) {
          rules = [...items.searchBlocklistRules];
        }
        chrome.runtime.lastError = null;
        callback?.();
      }, 5);
    }
  );

  return {
    chrome,
    failNextWrite: () => {
      shouldFailNextWrite = true;
    },
    getRules: () => rules,
  };
}

describe("background search blocklist mutation queue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves interleaved add and remove mutations", async () => {
    const storage = createDelayedStorage([
      { createdAt: 1, id: "existing", pattern: "existing.example.com" },
    ]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    await Promise.all([
      sendMutation(runtimeHandlers.searchBlocklistMutate, {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "added.example.com",
      }),
      sendMutation(runtimeHandlers.searchBlocklistMutate, {
        action: "searchBlocklistMutate",
        op: "remove",
        ruleIds: ["existing"],
      }),
    ]);

    expect(storage.getRules()).toEqual([
      expect.objectContaining({ pattern: "*://*.added.example.com/*" }),
    ]);
    expect(storage.chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  it("returns addFailed when persisting an add fails", async () => {
    const storage = createDelayedStorage();
    storage.failNextWrite();
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "failed.example.com",
      }
    );

    expect(failureError(response)).toBe("追加に失敗しました");
    expect(storage.getRules()).toEqual([]);
  });

  it("continues with the next mutation after a write failure", async () => {
    const storage = createDelayedStorage();
    storage.failNextWrite();
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    await Promise.all([
      sendMutation(runtimeHandlers.searchBlocklistMutate, {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "failed.example.com",
      }),
      sendMutation(runtimeHandlers.searchBlocklistMutate, {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "saved.example.com",
      }),
    ]);

    expect(storage.getRules()).toEqual([
      expect.objectContaining({ pattern: "*://*.saved.example.com/*" }),
    ]);
    expect(storage.chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  it("removes a rule while the stored set still holds invalid patterns", async () => {
    const storage = createDelayedStorage([
      REGEXP_RULE,
      OVERSIZED_RULE,
      VALID_RULE,
    ]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "remove",
        ruleIds: [REGEXP_RULE.id],
      }
    );

    expect(successPayload(response).skippedCount).toBe(1);
    expect(storage.getRules()).toEqual([
      expect.objectContaining({ id: VALID_RULE.id }),
      expect.objectContaining({ id: OVERSIZED_RULE.id }),
    ]);
  });

  it("adds a rule while the stored set still holds invalid patterns", async () => {
    const storage = createDelayedStorage([REGEXP_RULE, VALID_RULE]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "added.example.com",
      }
    );

    expect(successPayload(response).skippedCount).toBe(1);
    expect(storage.getRules()).toEqual([
      expect.objectContaining({ id: VALID_RULE.id }),
      expect.objectContaining({ pattern: "*://*.added.example.com/*" }),
      expect.objectContaining({ id: REGEXP_RULE.id, pattern: "/regexp/" }),
    ]);
  });

  it("updates a rule while the stored set still holds invalid patterns", async () => {
    const storage = createDelayedStorage([REGEXP_RULE, VALID_RULE]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "update",
        pattern: "updated.example.com",
        ruleId: VALID_RULE.id,
      }
    );

    expect(successPayload(response).skippedCount).toBe(1);
    expect(storage.getRules()).toEqual([
      expect.objectContaining({ pattern: "*://*.updated.example.com/*" }),
      expect.objectContaining({ id: REGEXP_RULE.id, pattern: "/regexp/" }),
    ]);
  });

  it("removes a rule even when the stored set exceeds the rule limit", async () => {
    const tooManyRules = Array.from(
      { length: 2001 },
      (_, index): SearchBlocklistRule => ({
        createdAt: index,
        id: `r${index}`,
        pattern: `*://*.site${index}.example.com/*`,
      })
    );
    const storage = createDelayedStorage(tooManyRules);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "remove",
        ruleIds: ["r0"],
      }
    );

    expect(successPayload(response).rules).toHaveLength(2000);
    expect(storage.getRules()).toHaveLength(2000);
  });

  it("keeps invalid stored rules in storage when a rule is added", async () => {
    const shapeInvalidEntry = { createdAt: "not-a-number", id: "broken" };
    const storage = createDelayedStorage([
      REGEXP_RULE,
      OVERSIZED_RULE,
      shapeInvalidEntry,
      VALID_RULE,
    ]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "added.example.com",
      }
    );

    expect(successPayload(response).skippedCount).toBe(3);
    expect(successPayload(response).rules).toEqual([
      expect.objectContaining({ id: VALID_RULE.id }),
      expect.objectContaining({ pattern: "*://*.added.example.com/*" }),
      expect.objectContaining({ id: REGEXP_RULE.id, pattern: "/regexp/" }),
      expect.objectContaining({ id: OVERSIZED_RULE.id }),
    ]);
    expect(storage.getRules()).toEqual([
      expect.objectContaining({ id: VALID_RULE.id }),
      expect.objectContaining({ pattern: "*://*.added.example.com/*" }),
      expect.objectContaining({ id: REGEXP_RULE.id, pattern: "/regexp/" }),
      expect.objectContaining({
        id: OVERSIZED_RULE.id,
        pattern: OVERSIZED_RULE.pattern,
      }),
      shapeInvalidEntry,
    ]);
  });

  it("removes an invalid stored rule by id", async () => {
    const storage = createDelayedStorage([REGEXP_RULE, VALID_RULE]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "remove",
        ruleIds: [REGEXP_RULE.id],
      }
    );

    expect(successPayload(response).skippedCount).toBe(0);
    expect(storage.getRules()).toEqual([
      expect.objectContaining({ id: VALID_RULE.id }),
    ]);
  });

  it("repairs an invalid stored rule through update", async () => {
    const storage = createDelayedStorage([REGEXP_RULE, VALID_RULE]);
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    const response = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "update",
        pattern: "repaired.example.com",
        ruleId: REGEXP_RULE.id,
      }
    );

    expect(successPayload(response).skippedCount).toBe(0);
    expect(storage.getRules()).toEqual([
      expect.objectContaining({ id: VALID_RULE.id }),
      {
        createdAt: REGEXP_RULE.createdAt,
        id: REGEXP_RULE.id,
        pattern: "*://*.repaired.example.com/*",
      },
    ]);
  });

  it("rejects a second add of the same pattern instead of storing a duplicate id", async () => {
    const storage = createDelayedStorage();
    vi.stubGlobal("chrome", storage.chrome);
    const { runtimeHandlers } = await import("@/background/runtime_handlers");

    await sendMutation(runtimeHandlers.searchBlocklistMutate, {
      action: "searchBlocklistMutate",
      op: "add",
      pattern: "example.com",
    });
    const secondResponse = await sendMutationForResponse(
      runtimeHandlers.searchBlocklistMutate,
      {
        action: "searchBlocklistMutate",
        op: "add",
        pattern: "example.com",
      }
    );

    expect(failureError(secondResponse)).toBe(
      "既に同じパターンが登録されています"
    );
    expect(storage.getRules()).toHaveLength(1);
    expect(new Set(storage.getRules().map((rule) => rule.id)).size).toBe(
      storage.getRules().length
    );
  });
});
