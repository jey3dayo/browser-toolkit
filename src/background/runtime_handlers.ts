import { Result } from "@praha/byethrow";
import {
  executeEventAction,
  executePromptAction,
} from "@/background/action_executor";
import {
  buildGoogleCalendarUrl,
  buildGoogleCalendarUrlFailureMessage,
  formatEventText,
} from "@/background/calendar";
import { loadContextActions } from "@/background/context_menu_storage";
import { sendMessageToTab } from "@/background/messaging";
import {
  extractEventWithOpenAI,
  summarizeWithOpenAI,
  testAiToken,
  testOpenAiToken,
} from "@/background/openai";
import { debugRuntimeHandlers } from "@/background/runtime_debug_handlers";
import type {
  RuntimeSendResponse,
  SummarizeEventRequest,
  SummarizeTextRequest,
} from "@/background/runtime_types";
import type {
  BackgroundRequest,
  ContentScriptMessage,
  RunContextActionResponse,
  RunContextActionSuccessPayload,
  SummarizeEventResponse,
  SummaryTarget,
} from "@/background/types";
import type { ContextAction } from "@/context_actions";
import { debugLog } from "@/utils/debug_log";
import { showErrorNotification } from "@/utils/notifications";

type RunContextActionHandlerOptions<T> = {
  execute: () => Promise<Result.Result<T, string>>;
  mapSuccess: (value: T) => RunContextActionSuccessPayload;
  onFailure?: (error: string) => Promise<void> | void;
  sendResponse: (response: RunContextActionResponse) => void;
};

async function handleRunContextActionResult<T>(
  options: RunContextActionHandlerOptions<T>
): Promise<void> {
  const result = await options.execute();

  if (Result.isFailure(result)) {
    await options.onFailure?.(result.error);
    options.sendResponse(Result.fail(result.error));
    return;
  }

  options.sendResponse(Result.succeed(options.mapSuccess(result.value)));
}

// Helper function for handling event actions in message listener
async function handleEventActionInMessage(
  tabId: number,
  target: SummaryTarget,
  action: ContextAction,
  sendResponse: (response: RunContextActionResponse) => void,
  source?: "popup" | "contextMenu"
): Promise<void> {
  await handleRunContextActionResult({
    execute: () => executeEventAction({ target, action }),
    mapSuccess: (value) => ({
      resultType: "event",
      eventText: value.eventText,
      source: value.source,
    }),
    onFailure: async (error) => {
      // コンテキストメニューからの実行の場合はOS通知を表示
      if (source === "contextMenu") {
        await showErrorNotification({
          title: `${action.title}に失敗しました`,
          errorMessage: error,
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
          primary: error,
          secondary: tokenHintBase,
        }).catch(() => {
          // no-op
        });
      }
    },
    sendResponse,
  });
}

// Helper function for handling prompt actions in message listener
async function handlePromptActionInMessage(
  target: SummaryTarget,
  action: ContextAction,
  sendResponse: (response: RunContextActionResponse) => void,
  _source?: "popup" | "contextMenu"
): Promise<void> {
  await handleRunContextActionResult({
    execute: () => executePromptAction({ target, action }),
    mapSuccess: (value) => ({
      resultType: "text",
      text: value.text,
      source: value.source,
    }),
    sendResponse,
  });
}

async function handleSummarizeEventInMessage(
  target: SummaryTarget,
  sendResponse: (response: SummarizeEventResponse) => void
): Promise<void> {
  const result = await extractEventWithOpenAI(target);
  if (Result.isFailure(result)) {
    sendResponse(Result.fail(result.error));
    return;
  }

  const eventText = formatEventText(result.value);
  const calendarUrl = buildGoogleCalendarUrl(result.value) ?? undefined;
  const calendarError = calendarUrl
    ? undefined
    : buildGoogleCalendarUrlFailureMessage(result.value);
  sendResponse(
    Result.succeed({
      event: result.value,
      eventText,
      calendarUrl,
      calendarError,
    })
  );
}

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
        sendResponse(
          Result.fail(
            "アクションが見つかりません（ポップアップで再保存してください）"
          )
        );
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
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : "アクションの実行に失敗しました"
        )
      );
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
      if (Result.isFailure(result)) {
        sendResponse(Result.fail(result.error));
        return;
      }
      sendResponse(Result.succeed({}));
    } catch (error) {
      await debugLog(
        "handleTestOpenAiTokenRequest",
        "Failed to test OpenAI token",
        { error, request },
        "error"
      );
      sendResponse(
        Result.fail(
          error instanceof Error ? error.message : "トークン確認に失敗しました"
        )
      );
    }
  })();
  return true;
}

function handleTestAiTokenRequest(
  request: { action: "testAiToken"; token?: string },
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    try {
      const result = await testAiToken(request.token);
      if (Result.isFailure(result)) {
        sendResponse(Result.fail(result.error));
        return;
      }
      sendResponse(Result.succeed({}));
    } catch (error) {
      await debugLog(
        "handleTestAiTokenRequest",
        "Failed to test AI token",
        { error, request },
        "error"
      );
      sendResponse(
        Result.fail(
          error instanceof Error ? error.message : "トークン確認に失敗しました"
        )
      );
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

export const runtimeHandlers = {
  summarizeTab: handleSummarizeTabRequest,
  summarizeText: handleSummarizeTextRequest,
  runContextAction: handleRunContextActionRequest,
  testOpenAiToken: handleTestOpenAiTokenRequest,
  testAiToken: handleTestAiTokenRequest,
  summarizeEvent: handleSummarizeEventRequest,
  openPopupSettings: handleOpenPopupSettingsRequest,
  ...debugRuntimeHandlers,
} as const;
