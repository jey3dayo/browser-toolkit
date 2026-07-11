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

  it("errorレベルで構造化データを出すときも console.error には文字列だけ渡す", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // no-op
      });
    const data = { reason: "copy failed", tabId: 123 };

    await debugLog("context", "action failed", data, "error");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR] [context] action failed {"reason":"copy failed","tabId":123}'
    );
  });

  it("循環参照を含む構造化データでも console.error の追加引数にしない", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // no-op
      });
    const data: { self?: unknown } = {};
    data.self = data;

    await debugLog("context", "action failed", data, "error");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[ERROR] [context] action failed [unserializable data]"
    );
  });

  it("token を含むデータは console 出力にも storage 保存にも平文で残らない", async () => {
    const setMock = vi.fn((_data, callback) => callback?.());
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys, callback) => {
            if (Array.isArray(keys) && keys.includes("debugMode")) {
              callback({ debugMode: true });
              return;
            }
            callback({ debugLogs: [] });
          }),
          set: setMock,
          remove: vi.fn(),
        },
      },
    } as any;
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // no-op
      });
    const token = "sk-dummy-value-000";

    await debugLog("context", "action failed", { token }, "error");

    const consoleOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
    expect(consoleOutput).not.toContain(token);
    expect(consoleOutput).toContain("[REDACTED");

    expect(setMock).toHaveBeenCalledTimes(1);
    const savedLogs = setMock.mock.calls[0]?.[0]?.debugLogs;
    const savedContent = JSON.stringify(savedLogs);
    expect(savedContent).not.toContain(token);
    expect(savedContent).toContain("[REDACTED");
  });

  it("ネストしたオブジェクト内の token も redact される", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // no-op
      });
    const token = "sk-dummy-value-111";

    await debugLog("context", "action failed", { request: { token } }, "error");

    const consoleOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
    expect(consoleOutput).not.toContain(token);
    expect(consoleOutput).toContain("[REDACTED");
  });

  it("機微でないフィールドはそのまま残る", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // no-op
      });

    await debugLog(
      "context",
      "action failed",
      { url: "https://example.com" },
      "error"
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR] [context] action failed {"url":"https://example.com"}'
    );
  });
});
