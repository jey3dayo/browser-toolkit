import { t } from "@/i18n";
import type { createNotifications } from "@/ui/toast";

type OverlayNotify = ReturnType<typeof createNotifications>["notify"];

/**
 * Copy text to clipboard with notification
 */
export async function copyTextToClipboard(
  notify: OverlayNotify,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }
  if (!navigator.clipboard?.writeText) {
    notify.error(t("notifications.copyFailed"));
    return;
  }
  try {
    await navigator.clipboard.writeText(trimmed);
    notify.success(t("notifications.copySuccess"));
  } catch {
    notify.error(t("notifications.copyFailed"));
  }
}

/**
 * Open URL in new tab
 */
export function openUrlInNewTab(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    return;
  }
  window.open(trimmed, "_blank", "noopener,noreferrer");
}

/**
 * Download ICS file with notification
 */
export function downloadIcsFile(notify: OverlayNotify, ics: string): void {
  const trimmed = ics.trim();
  if (!trimmed) {
    return;
  }
  try {
    const blob = new Blob([trimmed], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "event.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify.success(t("notifications.downloadSuccess"));
  } catch {
    notify.error(t("notifications.downloadFailed"));
  }
}
