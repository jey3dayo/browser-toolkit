// Toast通知機能
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createNotifications,
  type Notifier,
  ToastHost,
  type ToastManager,
} from "@/ui/toast";
import { ensureShadowUiBaseStyles } from "@/ui/styles";
import { applyTheme, type Theme } from "@/ui/theme";

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
  const existing = document.getElementById(
    TOAST_HOST_ID
  ) as HTMLDivElement | null;
  const host = existing || document.createElement("div");
  host.id = TOAST_HOST_ID;

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  if (!host.isConnected) {
    (document.documentElement ?? document.body ?? document).appendChild(host);
  }
  ensureShadowUiBaseStyles(shadow);
  applyTheme(currentTheme, shadow);

  let rootEl = shadow.getElementById(TOAST_ROOT_ID) as HTMLDivElement | null;
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = TOAST_ROOT_ID;
    shadow.appendChild(rootEl);
  }

  const notifications = createNotifications();
  const root = createRoot(rootEl);
  root.render(
    createElement(ToastHost, {
      toastManager: notifications.toastManager,
      placement: "screen",
      portalContainer: shadow,
    })
  );

  return {
    host,
    shadow,
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
