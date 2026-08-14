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
  chatFollowUpWithOpenAI,
  extractEventWithOpenAI,
  summarizeWithOpenAI,
  testAiToken,
} from "@/background/openai";
import { debugRuntimeHandlers } from "@/background/runtime_debug_handlers";
import type {
  ChatFollowUpRequest,
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
import { t } from "@/i18n";
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
    execute: () => executeEventAction({ action, target }),
    mapSuccess: (value) => ({
      eventText: value.eventText,
      resultType: "event",
      source: value.source,
    }),
    onFailure: async (error) => {
      // コンテキストメニューからの実行の場合はOS通知を表示
      if (source === "contextMenu") {
        await showErrorNotification({
          errorMessage: error,
          hint: t("background.runtime.tokenHint"),
          title: t("background.runtime.actionFailedTitle", {
            title: action.title,
          }),
        });

        const tokenHintBase = t("background.runtime.tokenHint");
        await sendMessageToTab(tabId, {
          action: "showActionOverlay",
          mode: "event",
          primary: error,
          secondary: tokenHintBase,
          source: target.source,
          status: "error",
          title: action.title,
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
    execute: () => executePromptAction({ action, target }),
    mapSuccess: (value) => ({
      resultType: "text",
      source: value.source,
      text: value.text,
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
      calendarError,
      calendarUrl,
      event: result.value,
      eventText,
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
        error:
          error instanceof Error
            ? error.message
            : t("background.runtime.summarizeFailed"),
        ok: false,
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
        error:
          error instanceof Error
            ? error.message
            : t("background.runtime.summarizeFailed"),
        ok: false,
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
        sendResponse(Result.fail(t("background.runtime.actionMissing")));
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
            : t("background.runtime.actionFailed")
        )
      );
    }
  })();
  return true;
}

function handleTestAiTokenRequest(
  request: { action: "testAiToken" | "testOpenAiToken"; token?: string },
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
        {
          action: request.action,
          error,
          hasToken: typeof request.token === "string",
        },
        "error"
      );
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : t("background.runtime.tokenTestFailed")
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
        error:
          error instanceof Error
            ? error.message
            : t("background.runtime.eventSummaryFailed"),
        ok: false,
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
      sendResponse({
        error: t("background.runtime.openSettingsFailed"),
        ok: false,
      });
    });
  return true;
}

function handleChatFollowUpRequest(
  request: ChatFollowUpRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    try {
      const result = await chatFollowUpWithOpenAI(
        request.messages,
        request.context
      );
      if (Result.isFailure(result)) {
        sendResponse(Result.fail(result.error));
        return;
      }
      sendResponse(Result.succeed({ text: result.value }));
    } catch (error) {
      await debugLog(
        "handleChatFollowUpRequest",
        "Failed to chat follow up",
        { error, request },
        "error"
      );
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : t("background.runtime.chatFailed")
        )
      );
    }
  })();
  return true;
}

export const runtimeHandlers = {
  chatFollowUp: handleChatFollowUpRequest,
  openPopupSettings: handleOpenPopupSettingsRequest,
  runContextAction: handleRunContextActionRequest,
  summarizeEvent: handleSummarizeEventRequest,
  summarizeTab: handleSummarizeTabRequest,
  summarizeText: handleSummarizeTextRequest,
  testAiToken: handleTestAiTokenRequest,
  testOpenAiToken: handleTestAiTokenRequest,
  ...debugRuntimeHandlers,
} as const;
