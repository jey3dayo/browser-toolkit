/**
 * デバッグログユーティリティ
 * - コンソールに出力
 * - chrome.storage.local に蓄積
 * - ファイルとしてダウンロード可能
 */

const DEBUG_LOG_KEY = "debugLogs";
const MAX_LOG_ENTRIES = 1000; // 最大ログ数

export type DebugLogEntry = {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  context: string;
  message: string;
  data?: unknown;
};

/**
 * デバッグログを出力（コンソール + ストレージ）
 */
export async function debugLog(
  context: string,
  message: string,
  data?: unknown,
  level: "debug" | "info" | "warn" | "error" = "debug"
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry: DebugLogEntry = {
    timestamp,
    level,
    context,
    message,
    data,
  };

  // コンソール出力（常に実行）
  const consoleMessage = `[${level.toUpperCase()}] [${context}] ${message}`;

  // データがある場合は構造化して出力
  if (data !== undefined) {
    switch (level) {
      case "error":
        console.error(consoleMessage);
        console.error("Data:", data);
        break;
      case "warn":
        console.warn(consoleMessage);
        console.warn("Data:", data);
        break;
      case "info":
        console.info(consoleMessage);
        console.info("Data:", data);
        break;
      default:
        console.log(consoleMessage);
        console.log("Data:", data);
    }
  } else {
    switch (level) {
      case "error":
        console.error(consoleMessage);
        break;
      case "warn":
        console.warn(consoleMessage);
        break;
      case "info":
        console.info(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }
  }

  // デバッグモード確認
  try {
    const stored = await new Promise<{ debugMode?: boolean }>((resolve) => {
      chrome.storage.local.get(["debugMode"], (result) => {
        resolve(result as { debugMode?: boolean });
      });
    });
    const debugMode = stored.debugMode === true;

    if (!debugMode) {
      return; // デバッグモードOFFの場合は、ストレージに保存しない
    }
  } catch (error) {
    console.error("Failed to check debug mode:", error);
    return;
  }

  // ストレージに保存（デバッグモードONの場合のみ）
  try {
    const stored = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([DEBUG_LOG_KEY], (result) => {
        resolve(result);
      });
    });
    const logs: DebugLogEntry[] = Array.isArray(stored[DEBUG_LOG_KEY])
      ? stored[DEBUG_LOG_KEY]
      : [];

    logs.push(logEntry);

    // 最大数を超えたら古いログを削除
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }

    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [DEBUG_LOG_KEY]: logs }, () => {
        resolve();
      });
    });
  } catch (error) {
    console.error("Failed to save debug log to storage:", error);
  }
}

/**
 * すべてのデバッグログを取得
 */
export async function getDebugLogs(): Promise<DebugLogEntry[]> {
  try {
    const stored = await chrome.storage.local.get([DEBUG_LOG_KEY]);
    return Array.isArray(stored[DEBUG_LOG_KEY]) ? stored[DEBUG_LOG_KEY] : [];
  } catch (error) {
    console.error("Failed to get debug logs:", error);
    return [];
  }
}

/**
 * デバッグログをクリア
 */
export async function clearDebugLogs(): Promise<void> {
  try {
    await chrome.storage.local.remove([DEBUG_LOG_KEY]);
  } catch (error) {
    console.error("Failed to clear debug logs:", error);
  }
}

/**
 * デバッグログの統計情報を取得
 */
export async function getDebugLogStats(): Promise<{
  entryCount: number;
  sizeBytes: number;
  sizeKB: string;
}> {
  try {
    const logs = await getDebugLogs();
    const content = JSON.stringify(logs);
    const sizeBytes = new Blob([content]).size;
    const sizeKB = (sizeBytes / 1024).toFixed(2);

    return {
      entryCount: logs.length,
      sizeBytes,
      sizeKB,
    };
  } catch (error) {
    console.error("Failed to get debug log stats:", error);
    return {
      entryCount: 0,
      sizeBytes: 0,
      sizeKB: "0.00",
    };
  }
}

/**
 * デバッグログをファイルとしてダウンロード
 */
export async function downloadDebugLogs(): Promise<void> {
  const logs = await getDebugLogs();
  const content = logs
    .map(
      (log) =>
        `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.context}] ${log.message}${
          log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : ""
        }`
    )
    .join("\n\n");

  // Service Worker環境ではURL.createObjectURLが使えないため、data URLを使用
  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
  const filename = `browser-toolkit-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;

  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true,
  });
}
