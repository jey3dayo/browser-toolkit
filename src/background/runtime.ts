import { Result } from "@praha/byethrow";
import {
  buildGoogleCalendarUrl,
  buildGoogleCalendarUrlFailureMessage,
  formatEventText,
} from "@/background/calendar";
import { loadContextActions } from "@/background/context_menu_registry";
import { sendMessageToTab } from "@/background/messaging";
import {
  extractEventWithOpenAI,
  renderInstructionTemplate,
  runPromptActionWithOpenAI,
  summarizeWithOpenAI,
  testOpenAiToken,
} from "@/background/openai";
import type {
  BackgroundRequest,
  BackgroundResponse,
  ContentScriptMessage,
  RunContextActionResponse,
  SummaryTarget,
} from "@/background/types";
import type { ContextAction } from "@/context_actions";
import type { ExtractedEvent } from "@/shared_types";
import {
  clearDebugLogs,
  debugLog,
  downloadDebugLogs,
  getDebugLogStats,
  getDebugLogs,
} from "@/utils/debug_log";
import { showErrorNotification } from "@/utils/notifications";

// Helper function for handling event actions in message listener
async function handleEventActionInMessage(
  tabId: number,
  target: SummaryTarget,
  action: ContextAction,
  sendResponse: (response: RunContextActionResponse) => void,
  source?: "popup" | "contextMenu"
): Promise<void> {
  const extraInstruction = action.prompt?.trim()
    ? renderInstructionTemplate(action.prompt, target)
    : undefined;
  const result = await extractEventWithOpenAI(target, extraInstruction);

  if (!result.ok) {
    // コンテキストメニューからの実行の場合はOS通知を表示
    if (source === "contextMenu") {
      await showErrorNotification({
        title: `${action.title}に失敗しました`,
        errorMessage: result.error,
        hint: "OpenAI API Tokenが未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。",
      });

      const tokenHintBase =
        "OpenAI API Token未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。";
      await sendMessageToTab(tabId, {
        action: "showActionOverlay",
        status: "error",
        mode: "event",
        source: target.source,
        title: action.title,
        primary: result.error,
        secondary: tokenHintBase,
      }).catch(() => {
        // no-op
      });
    }

    sendResponse(result);
    return;
  }

  const eventText = formatEventText(result.event);
  sendResponse({
    ok: true,
    resultType: "event",
    eventText,
    source: target.source,
  });
}

// Helper function for handling prompt actions in message listener
async function handlePromptActionInMessage(
  target: SummaryTarget,
  action: ContextAction,
  sendResponse: (response: RunContextActionResponse) => void,
  _source?: "popup" | "contextMenu"
): Promise<void> {
  const prompt = action.prompt.trim();
  if (!prompt) {
    sendResponse({ ok: false, error: "プロンプトが空です" });
    return;
  }

  const result = await runPromptActionWithOpenAI(target, prompt);
  if (Result.isFailure(result)) {
    sendResponse({ ok: false, error: result.error });
    return;
  }

  sendResponse({
    ok: true,
    resultType: "text",
    text: result.value,
    source: target.source,
  });
}

async function handleSummarizeEventInMessage(
  target: SummaryTarget,
  sendResponse: (
    response:
      | { ok: false; error: string }
      | {
          ok: true;
          event: ExtractedEvent;
          eventText: string;
          calendarUrl?: string;
          calendarError?: string;
        }
  ) => void
): Promise<void> {
  const result = await extractEventWithOpenAI(target);
  if (!result.ok) {
    sendResponse(result);
    return;
  }

  const eventText = formatEventText(result.event);
  const calendarUrl = buildGoogleCalendarUrl(result.event) ?? undefined;
  const calendarError = calendarUrl
    ? undefined
    : buildGoogleCalendarUrlFailureMessage(result.event);
  sendResponse({
    ok: true,
    event: result.event,
    eventText,
    calendarUrl,
    calendarError,
  });
}

type RuntimeRequest =
  | BackgroundRequest
  | { action: "summarizeText"; target: SummaryTarget }
  | { action: "testOpenAiToken"; token?: string }
  | { action: "summarizeEvent"; target: SummaryTarget }
  | { action: "openPopupSettings" }
  | { action: "downloadDebugLogs" }
  | { action: "clearDebugLogs" }
  | { action: "getDebugLogStats" }
  | { action: "getDebugLogs" };

type RuntimeResponse =
  | BackgroundResponse
  | RunContextActionResponse
  | { ok: true }
  | { ok: false; error: string }
  | {
      ok: true;
      event: ExtractedEvent;
      eventText: string;
      calendarUrl?: string;
      calendarError?: string;
    }
  | {
      ok: true;
      logs: Array<{
        timestamp: string;
        level: string;
        context: string;
        message: string;
        data?: unknown;
      }>;
    }
  | {
      ok: true;
      entryCount: number;
      sizeBytes: number;
      sizeKB: string;
    };

type RuntimeSendResponse = (response?: RuntimeResponse) => void;

type SummarizeTextRequest = Extract<
  RuntimeRequest,
  { action: "summarizeText" }
