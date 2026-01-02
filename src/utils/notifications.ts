/**
 * Chrome通知を表示するユーティリティ関数
 */

export type NotificationParams = {
  title: string;
  message: string;
  iconUrl?: string;
  priority?: 0 | 1 | 2;
};

/**
 * システム通知を表示する
 */
export async function showNotification(
  params: NotificationParams
): Promise<void> {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: params.iconUrl ?? "images/icon128.png",
      title: params.title,
      message: params.message,
      priority: params.priority ?? 1,
    });
  } catch (error) {
    console.error("Failed to show notification:", error);
  }
}

/**
 * エラー通知を表示する（汎用）
 */
export async function showErrorNotification(params: {
  title: string;
  errorMessage: string;
  hint?: string;
}): Promise<void> {
  const messageParts = [params.errorMessage];
  if (params.hint) {
    messageParts.push("", params.hint);
  }

  await showNotification({
    title: params.title,
    message: messageParts.join("\n"),
  });
}
