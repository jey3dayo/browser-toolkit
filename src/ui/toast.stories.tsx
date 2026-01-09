import type { Meta, StoryObj } from "@storybook/react-vite";

import { useMemo } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { createNotifications, ToastHost } from "@/ui/toast";

function ToastStory(): React.JSX.Element {
  const notifications = useMemo(() => createNotifications(), []);

  return (
    <>
      <ToastHost
        portalContainer={document.body}
        toastManager={notifications.toastManager}
      />
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Toast</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            トリガーを押して見た目（幅/余白/状態の見分けやすさ）を確認できます。
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="mbu-overlay-action"
            data-testid="toast-info"
            onClick={() => {
              notifications.notify.info("コピーしました");
            }}
            type="button"
          >
            Info
          </button>
          <button
            className="mbu-overlay-action"
            data-testid="toast-success"
            onClick={() => {
              notifications.notify.success("保存しました");
            }}
            type="button"
          >
            Success
          </button>
          <button
            className="mbu-overlay-action"
            data-testid="toast-error"
            onClick={() => {
              notifications.toastManager.add({
                title: "コピーに失敗しました",
                description: "権限がありません。ページ設定を確認してください。",
                type: "error",
                timeout: 5000,
                priority: "high",
              });
            }}
            type="button"
          >
            Error
          </button>
          <button
            className="mbu-overlay-action"
            data-testid="toast-long"
            onClick={() => {
              notifications.toastManager.add({
                title:
                  "長いメッセージでも太く見えず、適切に折り返されることを確認してください",
                type: "info",
                timeout: 6000,
                priority: "low",
              });
            }}
            type="button"
          >
            Long
          </button>
        </div>
      </div>
    </>
  );
}

const meta = {
  title: "Shared/UI/Toast",
  component: ToastStory,
  tags: ["test"],
} satisfies Meta<typeof ToastStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const view = doc.defaultView;
    const canvas = within(canvasElement);

    const viewportWidth = view?.innerWidth ?? doc.documentElement.clientWidth;
    const viewportHeight =
      view?.innerHeight ?? doc.documentElement.clientHeight;

    async function triggerAndAssertToast(
      testId: string,
      expectedText: string
    ): Promise<void> {
      await userEvent.click(canvas.getByTestId(testId));
      await waitFor(() => {
        const toasts = doc.body.querySelectorAll(".mbu-toast-root");
        expect(toasts.length).toBeGreaterThan(0);
        const toast = Array.from(toasts).find((node) =>
          node.textContent?.includes(expectedText)
        );
        expect(toast).toBeTruthy();
      });

      const toasts = doc.body.querySelectorAll<HTMLElement>(".mbu-toast-root");
      const toast = Array.from(toasts).find((node) =>
        node.textContent?.includes(expectedText)
      );
      if (!toast) {
        throw new Error(`Toast not found: ${expectedText}`);
      }

      await waitFor(() => {
        const viewport = doc.body.querySelector<HTMLElement>(
          ".mbu-toast-viewport"
        );
        expect(viewport).toBeTruthy();
        if (!viewport) {
          return;
        }
        expect(getComputedStyle(viewport).position).toBe("fixed");
      });

      const rect = toast.getBoundingClientRect();

      expect(rect.left).toBeGreaterThanOrEqual(-1);
      expect(rect.top).toBeGreaterThanOrEqual(-1);
      expect(rect.right).toBeLessThanOrEqual(viewportWidth + 1);
      expect(rect.bottom).toBeLessThanOrEqual(viewportHeight + 1);
    }

    await triggerAndAssertToast("toast-info", "コピーしました");
    await triggerAndAssertToast("toast-success", "保存しました");
    await triggerAndAssertToast("toast-error", "コピーに失敗しました");
    await triggerAndAssertToast("toast-long", "長いメッセージでも太く見えず");
  },
};