>;
type SummarizeEventRequest = Extract<
  RuntimeRequest,
  { action: "summarizeEvent" }
>;

function handleSummarizeTabRequest(
  request: { action: "summarizeTab"; tabId: number },
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    try {
      const target = await sendMessageToTab<
        ContentScriptMessage,
        SummaryTarget
      >(request.tabId, {
        action: "getSummaryTargetText",
        ignoreSelection: true,
      });

      const result = await summarizeWithOpenAI(target);
      sendResponse(result);
    } catch (error) {
      await debugLog(
        "handleSummarizeTabRequest",
        "Failed to summarize tab",
        { error, request },
        "error"
      );
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "要約に失敗しました",
      });
    }
  })();
  return true;
}

function handleSummarizeTextRequest(
  request: SummarizeTextRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    try {
      const result = await summarizeWithOpenAI(request.target);
      sendResponse(result);
    } catch (error) {
      await debugLog(
        "handleSummarizeTextRequest",
        "Failed to summarize text",
        { error, request },
        "error"
      );
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "要約に失敗しました",
      });
    }
  })();
  return true;
}

function handleRunContextActionRequest(
  request: BackgroundRequest & { action: "runContextAction" },
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    try {
      const target =
        request.target ??
        (await sendMessageToTab<ContentScriptMessage, SummaryTarget>(
          request.tabId,
          { action: "getSummaryTargetText" }
        ));

      const actions = await loadContextActions();
      const action = actions.find((item) => item.id === request.actionId);
      if (!action) {
        sendResponse({
          ok: false,
          error:
            "アクションが見つかりません（ポップアップで再保存してください）",
        });
        return;
      }

      if (action.kind === "event") {
        await handleEventActionInMessage(
          request.tabId,
          target,
          action,
          sendResponse,
          request.source
        );
      } else {
        await handlePromptActionInMessage(
          target,
          action,
          sendResponse,
          request.source
        );
      }
    } catch (error) {
      await debugLog(
        "handleRunContextActionRequest",
        "Failed to run context action",
        { error, request },
        "error"
      );
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "アクションの実行に失敗しました",
      });
    }
  })();
  return true;
}

function handleTestOpenAiTokenRequest(
  request: { action: "testOpenAiToken"; token?: string },
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    try {
      const result = await testOpenAiToken(request.token);
      sendResponse(result);
    } catch (error) {
      await debugLog(
        "handleTestOpenAiTokenRequest",
        "Failed to test OpenAI token",
        { error, request },
        "error"
      );
      sendResponse({
        ok: false,
        error:
          error instanceof Error ? error.message : "トークン確認に失敗しました",
      });
    }
  })();
  return true;
}

function handleSummarizeEventRequest(
  request: SummarizeEventRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  handleSummarizeEventInMessage(request.target, sendResponse).catch(
    async (error) => {
      await debugLog(
        "handleSummarizeEventRequest",
        "Failed to summarize event",
        { error, request },
        "error"
      );
      sendResponse({
        ok: false,
        error:
          error instanceof Error ? error.message : "イベント要約に失敗しました",
      });
    }
  );
  return true;
}

function handleOpenPopupSettingsRequest(
  _request: { action: "openPopupSettings" },
  sendResponse: RuntimeSendResponse
): boolean {
  chrome.tabs
    .create({
      url: chrome.runtime.getURL("popup.html#pane-settings"),
    })
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch(() => {
      sendResponse({ ok: false, error: "設定画面を開けませんでした" });
    });
  return true;
}

function handleDownloadDebugLogsRequest(
  _request: { action: "downloadDebugLogs" },
  sendResponse: RuntimeSendResponse
): boolean {
  downloadDebugLogs()
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "デバッグログのダウンロードに失敗しました",
      });
    });
  return true;
}

function handleClearDebugLogsRequest(
  _request: { action: "clearDebugLogs" },
  sendResponse: RuntimeSendResponse
): boolean {
  clearDebugLogs()
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "デバッグログのクリアに失敗しました",
      });
    });
  return true;
}

function handleGetDebugLogStatsRequest(
  _request: { action: "getDebugLogStats" },
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
  _request: { action: "getDebugLogs" },
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

const runtimeHandlers = {
  summarizeTab: handleSummarizeTabRequest,
  summarizeText: handleSummarizeTextRequest,
  runContextAction: handleRunContextActionRequest,
  testOpenAiToken: handleTestOpenAiTokenRequest,
  summarizeEvent: handleSummarizeEventRequest,
  openPopupSettings: handleOpenPopupSettingsRequest,
  downloadDebugLogs: handleDownloadDebugLogsRequest,
  clearDebugLogs: handleClearDebugLogsRequest,
  getDebugLogStats: handleGetDebugLogStatsRequest,
  getDebugLogs: handleGetDebugLogsRequest,
} as const;

export function registerRuntimeMessageHandlers(): void {
  chrome.runtime.onMessage.addListener(
    (
      request: RuntimeRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: RuntimeSendResponse
    ) => {
      const handler =
        runtimeHandlers[request.action as keyof typeof runtimeHandlers];
      if (!handler) {
        return true;
      }
      return handler(request as never, sendResponse);
    }
  );
}
