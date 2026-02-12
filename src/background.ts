// Background Service Worker

import { APP_NAME } from "@/app_meta";
import {
  registerContextMenuHandlers,
  scheduleRefreshContextMenus,
} from "@/background/context_menu_registry";
import { registerRuntimeMessageHandlers } from "@/background/runtime";
import { runMigrations } from "@/storage/migrations";
import { debugLog } from "@/utils/debug_log";

// Development-only auto-reload
if (process.env.NODE_ENV === "development") {
  import("@/background/dev-reload");
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`${APP_NAME} installed (reason: ${details.reason})`);
  debugLog("background", "extension installed", {
    reason: details.reason,
  }).catch(() => {
    // no-op
  });

  // 拡張機能インストール・更新時にストレージマイグレーションを実行
  if (details.reason === "install" || details.reason === "update") {
    runMigrations()
      .then(() => {
        console.log("Storage migrations completed");
      })
      .catch((error) => {
        console.error("Failed to run storage migrations:", error);
      });
  }

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
