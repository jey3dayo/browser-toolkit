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
    // iconUrlを指定しない場合、manifest.jsonで定義されたアイコンが自動的に使用される
    // Service Workerからの画像参照が失敗するケースがあるため、明示的な指定を避ける

    // カスタムアイコンが明示的に指定された場合のみ使用
    if (params.iconUrl) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: params.iconUrl,
        title: params.title,
        message: params.message,
        priority: params.priority ?? 1,
      });
    } else {
      // iconUrlを省略することで、manifest.jsonで定義されたアイコンが使用される
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "", // 空文字列を指定することでデフォルトアイコンが使用される
        title: params.title,
        message: params.message,
        priority: params.priority ?? 1,
      });
    }
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
