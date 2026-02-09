import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { showErrorNotification, showNotification } from "@/utils/notifications";

/**
 * Chrome Notifications API のモック
 */
const mockChromeNotifications = {
  create: vi.fn(),
};

/**
 * テスト用の正規表現パターン（パフォーマンス最適化のためトップレベルで定義）
 */
const TRUNCATED_TITLE_PATTERN = /^A+\.\.\.$/;
const TRUNCATED_MESSAGE_PATTERN = /^B+\.\.\.$/;

describe("utils/notifications", () => {
  beforeEach(() => {
    // chrome.notifications API をモック
    global.chrome = {
      notifications: mockChromeNotifications,
    } as any;

    mockChromeNotifications.create.mockResolvedValue("notification-id");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("showNotification", () => {
    it("通知を正常に表示できる", async () => {
      await showNotification({
        title: "テストタイトル",
        message: "テストメッセージ",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith({
        type: "basic",
        iconUrl: "",
        title: "テストタイトル",
        message: "テストメッセージ",
        priority: 1,
      });
    });

    it("カスタムアイコンを指定できる", async () => {
      await showNotification({
        title: "テスト",
        message: "テスト",
        iconUrl: "/icons/custom.png",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith({
        type: "basic",
        iconUrl: "/icons/custom.png",
        title: "テスト",
        message: "テスト",
        priority: 1,
      });
    });

    it("優先度を指定できる", async () => {
      await showNotification({
        title: "テスト",
        message: "テスト",
        priority: 2,
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 2,
        })
      );
    });

    it("タイトルが256文字を超える場合は切り詰める", async () => {
      const longTitle = "A".repeat(300);

      await showNotification({
        title: longTitle,
        message: "テスト",
      });

      const call = mockChromeNotifications.create.mock.calls[0][0];
      expect(call.title).toHaveLength(256);
      expect(call.title).toMatch(TRUNCATED_TITLE_PATTERN);
    });

    it("メッセージが512文字を超える場合は切り詰める", async () => {
      const longMessage = "B".repeat(600);

      await showNotification({
        title: "テスト",
        message: longMessage,
      });

      const call = mockChromeNotifications.create.mock.calls[0][0];
      expect(call.message).toHaveLength(512);
      expect(call.message).toMatch(TRUNCATED_MESSAGE_PATTERN);
    });

    it("null や undefined を安全に処理する", async () => {
      await showNotification({
        title: null as any,
        message: undefined as any,
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "",
          message: "",
        })
      );
    });

    it("エラーが発生してもクラッシュしない", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {
          // console.error をモックして出力を抑制
        });
      mockChromeNotifications.create.mockRejectedValue(
        new Error("Notification failed")
      );

      await expect(
        showNotification({
          title: "テスト",
          message: "テスト",
        })
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to show notification:",
        expect.any(Error),
        expect.objectContaining({
          title: "テスト",
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("showErrorNotification", () => {
    it("エラー通知を表示できる", async () => {
      await showErrorNotification({
        title: "エラー",
        errorMessage: "問題が発生しました",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "エラー",
          message: "問題が発生しました",
        })
      );
    });

    it("ヒントを含むエラー通知を表示できる", async () => {
      await showErrorNotification({
        title: "エラー",
        errorMessage: "問題が発生しました",
        hint: "設定を確認してください",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "エラー",
          message: "問題が発生しました\n\n設定を確認してください",
        })
      );
    });

    it("長いエラーメッセージとヒントも安全に処理する", async () => {
      const longError = "E".repeat(400);
      const longHint = "H".repeat(200);

      await showErrorNotification({
        title: "エラー",
        errorMessage: longError,
        hint: longHint,
      });

      const call = mockChromeNotifications.create.mock.calls[0][0];
      expect(call.message.length).toBeLessThanOrEqual(512);
    });
  });
});
