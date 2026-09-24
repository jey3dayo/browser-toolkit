import { Result } from "@praha/byethrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestImageDownload } from "@/image-zoom/download-request";

describe("image-zoom download-request: requestImageDownload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("succeeds when background responds with a Success Result", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(async () => Result.succeed({})),
      },
    });

    const result = await requestImageDownload(
      "https://pbs.twimg.com/media/AbCdEfGh"
    );
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("fails when background responds with a Failure Result", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(async () => Result.fail("boom")),
      },
    });

    const result = await requestImageDownload(
      "https://pbs.twimg.com/media/AbCdEfGh"
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("boom");
    }
  });

  it("fails when chrome.runtime.sendMessage throws", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(() => {
          throw new Error("disconnected");
        }),
      },
    });

    const result = await requestImageDownload(
      "https://pbs.twimg.com/media/AbCdEfGh"
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("disconnected");
    }
  });
});
