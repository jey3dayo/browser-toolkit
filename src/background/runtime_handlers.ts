import { Result } from "@praha/byethrow";
import { executeContextAction } from "@/background/action_executor";
import { chatFollowUpWithAi, testAiToken } from "@/background/ai_requests";
import { extractCalendarArtifacts } from "@/background/calendar_extraction";
import { loadContextActions } from "@/background/context_menu_storage";
import { sendMessageToTab } from "@/background/messaging";
import { chatGptRuntimeHandlers } from "@/background/runtime_chatgpt_handlers";
import { debugRuntimeHandlers } from "@/background/runtime_debug_handlers";
import { searchBlocklistRuntimeHandlers } from "@/background/runtime_search_blocklist_handlers";
import type {
  ChatFollowUpRequest,
  DownloadImageRequest,
  OpenPopupPaneRequest,
  RuntimeSendResponse,
  SummarizeEventRequest,
} from "@/background/runtime_types";
import type {
  BackgroundRequest,
  ContentScriptMessage,
  RunContextActionSuccessPayload,
  SummarizeEventResponse,
  SummaryTarget,
} from "@/background/types";
import { t } from "@/i18n";
import {
  parseDownloadImageRequest,
  validateTwimgMediaUrl,
} from "@/image-zoom/download-url";
import { coercePaneId, getPaneSurfacePage } from "@/popup/panes";
import { debugLog } from "@/utils/debug_log";
import { showErrorNotification } from "@/utils/notifications";

async function handleSummarizeEventInMessage(
  target: SummaryTarget,
  sendResponse: (response: SummarizeEventResponse) => void
): Promise<void> {
  const result = await extractCalendarArtifacts({
    target,
    targets: ["google"],
  });
  if (Result.isFailure(result)) {
    sendResponse(Result.fail(result.error));
    return;
  }

  const { event, eventText, calendarUrl, errors } = result.value;
  const calendarError = calendarUrl ? undefined : errors[0];
  sendResponse(
    Result.succeed({
      calendarError,
      calendarUrl,
      event,
      eventText,
    })
  );
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

      const result = await executeContextAction({ action, target });
      if (Result.isFailure(result)) {
        if (action.kind === "event" && request.source === "contextMenu") {
          const tokenHint = t("background.runtime.tokenHint");
          await showErrorNotification({
            errorMessage: result.error,
            hint: tokenHint,
            title: t("background.runtime.actionFailedTitle", {
              title: action.title,
            }),
          });

          await sendMessageToTab(request.tabId, {
            action: "showActionOverlay",
            mode: "event",
            primary: result.error,
            secondary: tokenHint,
            source: target.source,
            status: "error",
            title: action.title,
          }).catch(() => {
            // Best-effort overlay: the action error is already notified and returned below.
          });
        }
        sendResponse(Result.fail(result.error));
        return;
      }

      const output = result.value;
      // The runtime contract omits the structured event used by direct menu overlays.
      const payload: RunContextActionSuccessPayload =
        output.kind === "event"
          ? {
              eventText: output.text,
              resultType: "event",
              source: output.source,
            }
          : { resultType: "text", source: output.source, text: output.text };
      sendResponse(Result.succeed(payload));
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

function handleOpenPopupPaneRequest(
  request: OpenPopupPaneRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  const paneId = coercePaneId(request.paneId);
  chrome.tabs
    .create({
      url: chrome.runtime.getURL(`${getPaneSurfacePage(paneId)}#${paneId}`),
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
      const result = await chatFollowUpWithAi(
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

function handleDownloadImageRequest(
  request: DownloadImageRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  (async () => {
    const parsed = parseDownloadImageRequest(request);
    if (!parsed) {
      sendResponse(Result.fail(t("imageZoom.errors.downloadFailed")));
      return;
    }

    const validated = validateTwimgMediaUrl(parsed.url);
    if (Result.isFailure(validated)) {
      sendResponse(validated);
      return;
    }

    try {
      await chrome.downloads.download({
        filename: validated.value.filename,
        url: validated.value.originalUrl,
      });
      sendResponse(Result.succeed({}));
    } catch (error) {
      await debugLog(
        "handleDownloadImageRequest",
        "Failed to download image",
        { error, request },
        "error"
      );
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : t("imageZoom.errors.downloadFailed")
        )
      );
    }
  })();
  return true;
}

export const runtimeHandlers = {
  chatFollowUp: handleChatFollowUpRequest,
  downloadImage: handleDownloadImageRequest,
  openPopupPane: handleOpenPopupPaneRequest,
  runContextAction: handleRunContextActionRequest,
  summarizeEvent: handleSummarizeEventRequest,
  testAiToken: handleTestAiTokenRequest,
  testOpenAiToken: handleTestAiTokenRequest,
  ...chatGptRuntimeHandlers,
  ...searchBlocklistRuntimeHandlers,
  ...debugRuntimeHandlers,
} as const;
