import { Result } from "@praha/byethrow";
import type {
  DebugLogRequest,
  RuntimeSendResponse,
} from "@/background/runtime_types";
import { t } from "@/i18n";
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
            : t("background.debug.downloadFailed")
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
            : t("background.debug.clearFailed")
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
        error:
          error instanceof Error
            ? error.message
            : t("background.debug.statsFailed"),
        ok: false,
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
      sendResponse({ logs, ok: true });
    })
    .catch((error) => {
      sendResponse({
        error:
          error instanceof Error
            ? error.message
            : t("background.debug.getLogsFailed"),
        ok: false,
      });
    });
  return true;
}

export const debugRuntimeHandlers = {
  clearDebugLogs: handleClearDebugLogsRequest,
  downloadDebugLogs: handleDownloadDebugLogsRequest,
  getDebugLogStats: handleGetDebugLogStatsRequest,
  getDebugLogs: handleGetDebugLogsRequest,
} as const;
