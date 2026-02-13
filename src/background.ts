// Background Service Worker

import { APP_NAME } from "@/app_meta";
import {
  registerContextMenuHandlers,
  scheduleRefreshContextMenus,
} from "@/background/context_menu_registry";
import { registerRuntimeMessageHandlers } from "@/background/runtime";
import { runMigrations } from "@/storage/migrations";
import { trackError } from "@/utils/analytics";
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
        trackError(
          error instanceof Error ? error : new Error(String(error)),
          "background"
        ).catch(() => {
          // no-op
        });
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

// Service Worker Keep-Alive
// Manifest V3のService Workerは30秒でスリープするため、
// chrome.alarmsを使って定期的にService Workerを起こし続ける
// 注: chrome.alarms.create()のperiodInMinutesの最小値は1分
// 1分間隔でもService Workerのタイムアウト（30秒）を防げるため十分
if (typeof chrome !== "undefined" && chrome.alarms) {
  chrome.alarms.create("keep-alive", { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "keep-alive") {
      debugLog("background", "Service Worker keep-alive ping").catch(() => {
        // no-op
      });
    }
  });
}
