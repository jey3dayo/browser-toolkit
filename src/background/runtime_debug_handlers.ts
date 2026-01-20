import { Result } from "@praha/byethrow";
import type {
  DebugLogRequest,
  RuntimeSendResponse,
} from "@/background/runtime_types";
import {
  clearDebugLogs,
  downloadDebugLogs,
  getDebugLogStats,
  getDebugLogs,
} from "@/utils/debug_log";

function handleDownloadDebugLogsRequest(
  _request: DebugLogRequest<"downloadDebugLogs">,
  sendResponse: RuntimeSendResponse
): boolean {
  downloadDebugLogs()
    .then(() => {
      sendResponse(Result.succeed({}));
    })
    .catch((error) => {
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : "デバッグログのダウンロードに失敗しました"
        )
      );
    });
  return true;
}

function handleClearDebugLogsRequest(
  _request: DebugLogRequest<"clearDebugLogs">,
  sendResponse: RuntimeSendResponse
): boolean {
  clearDebugLogs()
    .then(() => {
      sendResponse(Result.succeed({}));
    })
    .catch((error) => {
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : "デバッグログのクリアに失敗しました"
        )
      );
    });
  return true;
}

function handleGetDebugLogStatsRequest(
  _request: DebugLogRequest<"getDebugLogStats">,
  sendResponse: RuntimeSendResponse
): boolean {
  getDebugLogStats()
    .then((stats) => {
      sendResponse({ ok: true, ...stats });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "デバッグログ統計の取得に失敗しました",
      });
    });
  return true;
}

function handleGetDebugLogsRequest(
  _request: DebugLogRequest<"getDebugLogs">,
  sendResponse: RuntimeSendResponse
): boolean {
  getDebugLogs()
    .then((logs) => {
      sendResponse({ ok: true, logs });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "デバッグログの取得に失敗しました",
      });
    });
  return true;
}

export const debugRuntimeHandlers = {
  downloadDebugLogs: handleDownloadDebugLogsRequest,
  clearDebugLogs: handleClearDebugLogsRequest,
  getDebugLogStats: handleGetDebugLogStatsRequest,
  getDebugLogs: handleGetDebugLogsRequest,
} as const;
