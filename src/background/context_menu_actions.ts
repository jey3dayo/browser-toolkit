import { Result } from "@praha/byethrow";
import { APP_NAME } from "@/app_meta";
import { executeContextAction } from "@/background/action_executor";
import { buildCalendarArtifacts } from "@/background/calendar";
import { sendMessageToTab } from "@/background/messaging";
import { extractEventWithOpenAI } from "@/background/openai";
import { storageSyncGet } from "@/background/storage";
import type {
  ContentScriptMessage,
  ContextMenuTabParams,
  SummaryTarget,
  SyncStorageData,
} from "@/background/types";
import type { ContextAction } from "@/context_actions";
import { t } from "@/i18n";
import type { CalendarRegistrationTarget, SummarySource } from "@/shared_types";
import { resolveCalendarTargets } from "@/utils/calendar_targets";
import { showErrorNotification } from "@/utils/notifications";

type ContextMenuSelectionContext = {
  selection: string;
  initialSource: SummarySource;
  selectionSecondary: string | undefined;
};

type ContextMenuClickParams = ContextMenuTabParams & {
  info: chrome.contextMenus.OnClickData;
};

type ContextMenuActionClickParams = ContextMenuClickParams & {
  actionId: string;
};

type ContextMenuTargetParams = ContextMenuTabParams & {
  selection: string;
};

function buildSelectionSecondary(selection: string): string | undefined {
  const trimmed = selection.trim();
  if (!trimmed) {
    return;
  }

  const clipped =
    trimmed.length > 4000 ? `${trimmed.slice(0, 4000)}…` : trimmed;
  return t("background.contextActions.selectionPrefix", { text: clipped });
}

export function buildContextMenuSelectionContext(
  info: chrome.contextMenus.OnClickData
): ContextMenuSelectionContext {
  const selection = info.selectionText?.trim() ?? "";
  const initialSource: SummarySource = selection ? "selection" : "page";
  const selectionSecondary = buildSelectionSecondary(selection);
  return { initialSource, selection, selectionSecondary };
}

function titleSuffixBySource(source: SummarySource): string {
  return source === "selection"
    ? t("background.contextActions.source.selection")
    : t("background.contextActions.source.page");
}

async function showContextActionNotFoundOverlay(
  tabId: number,
  source: SummarySource
): Promise<void> {
  await sendMessageToTab(tabId, {
    action: "showActionOverlay",
    mode: "text",
    primary: t("background.contextActions.actionMissing"),
    source,
    status: "error",
    title: APP_NAME,
  });
}

async function showContextActionLoadingOverlay(
  tabId: number,
  action: ContextAction,
  context: ContextMenuSelectionContext
): Promise<void> {
  const titleSuffix = titleSuffixBySource(context.initialSource);
  await sendMessageToTab(tabId, {
    action: "showActionOverlay",
    mode: action.kind === "event" ? "event" : "text",
    secondary: context.selectionSecondary,
    source: context.initialSource,
    status: "loading",
    title: `${action.title}（${titleSuffix}）`,
  });
}

async function resolveTargetFromContextMenuClick(
  params: ContextMenuTargetParams
): Promise<SummaryTarget> {
  if (params.selection) {
    return {
      source: "selection",
      text: params.selection,
      title: params.tab?.title,
      url: params.tab?.url,
    };
  }

  return await sendMessageToTab(params.tabId, {
    action: "getSummaryTargetText",
    ignoreSelection: true,
  });
}

function buildResolvedTitle(
  action: ContextAction,
  source: SummarySource
): string {
  const resolvedSuffix = titleSuffixBySource(source);
  return `${action.title}（${resolvedSuffix}）`;
}

export async function showContextMenuUnexpectedErrorOverlay(
  tabId: number,
  source: SummarySource,
  error: unknown
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message
      : t("background.contextActions.summarizeFailed");
  await sendMessageToTab(tabId, {
    action: "showActionOverlay",
    mode: "text",
    primary: message,
    source,
    status: "error",
    title: APP_NAME,
  }).catch(() => {
    // コンテンツスクリプトに送れないページでは、黙って諦める
  });
}

