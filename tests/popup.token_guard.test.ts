import { Result } from "@praha/byethrow";
import { describe, expect, it, vi } from "vitest";
import { ensureOpenAiTokenConfigured } from "@/popup/token_guard";

describe("ensureOpenAiTokenConfigured", () => {
  it("returns Success when token exists", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ openaiApiToken: "sk-test" })
    );
    const showNotification = vi.fn();
    const navigateToPane = vi.fn();
    const focusTokenInput = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      focusTokenInput,
      navigateToPane,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isSuccess(result)).toBe(true);

    expect(showNotification).not.toHaveBeenCalled();
    expect(navigateToPane).not.toHaveBeenCalled();
    expect(focusTokenInput).not.toHaveBeenCalled();
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
    const navigateToPane = vi.fn();
    const focusTokenInput = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      focusTokenInput,
      navigateToPane,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isSuccess(result)).toBe(true);

    expect(showNotification).not.toHaveBeenCalled();
    expect(navigateToPane).not.toHaveBeenCalled();
    expect(focusTokenInput).not.toHaveBeenCalled();
  });

  it("navigates to settings and focuses when token missing", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ openaiApiToken: "" })
    );
    const showNotification = vi.fn();
    const navigateToPane = vi.fn();
    const focusTokenInput = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      focusTokenInput,
      navigateToPane,
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

    // onClick が呼ばれる前は、navigateToPane と focusTokenInput は呼ばれていない
    expect(navigateToPane).not.toHaveBeenCalled();
    expect(focusTokenInput).not.toHaveBeenCalled();

    // onClick を実行すると、navigateToPane と focusTokenInput が呼ばれる
    const [[callArgs]] = showNotification.mock.calls;
    if (typeof callArgs !== "string" && callArgs.action) {
      callArgs.action.onClick();
    }
    expect(navigateToPane).toHaveBeenCalledWith("pane-settings");
    expect(focusTokenInput).toHaveBeenCalled();
  });

  it("treats storage errors as missing token", async () => {
    const storageLocalGet = vi.fn(async () => Result.fail("storage failed"));
    const showNotification = vi.fn();
    const navigateToPane = vi.fn();
    const focusTokenInput = vi.fn();

    const result = await ensureOpenAiTokenConfigured({
      focusTokenInput,
      navigateToPane,
      showNotification,
      storageLocalGet,
    });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("storage-error");
    }

    expect(showNotification).toHaveBeenCalled();
    expect(navigateToPane).toHaveBeenCalledWith("pane-settings");
    expect(focusTokenInput).toHaveBeenCalled();
  });
});
