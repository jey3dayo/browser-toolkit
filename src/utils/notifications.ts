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
 * Chrome Notifications API の制限
 * @see https://developer.chrome.com/docs/extensions/reference/notifications/#type-NotificationOptions
 */
const MAX_TITLE_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 512;

/**
 * 通知タイトルをフォーマット（文字数制限を適用）
 */
function formatTitle(title: unknown): string {
  const text = String(title ?? "");
  if (text.length > MAX_TITLE_LENGTH) {
    return `${text.slice(0, MAX_TITLE_LENGTH - 3)}...`;
  }
  return text;
}

/**
 * 通知メッセージをフォーマット（文字数制限を適用）
 */
function formatMessage(message: unknown): string {
  const text = String(message ?? "");
  if (text.length > MAX_MESSAGE_LENGTH) {
    return `${text.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;
  }
  return text;
}

/**
 * システム通知を表示する
 */
export async function showNotification(
  params: NotificationParams
): Promise<void> {
  try {
    // バリデーションとフォーマットを適用
    const formattedTitle = formatTitle(params.title);
    const formattedMessage = formatMessage(params.message);

    // iconUrlを指定しない場合、manifest.jsonで定義されたアイコンが自動的に使用される
    // Service Workerからの画像参照が失敗するケースがあるため、明示的な指定を避ける

    // カスタムアイコンが明示的に指定された場合のみ使用
    if (params.iconUrl) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: params.iconUrl,
        title: formattedTitle,
        message: formattedMessage,
        priority: params.priority ?? 1,
      });
    } else {
      // iconUrlを省略することで、manifest.jsonで定義されたアイコンが使用される
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "", // 空文字列を指定することでデフォルトアイコンが使用される
        title: formattedTitle,
        message: formattedMessage,
        priority: params.priority ?? 1,
      });
    }
  } catch (error) {
    console.error("Failed to show notification:", error, {
      title: params.title,
      titleLength: String(params.title ?? "").length,
      messageLength: String(params.message ?? "").length,
    });
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
