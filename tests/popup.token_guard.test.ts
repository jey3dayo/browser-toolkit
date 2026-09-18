import { Result } from "@praha/byethrow";
import { describe, expect, it, vi } from "vitest";
import { ensureOpenAiTokenConfigured } from "@/popup/token_guard";

describe("ensureOpenAiTokenConfigured", () => {
  it("returns Success when token exists", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ openaiApiToken: "sk-test" })
    );
    const showNotification = vi.fn();
    const navigate = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      navigate,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isSuccess(result)).toBe(true);

    expect(showNotification).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("returns Success when the selected provider token exists", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({
        aiProvider: "anthropic",
        anthropicApiToken: "sk-anthropic",
        openaiApiToken: "",
      })
    );
    const showNotification = vi.fn();
    const navigate = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      navigate,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isSuccess(result)).toBe(true);

    expect(showNotification).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates to the settings pane with token focus when the token is missing", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ openaiApiToken: "" })
    );
    const showNotification = vi.fn();
    const navigate = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      navigate,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("missing-token");
    }

    expect(showNotification).toHaveBeenCalledWith(
      {
        action: {
          label: "→ 設定を開く",
          onClick: expect.any(Function),
        },
        message: "API Tokenが未設定です",
      },
      "error"
    );

    expect(navigate).not.toHaveBeenCalled();

    const [[callArgs]] = showNotification.mock.calls;
    if (typeof callArgs !== "string" && callArgs.action) {
      callArgs.action.onClick();
    }
    expect(navigate).toHaveBeenCalledWith("pane-settings", {
      focus: "token",
    });
  });

  it("treats storage errors as missing token", async () => {
    const storageLocalGet = vi.fn(async () => Result.fail("storage failed"));
    const showNotification = vi.fn();
    const navigate = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      navigate,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("storage-error");
    }

    expect(showNotification).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("pane-settings", {
      focus: "token",
    });
  });
});
