import { Result } from "@praha/byethrow";
import { executeContextAction } from "@/background/action_executor";
import {
  chatFollowUpWithAi,
  extractEventWithAi,
  summarizeWithAi,
  testAiToken,
} from "@/background/ai_requests";
import {
  buildGoogleCalendarUrl,
  buildGoogleCalendarUrlFailureMessage,
  formatEventText,
} from "@/background/calendar";
import {
  getChatGptAuthState,
  signOutChatGpt,
  startChatGptSignIn,
} from "@/background/chatgpt_session";
import { loadContextActions } from "@/background/context_menu_storage";
import { sendMessageToTab } from "@/background/messaging";
import { debugRuntimeHandlers } from "@/background/runtime_debug_handlers";
import type {
  ChatFollowUpRequest,
  DownloadImageRequest,
  OpenPopupPaneRequest,
  RuntimeSendResponse,
  SearchBlocklistMutateRequest,
  SearchBlocklistMutateResponse,
  SummarizeEventRequest,
  SummarizeTextRequest,
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
import { searchBlocklistMutationFailureMessage } from "@/search-blocklist/mutation_failure_message";
import {
  applySearchBlocklistRuleMutation,
  partitionStoredSearchBlocklistRules,
  type SearchBlocklistRulePartition,
} from "@/search-blocklist/rules";
import { storageLocalGet, storageLocalSet } from "@/storage/helpers";
import { debugLog } from "@/utils/debug_log";
import { isRecord } from "@/utils/guards";
import { showErrorNotification } from "@/utils/notifications";

let mutationQueue: Promise<unknown> = Promise.resolve();
let searchBlocklistRevision = 0;

async function loadSearchBlocklistRules(
  op: SearchBlocklistMutateRequest["op"]
): Promise<Result.Result<SearchBlocklistRulePartition, string>> {
  const loaded = await storageLocalGet<unknown>(["searchBlocklistRules"]);
  if (Result.isFailure(loaded)) {
    return Result.fail(searchBlocklistMutationFailureMessage(op));
  }
  const stored = isRecord(loaded.value)
    ? loaded.value.searchBlocklistRules
    : undefined;
  return Result.succeed(partitionStoredSearchBlocklistRules(stored));
}

async function applySearchBlocklistMutation(
  request: SearchBlocklistMutateRequest
): Promise<SearchBlocklistMutateResponse> {
  const loaded = await loadSearchBlocklistRules(request.op);
  if (Result.isFailure(loaded)) {
    return loaded;
  }

  const mutated = applySearchBlocklistRuleMutation(loaded.value, {
    op: request.op,
    pattern: request.pattern,
    ruleId: request.ruleId,
    ruleIds: request.ruleIds,
  });
  if (Result.isFailure(mutated)) {
    return mutated;
  }

  const saved = await storageLocalSet({
    searchBlocklistRules: mutated.value.persisted,
  });
  if (Result.isFailure(saved)) {
    return Result.fail(searchBlocklistMutationFailureMessage(request.op));
  }

  searchBlocklistRevision += 1;
  return Result.succeed({
    revision: searchBlocklistRevision,
    rules: mutated.value.rules,
    skippedCount: mutated.value.skippedCount,
  });
}

async function handleSummarizeEventInMessage(
  target: SummaryTarget,
  sendResponse: (response: SummarizeEventResponse) => void
): Promise<void> {
  const result = await extractEventWithAi(target);
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

      const result = await summarizeWithAi(target);
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
      const result = await summarizeWithAi(request.target);
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

function handleOpenPopupSettingsRequest(
  _request: { action: "openPopupSettings" },
  sendResponse: RuntimeSendResponse
): boolean {
  return handleOpenPopupPaneRequest(
    { action: "openPopupPane", paneId: "pane-settings" },
    sendResponse
  );
}

function handleSearchBlocklistMutateRequest(
  request: SearchBlocklistMutateRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  const operation = mutationQueue.then(() =>
    applySearchBlocklistMutation(request)
  );
  mutationQueue = operation.catch(() => undefined);
  operation
    .then((result) => {
      sendResponse(result);
    })
    .catch((error: unknown) => {
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : searchBlocklistMutationFailureMessage(request.op)
        )
      );
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

async function failChatGptRequest(
  action: string,
  error: unknown,
  fallbackMessage: string,
  sendResponse: RuntimeSendResponse
): Promise<void> {
  await debugLog(
    "handleChatGptRequest",
    "ChatGPT request failed",
    { action, error },
    "error"
  );
  sendResponse(
    Result.fail(error instanceof Error ? error.message : fallbackMessage)
  );
}

function handleChatGptAuthStateRequest(
  _request: { action: "chatgptAuthState" },
  sendResponse: RuntimeSendResponse
): boolean {
  getChatGptAuthState()
    .then((state) => {
      sendResponse(Result.succeed(state));
    })
    .catch((error: unknown) =>
      failChatGptRequest(
        "chatgptAuthState",
        error,
        "ChatGPT のサインイン状態を取得できませんでした",
        sendResponse
      )
    );
  return true;
}

function handleChatGptSignInRequest(
  _request: { action: "chatgptSignIn" },
  sendResponse: RuntimeSendResponse
): boolean {
  startChatGptSignIn()
    .then((result) => {
      sendResponse(
        Result.isFailure(result)
          ? Result.fail(result.error)
          : Result.succeed({})
      );
    })
    .catch((error: unknown) =>
      failChatGptRequest(
        "chatgptSignIn",
        error,
        "サインインを開始できませんでした",
        sendResponse
      )
    );
  return true;
}

function handleChatGptSignOutRequest(
  _request: { action: "chatgptSignOut" },
  sendResponse: RuntimeSendResponse
): boolean {
  signOutChatGpt()
    .then((result) => {
      sendResponse(result);
    })
    .catch((error: unknown) =>
      failChatGptRequest(
        "chatgptSignOut",
        error,
        "サインアウトに失敗しました",
        sendResponse
      )
    );
  return true;
}

export const runtimeHandlers = {
  chatFollowUp: handleChatFollowUpRequest,
  chatgptAuthState: handleChatGptAuthStateRequest,
  chatgptSignIn: handleChatGptSignInRequest,
  chatgptSignOut: handleChatGptSignOutRequest,
  downloadImage: handleDownloadImageRequest,
  openPopupPane: handleOpenPopupPaneRequest,
  openPopupSettings: handleOpenPopupSettingsRequest,
  runContextAction: handleRunContextActionRequest,
  searchBlocklistMutate: handleSearchBlocklistMutateRequest,
  summarizeEvent: handleSummarizeEventRequest,
  summarizeTab: handleSummarizeTabRequest,
  summarizeText: handleSummarizeTextRequest,
  testAiToken: handleTestAiTokenRequest,
  testOpenAiToken: handleTestAiTokenRequest,
  ...debugRuntimeHandlers,
} as const;
