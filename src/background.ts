// Background Service Worker

import { migrateToAiSettings } from "@/ai/settings";
import { APP_NAME } from "@/app_meta";
import {
  registerContextMenuHandlers,
  scheduleRefreshContextMenus,
} from "@/background/context_menu_registry";
import { registerRuntimeMessageHandlers } from "@/background/runtime";
import { debugLog } from "@/utils/debug_log";

chrome.runtime.onInstalled.addListener(() => {
  console.log(`${APP_NAME} installed`);
  debugLog("background", "extension installed").catch(() => {
    // no-op
  });
  // 旧設定から新設定へのマイグレーション
  migrateToAiSettings(chrome.storage.local).catch((error) => {
    console.error("Failed to migrate AI settings:", error);
  });
  scheduleRefreshContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  debugLog("background", "extension startup").catch(() => {
    // no-op
  });
  scheduleRefreshContextMenus();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }
  if (
    !(
      "contextActions" in changes ||
      "searchEngines" in changes ||
      "searchEngineGroups" in changes ||
      "textTemplates" in changes
    )
  ) {
    return;
  }
  debugLog("background", "storage changed, refreshing menus", {
    changes,
  }).catch(() => {
    // no-op
  });
  scheduleRefreshContextMenus();
});

registerContextMenuHandlers();
registerRuntimeMessageHandlers();

scheduleRefreshContextMenus();
