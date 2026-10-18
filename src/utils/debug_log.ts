const DEBUG_LOG_KEY = "debugLogs";
const MAX_LOG_ENTRIES = 1000;

export type DebugLogEntry = {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  context: string;
  message: string;
  data?: unknown;
};

const SENSITIVE_KEY_PATTERN =
  /token|apikey|api_key|authorization|secret|password/i;

function redactSensitiveData(
  value: unknown,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return [];
    }
    seen.add(value);
    return value.map((v) => redactSensitiveData(v, seen));
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) {
      return "[REDACTED]";
    }
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) =>
        SENSITIVE_KEY_PATTERN.test(key)
          ? [
              key,
              typeof v === "string"
                ? `[REDACTED len=${v.length}]`
                : "[REDACTED]",
            ]
          : [key, redactSensitiveData(v, seen)]
      )
    );
  }
  return value;
}

function safeStringify(value: unknown): string {
  try {
    const json: string | undefined = JSON.stringify(value);
    return json ?? String(value);
  } catch {
    return "[unserializable data]";
  }
}

function formatConsoleMessage(entry: DebugLogEntry): string {
  const baseMessage = `[${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
  if (entry.data === undefined) {
    return baseMessage;
  }
  return `${baseMessage} ${safeStringify(entry.data)}`;
}

export async function debugLog(
  context: string,
  message: string,
  data?: unknown,
  level: "debug" | "info" | "warn" | "error" = "debug"
): Promise<void> {
  // テスト環境ではdebug/infoレベルのログを抑制
  // error/warnは重要な問題の検出のため出力を継続
  const isTest =
    (globalThis as unknown as { __MBU_IS_VITEST__?: boolean })
      .__MBU_IS_VITEST__ === true;
  if (isTest && (level === "debug" || level === "info")) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry: DebugLogEntry = {
    context,
    data: redactSensitiveData(data),
    level,
    message,
    timestamp,
  };

  const consoleMessage = formatConsoleMessage(logEntry);

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

  try {
    const stored = await new Promise<{ debugMode?: boolean }>((resolve) => {
      chrome.storage.local.get(["debugMode"], (result) => {
        resolve(result as { debugMode?: boolean });
      });
    });
    const debugMode = stored.debugMode === true;

    if (!debugMode) {
      return;
    }
  } catch (error) {
    console.error("Failed to check debug mode:", error);
    return;
  }

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

/** storage 失敗時は reject */
export async function getDebugLogs(): Promise<DebugLogEntry[]> {
  const stored = await chrome.storage.local.get([DEBUG_LOG_KEY]);
  return Array.isArray(stored[DEBUG_LOG_KEY]) ? stored[DEBUG_LOG_KEY] : [];
}

/** storage 失敗時は reject */
export async function clearDebugLogs(): Promise<void> {
  await chrome.storage.local.remove([DEBUG_LOG_KEY]);
}

/** storage 失敗時は reject */
export async function getDebugLogStats(): Promise<{
  entryCount: number;
  sizeBytes: number;
  sizeKB: string;
}> {
  const logs = await getDebugLogs();
  const content = JSON.stringify(logs);
  const sizeBytes = new Blob([content]).size;
  const sizeKB = (sizeBytes / 1024).toFixed(2);

  return {
    entryCount: logs.length,
    sizeBytes,
    sizeKB,
  };
}

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
    filename,
    saveAs: true,
    url: dataUrl,
  });
}
