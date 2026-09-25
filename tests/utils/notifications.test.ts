import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { showErrorNotification, showNotification } from "@/utils/notifications";

/**
 * Chrome Notifications API のモック
 */
const mockChromeNotifications = {
  create: vi.fn(),
};

const MOCK_ICON_URL = "chrome-extension://mock/images/icon128.png";

/**
 * テスト用の正規表現パターン（パフォーマンス最適化のためトップレベルで定義）
 */
const TRUNCATED_TITLE_PATTERN = /^A+\.\.\.$/;
const TRUNCATED_MESSAGE_PATTERN = /^B+\.\.\.$/;

describe("utils/notifications", () => {
  beforeEach(() => {
    // chrome API をモック
    global.chrome = {
      notifications: mockChromeNotifications,
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
      },
    } as any;

    mockChromeNotifications.create.mockResolvedValue("notification-id");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("showNotification", () => {
    it("通知を正常に表示できる", async () => {
      await showNotification({
        message: "テストメッセージ",
        title: "テストタイトル",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith({
        iconUrl: MOCK_ICON_URL,
        message: "テストメッセージ",
        priority: 1,
        title: "テストタイトル",
        type: "basic",
      });
    });

    it("カスタムアイコンを指定できる", async () => {
      await showNotification({
        iconUrl: "/icons/custom.png",
        message: "テスト",
        title: "テスト",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith({
        iconUrl: "/icons/custom.png",
        message: "テスト",
        priority: 1,
        title: "テスト",
        type: "basic",
      });
    });

    it("優先度を指定できる", async () => {
      await showNotification({
        message: "テスト",
        priority: 2,
        title: "テスト",
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
        message: "テスト",
        title: longTitle,
      });

      const [[call]] = mockChromeNotifications.create.mock.calls;
      expect(call.title).toHaveLength(256);
      expect(call.title).toMatch(TRUNCATED_TITLE_PATTERN);
    });

    it("メッセージが512文字を超える場合は切り詰める", async () => {
      const longMessage = "B".repeat(600);

      await showNotification({
        message: longMessage,
        title: "テスト",
      });

      const [[call]] = mockChromeNotifications.create.mock.calls;
      expect(call.message).toHaveLength(512);
      expect(call.message).toMatch(TRUNCATED_MESSAGE_PATTERN);
    });

    it("null や undefined を安全に処理する", async () => {
      await showNotification({
        message: undefined as any,
        title: null as any,
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "",
          title: "",
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
          message: "テスト",
          title: "テスト",
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
        errorMessage: "問題が発生しました",
        title: "エラー",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "問題が発生しました",
          title: "エラー",
        })
      );
    });

    it("ヒントを含むエラー通知を表示できる", async () => {
      await showErrorNotification({
        errorMessage: "問題が発生しました",
        hint: "設定を確認してください",
        title: "エラー",
      });

      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "問題が発生しました\n\n設定を確認してください",
          title: "エラー",
        })
      );
    });

    it("長いエラーメッセージとヒントも安全に処理する", async () => {
      const longError = "E".repeat(400);
      const longHint = "H".repeat(200);

      await showErrorNotification({
        errorMessage: longError,
        hint: longHint,
        title: "エラー",
      });

      const [[call]] = mockChromeNotifications.create.mock.calls;
      expect(call.message.length).toBeLessThanOrEqual(512);
    });
  });
});
