import React from "react";
import { Button } from "@/components/shared/Button";
import { t } from "@/i18n";
import type { PaneNavigator } from "@/popup/panes";
import type { Notifier } from "@/ui/toast";

export type ErrorReporterOptions = {
  notify: Notifier;
  navigate?: PaneNavigator;
};

function isTokenRelatedError(message: string): boolean {
  return (
    message.includes("Token") ||
    message.includes("トークン") ||
    message.includes("未設定") ||
    message.includes("API Key")
  );
}

function reportError(message: string, options: ErrorReporterOptions): void {
  const { notify, navigate } = options;

  if (isTokenRelatedError(message) && navigate) {
    notify.error({
      description: React.createElement(
        Button,
        {
          onClick: () => {
            navigate("pane-settings", { focus: "token" });
          },
          type: "button",
          variant: "toastActionLink",
        },
        t("popup.tokenGuard.openSettings")
      ),
      title: message,
    });
  } else {
    notify.error(message);
  }
}

export function createErrorReporter(
  options: ErrorReporterOptions
): (message: string) => void {
  return (message: string) => reportError(message, options);
}
