import { Result } from "@praha/byethrow";
import { APP_NAME } from "@/app_meta";
import {
  executeEventAction,
  executePromptAction,
} from "@/background/action_executor";
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
import type {
  CalendarRegistrationTarget,
  ExtractedEvent,
  SummarySource,
} from "@/shared_types";
import { resolveCalendarTargets } from "@/utils/calendar_targets";
import { showErrorNotification } from "@/utils/notifications";

// Helper functions to reduce cognitive complexity (extracted from context menu handler)
type OverlayContext = {
  tabId: number;
  action: ContextAction;
  target: SummaryTarget;
  resolvedTitle: string;
  selectionSecondary: string | undefined;
};

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
  return `選択範囲:\n${clipped}`;
}

export function buildContextMenuSelectionContext(
  info: chrome.contextMenus.OnClickData
): ContextMenuSelectionContext {
  const selection = info.selectionText?.trim() ?? "";
  const initialSource: SummarySource = selection ? "selection" : "page";
  const selectionSecondary = buildSelectionSecondary(selection);
  return { selection, initialSource, selectionSecondary };
}

function titleSuffixBySource(source: SummarySource): string {
  return source === "selection" ? "選択範囲" : "ページ本文";
}

async function showContextActionNotFoundOverlay(
  tabId: number,
  source: SummarySource
): Promise<void> {
  await sendMessageToTab(tabId, {
    action: "showActionOverlay",
    status: "error",
    mode: "text",
    source,
    title: APP_NAME,
    primary: "アクションが見つかりません（ポップアップで再保存してください）",
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
    status: "loading",
    mode: action.kind === "event" ? "event" : "text",
    source: context.initialSource,
    title: `${action.title}（${titleSuffix}）`,
    secondary: context.selectionSecondary,
  });
}

