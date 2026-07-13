// Background Service Worker

import { APP_NAME } from "@/app_meta";
import {
  registerContextMenuHandlers,
  scheduleRefreshContextMenus,
} from "@/background/context_menu_registry";
import { syncFocusOverrideContentScript } from "@/background/focus_override_registration";
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
  syncFocusOverrideContentScript().catch(() => {
    // no-op
  });
});

chrome.runtime.onStartup.addListener(() => {
  debugLog("background", "extension startup").catch(() => {
    // no-op
  });
  scheduleRefreshContextMenus();
  syncFocusOverrideContentScript().catch(() => {
    // no-op
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  const hasMenuConfigChange =
    "contextActions" in changes ||
    "searchEngines" in changes ||
    "searchEngineGroups" in changes ||
    "textTemplates" in changes;
  if (hasMenuConfigChange) {
    debugLog("background", "storage changed, refreshing menus", {
      changes,
    }).catch(() => {
      // no-op
    });
    scheduleRefreshContextMenus();
  }

  if ("focusOverridePatterns" in changes) {
    syncFocusOverrideContentScript().catch(() => {
      // no-op
    });
  }
});

registerContextMenuHandlers();
registerRuntimeMessageHandlers();

// メニュー登録はブラウザプロセス側に永続化されるため、SW復帰のたびに
// 再構築する必要はない（removeAll から再作成までの間にメニューが
// 空/部分的になるウィンドウが生じ、右クリックメニュー消失の原因になる）。
// 再構築は onInstalled / onStartup / storage.onChanged のみで行う。
syncFocusOverrideContentScript().catch(() => {
  // no-op
});

// Service Worker 定期ウェイク
// MV3 の Service Worker は約30秒のアイドルでスリープする。chrome.alarms の
// 最小間隔は1分のため、この alarm は30秒のアイドルタイムアウトを継続的に
// 防ぐものではない（間隔中に SW はスリープしうる）。イベントリスナーが必要時に
// SW を起こすため機能上の問題はなく、この alarm は定期的な heartbeat ログ用途で残している。
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
