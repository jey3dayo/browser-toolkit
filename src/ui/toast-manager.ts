import { Toast } from "@base-ui/react/toast";
import type { Notifier, ToastManager } from "@/ui/toast";

export function createNotifications(): {
  toastManager: ToastManager;
  notify: Notifier;
} {
  const toastManager = Toast.createToastManager();

  const notify: Notifier = {
    error: (messageOrOptions) => {
      const options =
        typeof messageOrOptions === "string"
          ? { title: messageOrOptions }
          : messageOrOptions;

      toastManager.add({
        description: options.description,
        priority: "high",
        timeout: 3500,
        title: options.title,
        type: "error",
      });
    },
    info: (message) => {
      toastManager.add({
        priority: "low",
        timeout: 2500,
        title: message,
        type: "info",
      });
    },
    success: (message) => {
      toastManager.add({
        priority: "low",
        timeout: 2200,
        title: message,
        type: "success",
      });
    },
  };

  return { notify, toastManager };
}
