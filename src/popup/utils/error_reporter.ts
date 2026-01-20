import React from "react";
import type { PaneId } from "@/popup/panes";
import type { Notifier } from "@/ui/toast";

export type ErrorReporterOptions = {
  notify: Notifier;
  navigateToPane?: (paneId: PaneId) => void;
  focusTokenInput?: () => void;
};

/**
 * トークン関連のエラーかどうかを判定
 */
function isTokenRelatedError(message: string): boolean {
  return (
    message.includes("Token") ||
    message.includes("トークン") ||
    message.includes("未設定") ||
    message.includes("API Key")
  );
}

/**
 * エラーメッセージを表示し、トークン関連エラーの場合は設定画面への誘導を追加
 */
export function reportError(
  message: string,
  options: ErrorReporterOptions
): void {
  const { notify, navigateToPane, focusTokenInput } = options;

  if (isTokenRelatedError(message) && navigateToPane && focusTokenInput) {
    notify.error({
      title: message,
      description: React.createElement(
        "button",
        {
          className: "mbu-toast-action-link",
          onClick: () => {
            navigateToPane("pane-settings");
            focusTokenInput();
          },
          type: "button",
        },
        "→ 設定を開く"
      ),
    });
  } else {
    notify.error(message);
  }
}

/**
 * エラー報告関数を作成するファクトリー
 */
export function createErrorReporter(
  options: ErrorReporterOptions
): (message: string) => void {
  return (message: string) => reportError(message, options);
}