function ToastWithCloseButton(): React.JSX.Element {
  const notifications = useMemo(() => createNotifications(), []);

  return (
    <>
      <ToastHost
        portalContainer={document.body}
        toastManager={notifications.toastManager}
      />
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Toast with Close</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            トーストを表示して閉じるボタンで閉じることを確認します。
          </div>
        </div>

        <button
          className="mbu-overlay-action"
          data-testid="toast-close-test"
          onClick={() => {
            notifications.notify.info("閉じるボタンで閉じられます");
          }}
          type="button"
        >
          Show Toast
        </button>
      </div>
    </>
  );
}

export const CloseButton: Story = {
  render: () => <ToastWithCloseButton />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId("toast-close-test"));

    await waitFor(() => {
      const toasts = doc.body.querySelectorAll<HTMLElement>(".mbu-toast-root");
      expect(toasts.length).toBeGreaterThan(0);
    });

    const toasts = doc.body.querySelectorAll<HTMLElement>(".mbu-toast-root");
    const toast = Array.from(toasts).find((node) =>
      node.textContent?.includes("閉じるボタンで閉じられます")
    );
    expect(toast).toBeTruthy();
    if (!toast) {
      return;
    }

    const closeButton = toast.querySelector<HTMLElement>(".mbu-toast-close");
    expect(closeButton).toBeTruthy();
    if (!closeButton) {
      return;
    }

    expect(closeButton.getAttribute("aria-label")).toBe("閉じる");

    await userEvent.click(closeButton);

    await waitFor(
      () => {
        const remainingToasts = doc.body.querySelectorAll(".mbu-toast-root");
        const remainingToast = Array.from(remainingToasts).find((node) =>
          node.textContent?.includes("閉じるボタンで閉じられます")
        );
        expect(remainingToast).toBeFalsy();
      },
      { timeout: 1000 }
    );
  },
};

function ToastStacking(): React.JSX.Element {
  const notifications = useMemo(() => createNotifications(), []);

  return (
    <>
      <ToastHost
        portalContainer={document.body}
        toastManager={notifications.toastManager}
      />
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Toast Stacking</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            複数のトーストが適切にスタッキングされることを確認します。
          </div>
        </div>

        <button
          className="mbu-overlay-action"
          data-testid="toast-stack-test"
          onClick={() => {
            notifications.notify.info("1つ目のトースト");
            setTimeout(() => {
              notifications.notify.success("2つ目のトースト");
            }, 100);
            setTimeout(() => {
              notifications.notify.error("3つ目のトースト");
            }, 200);
          }}
          type="button"
        >
          Show Multiple Toasts
        </button>
      </div>
    </>
  );
}

export const Stacking: Story = {
  render: () => <ToastStacking />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId("toast-stack-test"));

    await waitFor(
      () => {
        const toasts =
          doc.body.querySelectorAll<HTMLElement>(".mbu-toast-root");
        expect(toasts.length).toBeGreaterThanOrEqual(3);
      },
      { timeout: 2000 }
    );

    const toasts = doc.body.querySelectorAll<HTMLElement>(".mbu-toast-root");
    expect(toasts.length).toBeGreaterThanOrEqual(3);

    const toast1 = Array.from(toasts).find((node) =>
      node.textContent?.includes("1つ目のトースト")
    );
    const toast2 = Array.from(toasts).find((node) =>
      node.textContent?.includes("2つ目のトースト")
    );
    const toast3 = Array.from(toasts).find((node) =>
      node.textContent?.includes("3つ目のトースト")
    );

    expect(toast1).toBeTruthy();
    expect(toast2).toBeTruthy();
    expect(toast3).toBeTruthy();

    if (toast1 && toast2 && toast3) {
      const rect1 = toast1.getBoundingClientRect();
      const rect2 = toast2.getBoundingClientRect();
      const rect3 = toast3.getBoundingClientRect();

      expect(rect1.top).toBeLessThan(rect2.top);
      expect(rect2.top).toBeLessThan(rect3.top);
    }
  },
};
