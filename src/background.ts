// Background Service Worker

import { APP_NAME } from "@/app_meta";
import {
  registerContextMenuHandlers,
  scheduleRefreshContextMenus,
} from "@/background/context_menu_registry";
import { registerRuntimeMessageHandlers } from "@/background/runtime";

chrome.runtime.onInstalled.addListener(() => {
  console.log(`${APP_NAME} installed`);
  scheduleRefreshContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleRefreshContextMenus();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }
  if (!("contextActions" in changes || "searchEngines" in changes)) {
    return;
  }
  scheduleRefreshContextMenus();
});

registerContextMenuHandlers();
registerRuntimeMessageHandlers();

scheduleRefreshContextMenus();
