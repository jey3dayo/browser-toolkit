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
    chrome.action.setBadgeText({ text: "", tabId });
    chrome.action.setTitle({
      title: APP_NAME,
      tabId,
    });
  } catch {
    // no-op
  }
}
