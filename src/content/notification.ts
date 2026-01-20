// Toast通知機能
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ensureShadowMount } from "@/content/shadow_mount";
import type { Theme } from "@/ui/theme";
import {
  createNotifications,
  type Notifier,
  ToastHost,
  type ToastManager,
} from "@/ui/toast";

const TOAST_HOST_ID = "browser-toolkit-toast-host";
const TOAST_ROOT_ID = "mtk-toast-react-root";

export type ToastMount = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  root: Root;
  toastManager: ToastManager;
  notify: Notifier;
};

/**
 * Toast通知のマウントポイントを確保
 * @param currentTheme - 適用するテーマ
 * @returns ToastMount
 */
export function ensureToastMount(currentTheme: Theme): ToastMount {
  const mount = ensureShadowMount({
    hostId: TOAST_HOST_ID,
    rootId: TOAST_ROOT_ID,
    theme: currentTheme,
  });
  const notifications = createNotifications();
  const root = createRoot(mount.rootEl);
  root.render(
    createElement(ToastHost, {
      toastManager: notifications.toastManager,
      placement: "screen",
      portalContainer: mount.shadow,
    })
  );

  return {
    host: mount.host,
    shadow: mount.shadow,
    root,
    toastManager: notifications.toastManager,
    notify: notifications.notify,
  };
}

/**
 * 通知を表示
 * @param notify - Notifierインスタンス
 * @param message - 表示するメッセージ
 */
export function showNotification(notify: Notifier, message: string): void {
  const text = message.trim();
  if (!text) {
    return;
  }
  notify.info(text);
}
