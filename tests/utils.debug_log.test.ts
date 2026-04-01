import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debugLog } from "@/utils/debug_log";

describe("utils/debug_log", () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((_keys, callback) => callback({ debugMode: false })),
          set: vi.fn((_data, callback) => callback?.()),
          remove: vi.fn(),
        },
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("errorレベルで構造化データを出すときも console.error は1回だけ呼ぶ", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // no-op
      });
    const data = { reason: "copy failed", tabId: 123 };

    await debugLog("context", "action failed", data, "error");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[ERROR] [context] action failed",
      data
    );
  });
});