export async function handleCalendarContextMenuClick(
  params: ContextMenuClickParams
): Promise<void> {
  const context = buildContextMenuSelectionContext(params.info);
  const initialSuffix = titleSuffixBySource(context.initialSource);
  const initialTitle = t("background.contextActions.calendarInitialTitle", {
    source: initialSuffix,
  });

  await sendMessageToTab(params.tabId, {
    action: "showActionOverlay",
    mode: "event",
    secondary: context.selectionSecondary,
    source: context.initialSource,
    status: "loading",
    title: initialTitle,
  } satisfies ContentScriptMessage);

  const target = await resolveTargetFromContextMenuClick({
    selection: context.selection,
    tab: params.tab,
    tabId: params.tabId,
  });
  const resolvedTitle = t("background.contextActions.calendarInitialTitle", {
    source: titleSuffixBySource(target.source),
  });

  const result = await extractEventWithOpenAI(target);
  if (Result.isFailure(result)) {
    await showErrorNotification({
      errorMessage: result.error,
      title: t("background.contextActions.calendarFailedTitle"),
    });

    await sendMessageToTab(params.tabId, {
      action: "showActionOverlay",
      mode: "event",
      primary: result.error,
      secondary: context.selectionSecondary,
      source: target.source,
      status: "error",
      title: resolvedTitle,
    } satisfies ContentScriptMessage).catch(() => {
      // no-op
    });
    return;
  }

  const calendarTargets = await loadCalendarTargets();
  if (calendarTargets.length === 0) {
    await sendMessageToTab(params.tabId, {
      action: "showNotification",
      message: t("background.contextActions.calendarTargetMissing"),
    } satisfies ContentScriptMessage).catch(() => {
      // no-op
    });
  }

  const artifacts = buildCalendarArtifacts(result.value, calendarTargets);
  if (artifacts.errors.length > 0) {
    await sendMessageToTab(params.tabId, {
      action: "showNotification",
      message: artifacts.errors.join("\n"),
    } satisfies ContentScriptMessage).catch(() => {
      // no-op
    });
  }

  await sendMessageToTab(params.tabId, {
    action: "showActionOverlay",
    calendarUrl: artifacts.calendarUrl,
    event: result.value,
    ics: artifacts.ics,
    mode: "event",
    primary: artifacts.eventText,
    secondary: context.selectionSecondary,
    source: target.source,
    status: "ready",
    title: resolvedTitle,
  } satisfies ContentScriptMessage);
}

export async function handleContextMenuClick(
  params: ContextMenuActionClickParams,
  actions: ContextAction[]
): Promise<void> {
  const context = buildContextMenuSelectionContext(params.info);
  const action = actions.find((item) => item.id === params.actionId);
  if (!action) {
    await showContextActionNotFoundOverlay(params.tabId, context.initialSource);
    return;
  }

  await showContextActionLoadingOverlay(params.tabId, action, context);

  const target = await resolveTargetFromContextMenuClick({
    selection: context.selection,
    tab: params.tab,
    tabId: params.tabId,
  });
  const resolvedTitle = buildResolvedTitle(action, target.source);

  const result = await executeContextAction({ action, target });
  if (Result.isFailure(result)) {
    await showErrorNotification({
      errorMessage: result.error,
      title: t("background.contextActions.actionFailedTitle", {
        title: action.title,
      }),
    });

    await sendMessageToTab(params.tabId, {
      action: "showActionOverlay",
      mode: action.kind,
      primary: result.error,
      secondary: context.selectionSecondary,
      source: target.source,
      status: "error",
      title: resolvedTitle,
    }).catch(() => {
      // no-op
    });
    return;
  }

  const output = result.value;
  await sendMessageToTab(params.tabId, {
    action: "showActionOverlay",
    ...(output.kind === "event" ? { event: output.event } : {}),
    mode: output.kind,
    primary: output.text,
    secondary: context.selectionSecondary,
    source: output.source,
    status: "ready",
    title: resolvedTitle,
  });
}

async function loadCalendarTargets(): Promise<CalendarRegistrationTarget[]> {
  const stored = (await storageSyncGet(["calendarTargets"])) as SyncStorageData;
  return resolveCalendarTargets(stored.calendarTargets);
}