async function resolveTargetFromContextMenuClick(
  params: ContextMenuTargetParams
): Promise<SummaryTarget> {
  if (params.selection) {
    return {
      text: params.selection,
      source: "selection",
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

async function sendActionOverlayMessage(params: {
  tabId: number;
  status: "loading" | "ready" | "error";
  mode: "text" | "event";
  source: SummarySource;
  title: string;
  primary?: string;
  secondary?: string;
  event?: ExtractedEvent;
  calendarUrl?: string;
  ics?: string;
}): Promise<void> {
  await sendMessageToTab(params.tabId, {
    action: "showActionOverlay",
    status: params.status,
    mode: params.mode,
    source: params.source,
    title: params.title,
    primary: params.primary,
    secondary: params.secondary,
    event: params.event,
    calendarUrl: params.calendarUrl,
    ics: params.ics,
  });
}

async function reportPromptActionFailure(params: {
  tabId: number;
  actionTitle: string;
  source: SummarySource;
  resolvedTitle: string;
  errorMessage: string;
  selectionSecondary: string | undefined;
}): Promise<void> {
  await showErrorNotification({
    title: `${params.actionTitle}に失敗しました`,
    errorMessage: params.errorMessage,
  });

  await sendActionOverlayMessage({
    tabId: params.tabId,
    status: "error",
    mode: "text",
    source: params.source,
    title: params.resolvedTitle,
    primary: params.errorMessage,
    secondary: params.selectionSecondary,
  }).catch(() => {
    // no-op
  });
}

export async function showContextMenuUnexpectedErrorOverlay(
  tabId: number,
  source: SummarySource,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : "要約に失敗しました";
  await sendMessageToTab(tabId, {
    action: "showActionOverlay",
    status: "error",
    mode: "text",
    source,
    title: APP_NAME,
    primary: message,
  }).catch(() => {
    // コンテンツスクリプトに送れないページでは、黙って諦める
  });
}

export async function handleCalendarContextMenuClick(
  params: ContextMenuClickParams
): Promise<void> {
  const context = buildContextMenuSelectionContext(params.info);
  const initialSuffix = titleSuffixBySource(context.initialSource);
  const initialTitle = `カレンダー登録（${initialSuffix}）`;

  await sendMessageToTab(params.tabId, {
    action: "showActionOverlay",
    status: "loading",
    mode: "event",
    source: context.initialSource,
    title: initialTitle,
    secondary: context.selectionSecondary,
  } satisfies ContentScriptMessage);

  const target = await resolveTargetFromContextMenuClick({
    tabId: params.tabId,
    selection: context.selection,
    tab: params.tab,
  });
  const resolvedTitle = `カレンダー登録（${titleSuffixBySource(
    target.source
  )}）`;

  const result = await extractEventWithOpenAI(target);
  if (Result.isFailure(result)) {
    await showErrorNotification({
      title: "カレンダー登録に失敗しました",
      errorMessage: result.error,
    });

    await sendMessageToTab(params.tabId, {
      action: "showActionOverlay",
      status: "error",
      mode: "event",
      source: target.source,
      title: resolvedTitle,
      primary: result.error,
      secondary: context.selectionSecondary,
    } satisfies ContentScriptMessage).catch(() => {
      // no-op
    });
    return;
  }

  const calendarTargets = await loadCalendarTargets();
  if (calendarTargets.length === 0) {
    await sendMessageToTab(params.tabId, {
      action: "showNotification",
      message:
        "カレンダー登録先が未選択です（ポップアップの「カレンダー」タブで設定してください）",
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
    status: "ready",
    mode: "event",
    source: target.source,
    title: resolvedTitle,
    primary: artifacts.eventText,
    secondary: context.selectionSecondary,
    calendarUrl: artifacts.calendarUrl,
    ics: artifacts.ics,
    event: result.value,
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
    tabId: params.tabId,
    selection: context.selection,
    tab: params.tab,
  });
  const resolvedTitle = buildResolvedTitle(action, target.source);

  const overlayContext: OverlayContext = {
    tabId: params.tabId,
    action,
    target,
    resolvedTitle,
    selectionSecondary: context.selectionSecondary,
  };

  if (action.kind === "event") {
    await handleEventAction(overlayContext);
  } else {
    await handlePromptAction(overlayContext);
  }
}

async function handleEventAction(context: OverlayContext): Promise<void> {
  const { tabId, action, target, resolvedTitle, selectionSecondary } = context;

  const result = await executeEventAction({ target, action });

  if (Result.isFailure(result)) {
    await showErrorNotification({
      title: `${action.title}に失敗しました`,
      errorMessage: result.error,
    });

    await sendMessageToTab(tabId, {
      action: "showActionOverlay",
      status: "error",
      mode: "event",
      source: target.source,
      title: resolvedTitle,
      primary: result.error,
      secondary: selectionSecondary,
    }).catch(() => {
      // no-op
    });
    return;
  }

  await sendMessageToTab(tabId, {
    action: "showActionOverlay",
    status: "ready",
    mode: "event",
    source: target.source,
    title: resolvedTitle,
    primary: result.value.eventText,
    secondary: selectionSecondary,
    event: result.value.event,
  });
}

async function handlePromptAction(context: OverlayContext): Promise<void> {
  const { tabId, action, target, resolvedTitle, selectionSecondary } = context;

  const result = await executePromptAction({ target, action });

  if (Result.isFailure(result)) {
    await reportPromptActionFailure({
      tabId,
      actionTitle: action.title,
      source: target.source,
      resolvedTitle,
      errorMessage: result.error,
      selectionSecondary,
    });
    return;
  }

  await sendActionOverlayMessage({
    tabId,
    status: "ready",
    mode: "text",
    source: target.source,
    title: resolvedTitle,
    primary: result.value.text,
    secondary: selectionSecondary,
  });
}

async function loadCalendarTargets(): Promise<CalendarRegistrationTarget[]> {
  const stored = (await storageSyncGet(["calendarTargets"])) as SyncStorageData;
  return resolveCalendarTargets(stored.calendarTargets);
}
