import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useState } from "react";
import { safeParse } from "valibot";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { sendBackgroundResult } from "@/popup/utils/background_result";
import {
  DebugLogStatsResponseSchema,
  DebugLogsResponseSchema,
} from "@/schemas/debug_log";
import type { LocalStorageData } from "@/storage/types";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

type LogStats = {
  entryCount: number;
  sizeKB: string;
};

export type UseDebugLogsResult = {
  debugMode: boolean;
  logStats: LogStats | null;
  showLogs: boolean;
  logContent: string;
  handleToggleDebugMode: (checked: boolean) => void;
  handleShowLogsClick: () => void;
  handleDownloadLogsClick: () => void;
  handleClearLogsClick: () => void;
  handleHideLogsClick: () => void;
};

export function useDebugLogs(props: PopupPaneBaseProps): UseDebugLogsResult {
  const { runtime, notify } = props;
  const [debugMode, setDebugMode] = useState(false);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logContent, setLogContent] = useState("");

  const loadLogStats = useCallback(async (): Promise<void> => {
    const result = await runtime.sendMessageToBackground<
      { action: "getDebugLogStats" },
      unknown
    >({
      action: "getDebugLogStats",
    });

    if (Result.isFailure(result)) {
      notify.error(t("debug.errors.statsLoadFailed"));
      return;
    }
    const parsed = safeParse(DebugLogStatsResponseSchema, result.value);
    if (!parsed.success) {
      notify.error(t("debug.errors.statsLoadFailed"));
      return;
    }
    setLogStats({
      entryCount: parsed.output.entryCount,
      sizeKB: parsed.output.sizeKB,
    });
  }, [notify, runtime]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await runtime.storageLocalGet(["debugMode"]);
      if (Result.isFailure(loaded) || cancelled) {
        return;
      }
      const raw: Partial<LocalStorageData> = loaded.value;
      const nextDebugMode = raw.debugMode ?? false;
      setDebugMode(nextDebugMode);
      if (nextDebugMode) {
        await loadLogStats();
      }
    })().catch(async (error) => {
      try {
        await debugLog(
          "DebugPane.useEffect[props.runtime]",
          "failed",
          { error: formatErrorLog("", {}, error) },
          "error"
        );
      } catch {
        // no-op
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadLogStats, runtime]);

  const loadAndShowLogs = async (): Promise<void> => {
    const result = await runtime.sendMessageToBackground<
      { action: "getDebugLogs" },
      unknown
    >({
      action: "getDebugLogs",
    });

    if (Result.isFailure(result)) {
      notify.error(t("debug.errors.loadFailed"));
      return;
    }
    const parsed = safeParse(DebugLogsResponseSchema, result.value);
    if (!parsed.success) {
      notify.error(t("debug.errors.loadFailed"));
      return;
    }
    const formatted = parsed.output.logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.context}] ${log.message}${
            log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : ""
          }`
      )
      .join("\n\n");
    setLogContent(formatted);
    setShowLogs(true);
  };

  const toggleDebugMode = async (checked: boolean): Promise<void> => {
    const saved = await runtime.storageLocalSet({ debugMode: checked });
    if (Result.isSuccess(saved)) {
      setDebugMode(checked);
      notify.success(t("debug.success.saved"));

      // ログ統計を更新
      if (checked) {
        await loadLogStats();
      } else {
        setLogStats(null);
        setShowLogs(false);
      }
      return;
    }
    notify.error(t("debug.errors.saveFailed"));
  };

  const runDebugAction = async (
    action: "downloadDebugLogs" | "clearDebugLogs"
  ): Promise<boolean> => {
    const result = await sendBackgroundResult({
      message: { action },
      onError: notify.error,
      runtime,
      // downloadDebugLogs はユーザーのファイル保存ダイアログを待つため
      // タイムアウトを無効化
      timeoutMs: action === "downloadDebugLogs" ? null : undefined,
    });
    return result !== null;
  };

  const downloadLogs = async (): Promise<void> => {
    const ok = await runDebugAction("downloadDebugLogs");
    if (ok) {
      notify.success(t("debug.success.downloaded"));
    }
  };

  const clearLogs = async (): Promise<void> => {
    const ok = await runDebugAction("clearDebugLogs");
    if (!ok) {
      return;
    }
    setLogStats(null);
    setShowLogs(false);
    setLogContent("");
    notify.success(t("debug.success.cleared"));
  };

  const handleToggleDebugMode = useCallback(
    (checked: boolean) => {
      toggleDebugMode(checked).catch(() => {
        // no-op
      });
    },
    [toggleDebugMode]
  );

  const handleShowLogsClick = useCallback(() => {
    loadAndShowLogs().catch(async (error) => {
      try {
        await debugLog(
          "DebugPane.loadAndShowLogs",
          "failed",
          { error: formatErrorLog("", {}, error) },
          "error"
        );
      } catch {
        // no-op
      }
      notify.error(t("debug.errors.loadFailed"));
    });
  }, [loadAndShowLogs, notify]);

  const handleDownloadLogsClick = useCallback(() => {
    downloadLogs().catch(() => {
      // no-op
    });
  }, [downloadLogs]);

  const handleClearLogsClick = useCallback(() => {
    clearLogs().catch(() => {
      // no-op
    });
  }, [clearLogs]);

  const handleHideLogsClick = useCallback(() => {
    setShowLogs(false);
  }, []);

  return {
    debugMode,
    handleClearLogsClick,
    handleDownloadLogsClick,
    handleHideLogsClick,
    handleShowLogsClick,
    handleToggleDebugMode,
    logContent,
    logStats,
    showLogs,
  };
}
