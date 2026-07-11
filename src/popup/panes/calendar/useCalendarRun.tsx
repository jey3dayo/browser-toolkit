import { Result } from "@praha/byethrow";
import { useMemo, useState } from "react";
import type { SummarizeEventSuccessPayload } from "@/background/types";
import { Button } from "@/components/shared/Button";
import { t } from "@/i18n";
import type { PaneId } from "@/popup/panes";
import type { PopupRuntime, SummaryTarget } from "@/popup/runtime";
import {
  ensureOpenAiTokenConfigured,
  type NotificationOptions,
} from "@/popup/token_guard";
import { sendBackgroundResult } from "@/popup/utils/background_result";
import { coerceSummarySourceLabel } from "@/popup/utils/summary_source_label";
import { fetchSummaryTargetForActiveTab } from "@/popup/utils/summary_target";
import type { CalendarRegistrationTarget } from "@/shared_types";
import type { Notifier } from "@/ui/toast";
import { buildIcs, sanitizeFileName } from "@/utils/ics";
import type { OutputState } from "./types";

export function useCalendarRun(params: {
  runtime: PopupRuntime;
  notify: Notifier;
  navigateToPane: (paneId: PaneId) => void;
  focusTokenInput: () => void;
  targets: CalendarRegistrationTarget[];
  hasGoogle: boolean;
  hasIcs: boolean;
}): {
  output: OutputState;
  outputTitle: string;
  outputValue: string;
  canCopyOutput: boolean;
  canOpenCalendar: boolean;
  canDownloadIcs: boolean;
  runCalendar: () => Promise<void>;
  copyOutput: () => Promise<void>;
  openCalendar: () => void;
  downloadIcs: () => void;
} {
  const {
    runtime,
    notify,
    navigateToPane,
    focusTokenInput,
    targets,
    hasGoogle,
    hasIcs,
  } = params;
  const [output, setOutput] = useState<OutputState>({ status: "idle" });

  const outputTitle =
    output.status === "ready" || output.status === "running"
      ? t("calendarPane.eventOutputTitle")
      : t("calendarPane.outputTitle");
  const outputText = output.status === "ready" ? output.text : "";
  const canCopyOutput = Boolean(outputText.trim());
  const canOpenCalendar =
    output.status === "ready" &&
    hasGoogle &&
    Boolean(output.calendarUrl?.trim());
  const canDownloadIcs = output.status === "ready" && hasIcs;

  const outputValue = useMemo(() => {
    switch (output.status) {
      case "ready":
        return output.text;
      case "running":
        return t("calendarPane.running");
      case "error":
        return output.message;
      default:
        return "";
    }
  }, [output]);

  const ensureTokenReady = async (): Promise<boolean> => {
    const tokenConfigured = await ensureOpenAiTokenConfigured({
      storageLocalGet: (keys) => runtime.storageLocalGet(keys),
      showNotification: (messageOrOptions, type) => {
        if (typeof messageOrOptions === "string") {
          const message: string = messageOrOptions;
          if (type === "error") {
            notify.error(message);
            return;
          }
          notify.info(message);
          return;
        }

        // NotificationOptions with action
        const options: NotificationOptions = messageOrOptions;
        if (type === "error") {
          notify.error({
            title: options.message,
            description: options.action ? (
              <Button
                onClick={options.action.onClick}
                type="button"
                variant="toastActionLink"
              >
                {options.action.label}
              </Button>
            ) : undefined,
          });
          return;
        }
        notify.info(options.message);
      },
      navigateToPane: (paneId) => {
        navigateToPane(paneId as PaneId);
      },
      focusTokenInput,
    });

    return !Result.isFailure(tokenConfigured);
  };

  const reportError = (message: string): void => {
    // トークン関連エラーの場合は「→ 設定を開く」リンク付きで表示
    if (
      message.includes("Token") ||
      message.includes("トークン") ||
      message.includes("未設定") ||
      message.includes("API Key")
    ) {
      notify.error({
        title: message,
        description: (
          <Button
            onClick={() => {
              navigateToPane("pane-settings");
              focusTokenInput();
            }}
            type="button"
            variant="toastActionLink"
          >
            {t("calendarPane.openSettings")}
          </Button>
        ),
      });
    } else {
      notify.error(message);
    }
    setOutput({ status: "idle" });
  };

  const ensureTargetsSelected = (): boolean => {
    if (targets.length === 0) {
      notify.error(t("calendarPane.errors.targetRequired"));
      return false;
    }
    return true;
  };

  const requestEventSummary = async (
    target: SummaryTarget
  ): Promise<SummarizeEventSuccessPayload | null> =>
    await sendBackgroundResult({
      runtime,
      message: { action: "summarizeEvent", target },
      onError: reportError,
    });

  const runCalendar = async (): Promise<void> => {
    if (!ensureTargetsSelected()) {
      return;
    }

    const tokenReady = await ensureTokenReady();
    if (!tokenReady) {
      setOutput({ status: "idle" });
      return;
    }

    setOutput({ status: "running" });

    const target = await fetchSummaryTargetForActiveTab({
      runtime,
      onError: reportError,
    });
    if (!target) {
      return;
    }

    const payload = await requestEventSummary(target);
    if (!payload) {
      return;
    }

    const calendarUrl = hasGoogle
      ? payload.calendarUrl?.trim() || undefined
      : undefined;
    if (hasGoogle && !calendarUrl) {
      notify.error(
        payload.calendarError ??
          t("calendarPane.errors.googleCalendarUrlFailed")
      );
    }

    setOutput({
      status: "ready",
      text: payload.eventText,
      sourceLabel: coerceSummarySourceLabel(target.source),
      calendarUrl,
      event: payload.event,
    });
    notify.success(t("calendarPane.success.completed"));
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
        notify.error(t("calendarPane.errors.clipboardUnavailable"));
        return;
      }
      await navigator.clipboard.writeText(text);
      notify.success(t("calendarPane.success.copied"));
    } catch {
      notify.error(t("calendarPane.errors.copyFailed"));
    }
  };

  const openCalendar = (): void => {
    if (output.status !== "ready") {
      return;
    }
    const calendarUrl = output.calendarUrl?.trim() ?? "";
    if (!calendarUrl) {
      notify.error(t("calendarPane.errors.calendarUrlMissing"));
      return;
    }
    runtime.openUrl(calendarUrl);
  };

  const downloadIcs = (): void => {
    if (output.status !== "ready") {
      return;
    }
    const event = output.event;
    const ics = buildIcs(event);
    if (!ics) {
      notify.error(t("calendarPane.errors.icsGenerationFailed"));
      return;
    }

    try {
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFileName(event.title || "event")}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify.success(t("calendarPane.success.downloaded"));
    } catch {
      notify.error(t("calendarPane.errors.icsDownloadFailed"));
    }
  };

  return {
    output,
    outputTitle,
    outputValue,
    canCopyOutput,
    canOpenCalendar,
    canDownloadIcs,
    runCalendar,
    copyOutput,
    openCalendar,
    downloadIcs,
  };
}
