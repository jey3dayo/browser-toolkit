import { APP_NAME } from "@/app_meta";

export function canUseChromeAction(runtime: {
  isExtensionPage: boolean;
}): boolean {
  return (
    runtime.isExtensionPage &&
    typeof chrome !== "undefined" &&
    Boolean((chrome as unknown as { action?: unknown }).action)
  );
}

export function clearActionBadgeForTab(tabId: number): void {
  try {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({
      tabId,
      title: APP_NAME,
    });
  } catch {
    // no-op
  }
}
