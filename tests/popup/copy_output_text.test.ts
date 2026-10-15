import { Result } from "@praha/byethrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "@/i18n";
import { copyReadyOutputText } from "@/popup/panes/copyOutputText";

const { copyToClipboard } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
}));

vi.mock("@/utils/clipboard", () => ({ copyToClipboard }));

const messages = {
  failed: "notifications.copyFailed",
  success: "notifications.copySuccess",
  unavailable: "clipboard.errors.unavailable",
} as const;

function createNotifier() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  };
}

describe("copyReadyOutputText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims the text and notifies success on copy", async () => {
    copyToClipboard.mockResolvedValue(Result.succeed(undefined));
    const notify = createNotifier();

    await copyReadyOutputText("  summary text  ", { messages, notify });

    expect(copyToClipboard).toHaveBeenCalledWith("summary text");
    expect(notify.success).toHaveBeenCalledWith(t(messages.success));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("notifies the unavailable message when the clipboard is unavailable", async () => {
    copyToClipboard.mockResolvedValue(Result.fail({ type: "unavailable" }));
    const notify = createNotifier();

    await copyReadyOutputText("summary", { messages, notify });

    expect(notify.error).toHaveBeenCalledWith(t(messages.unavailable));
    expect(notify.success).not.toHaveBeenCalled();
  });

  it("notifies the failure message on other copy errors", async () => {
    copyToClipboard.mockResolvedValue(Result.fail({ type: "copy-failed" }));
    const notify = createNotifier();

    await copyReadyOutputText("summary", { messages, notify });

    expect(notify.error).toHaveBeenCalledWith(t(messages.failed));
    expect(notify.success).not.toHaveBeenCalled();
  });

  it("does nothing for empty or whitespace-only text", async () => {
    const notify = createNotifier();

    await copyReadyOutputText("   \n  ", { messages, notify });

    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });
});
