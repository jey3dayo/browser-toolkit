import { Result } from "@praha/byethrow";
import React, { useState } from "react";
import type { ContextAction } from "@/context_actions";
import type { PaneId } from "@/popup/panes";
import type {
  PopupRuntime,
  RunContextActionRequest,
  SummaryTarget,
} from "@/popup/runtime";
import {
  ensureOpenAiTokenConfigured,
  type NotificationOptions,
} from "@/popup/token_guard";
import { createErrorReporter } from "@/popup/utils/error_reporter";
import { coerceSummarySourceLabel } from "@/popup/utils/summary_source_label";
import {
  fetchSummaryTargetForTab,
  resolveActiveTabId,
} from "@/popup/utils/summary_target";
import type { Notifier } from "@/ui/toast";
import type { OutputState } from "./types";
import { parseRunContextActionResponseToOutput } from "./types";

export function useActionRunner(params: {
  actionsById: Map<string, ContextAction>;
  runtime: PopupRuntime;
  notify: Notifier;
  navigateToPane: (paneId: PaneId) => void;
  focusTokenInput: () => void;
}): {
  output: OutputState;
  target: SummaryTarget | null;
  runAction: (actionId: string) => Promise<void>;
  copyOutput: () => Promise<void>;
  outputTitle: string;
  outputValue: string;
  canCopyOutput: boolean;
  targetSourceLabel: string;
} {
  const [output, setOutput] = useState<OutputState>({ status: "idle" });
  const [target, setTarget] = useState<SummaryTarget | null>(null);

  const outputTitle =
    output.status === "ready" || output.status === "running"
      ? output.title
      : "出力";
  const outputText = output.status === "ready" ? output.text : "";
  const canCopyOutput = Boolean(outputText.trim());
  const targetSourceLabel = target
    ? coerceSummarySourceLabel(target.source)
    : "";
  const outputValue = (() => {
    switch (output.status) {
      case "ready":
        return output.text;
      case "running":
        return "実行中...";
      case "error":
        return output.message;
      default:
        return "";
    }
  })();

  const ensureTokenReady = async (): Promise<boolean> => {
    const tokenConfigured = await ensureOpenAiTokenConfigured({
      storageLocalGet: (keys) => params.runtime.storageLocalGet(keys),
      showNotification: (messageOrOptions, type) => {
        if (typeof messageOrOptions === "string") {
          const message: string = messageOrOptions;
          if (type === "error") {
            params.notify.error(message);
            return;
          }
          params.notify.info(message);
          return;
        }

        const options: NotificationOptions = messageOrOptions;
        if (type === "error") {
          params.notify.error({
            title: options.message,
            description: options.action
              ? React.createElement(
                  "button",
                  {
                    className: "mbu-toast-action-link",
                    onClick: options.action.onClick,
                    type: "button",
                  },
                  options.action.label
                )
              : undefined,
          });
          return;
        }
        params.notify.info(options.message);
      },
      navigateToPane: (paneId) => {
        params.navigateToPane(paneId as PaneId);
      },
      focusTokenInput: params.focusTokenInput,
    });

    return !Result.isFailure(tokenConfigured);
  };

  const baseReportError = createErrorReporter({
    notify: params.notify,
    navigateToPane: params.navigateToPane,
    focusTokenInput: params.focusTokenInput,
  });

  const reportError = (message: string): void => {
    baseReportError(message);
    setOutput({ status: "idle" });
  };

  const runAction = async (actionId: string): Promise<void> => {
    const action = params.actionsById.get(actionId);
    if (!action) {
      params.notify.error("アクションが見つかりません");
      setOutput({ status: "idle" });
      return;
    }

    const tokenReady = await ensureTokenReady();
    if (!tokenReady) {
      setOutput({ status: "idle" });
      return;
    }

    setOutput({ status: "running", title: action.title });
    setTarget(null);

    const tabId = await resolveActiveTabId({
      runtime: params.runtime,
      onError: reportError,
    });
    if (tabId === null) {
      return;
    }

    const summaryTarget = await fetchSummaryTargetForTab({
      runtime: params.runtime,
      tabId,
      onError: reportError,
    });
    if (!summaryTarget) {
      return;
    }
    setTarget(summaryTarget);

    const responseUnknown = await params.runtime.sendMessageToBackground<
      RunContextActionRequest,
      unknown
    >({
      action: "runContextAction",
      tabId,
      actionId,
      target: summaryTarget,
      source: "popup",
    });
    if (Result.isFailure(responseUnknown)) {
      reportError(responseUnknown.error);
      return;
    }

    const parsed = parseRunContextActionResponseToOutput({
      actionTitle: action.title,
      responseUnknown: responseUnknown.value,
    });
    if (Result.isFailure(parsed)) {
      reportError(parsed.error);
      return;
    }

    setOutput(parsed.value);
    params.notify.success("完了しました");
  };

  const copyOutput = async (): Promise<void> => {
    if (output.status !== "ready") {
      return;
    }
    const text = output.text.trim();
    if (!text) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        params.notify.error("この環境ではクリップボードにコピーできません");
        return;
      }
      await navigator.clipboard.writeText(text);
      params.notify.success("コピーしました");
    } catch {
      params.notify.error("コピーに失敗しました");
    }
  };

  return {
    output,
    target,
    runAction,
    copyOutput,
    outputTitle,
    outputValue,
    canCopyOutput,
    targetSourceLabel,
  };
}
