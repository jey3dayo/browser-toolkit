import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { SummarizeEventSuccessPayload } from "@/background/types";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { CheckboxInline } from "@/components/shared/Checkbox";
import { Field } from "@/components/shared/Field";
import {
  ActionRow,
  ButtonRow,
  OutputPanel,
  PaneCard,
  RowBetween,
  Stack,
} from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { Hint, MetaTitle, PaneTitle } from "@/components/shared/Typography";
import type { PaneId } from "@/popup/panes";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { SummaryTarget } from "@/popup/runtime";
import {
  ensureOpenAiTokenConfigured,
  type NotificationOptions,
} from "@/popup/token_guard";
import { sendBackgroundResult } from "@/popup/utils/background_result";
import { persistWithRollback } from "@/popup/utils/persist";
import { coerceSummarySourceLabel } from "@/popup/utils/summary_source_label";
import { fetchSummaryTargetForActiveTab } from "@/popup/utils/summary_target";
import type {
  CalendarRegistrationTarget,
  ExtractedEvent,
} from "@/shared_types";
import {
  DEFAULT_CALENDAR_TARGETS,
  resolveCalendarTargets,
} from "@/utils/calendar_targets";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";
import { buildIcs, sanitizeFileName } from "@/utils/ics";

export type CalendarPaneProps = PopupPaneBaseProps & {
  navigateToPane: (paneId: PaneId) => void;
  focusTokenInput: () => void;
};

type OutputState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "ready";
      text: string;
      sourceLabel: string;
      calendarUrl?: string;
      event: ExtractedEvent;
    }
  | { status: "error"; message: string };

export function CalendarPane(props: CalendarPaneProps): React.JSX.Element {
  const { focusTokenInput, navigateToPane, notify, runtime } = props;
  const [targets, setTargets] = useState<CalendarRegistrationTarget[]>(
    DEFAULT_CALENDAR_TARGETS
  );
  const [output, setOutput] = useState<OutputState>({ status: "idle" });

  const googleId = useId();
  const icsId = useId();

  const hasGoogle = targets.includes("google");
  const hasIcs = targets.includes("ics");

  const outputTitle =
    output.status === "ready" || output.status === "running"
      ? "イベント内容"
      : "出力";
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
        return "抽出中...";
      case "error":
        return output.message;
      default:
        return "";
    }
  }, [output]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await runtime.storageSyncGet(["calendarTargets"]);
      if (Result.isFailure(data)) {
        return;
      }
      if (cancelled) {
        return;
      }
      const next = resolveCalendarTargets(data.value.calendarTargets);
      setTargets(next);
    })().catch((error) => {
      debugLog(
        "CalendarPane.useEffect[runtime]",
        "failed",
        { error: formatErrorLog("", {}, error) },
        "error"
      ).catch(() => {
        // no-op
      });
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const saveTargets = useCallback(
    async (next: CalendarRegistrationTarget[]): Promise<void> => {
      await persistWithRollback({
        applyNext: () => {
          setTargets(next);
        },
        rollback: () => {
          setTargets(targets);
        },
        persist: () =>
          runtime.storageSyncSet({
            calendarTargets: next,
          }),
        onSuccess: () => {
          notify.success("保存しました");
        },
        onFailure: () => {
          notify.error("保存に失敗しました");
        },
      });
    },
    [notify, runtime, targets]
  );

  const toggleTarget = (target: CalendarRegistrationTarget): void => {
    const next = targets.includes(target)
      ? targets.filter((item) => item !== target)
      : [...targets, target];
    saveTargets(next).catch(() => {
      // no-op
    });
  };

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
            → 設定を開く
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
      notify.error("登録先を1つ以上選択してください");
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
        payload.calendarError ?? "Googleカレンダーリンクを生成できません"
      );
    }

    setOutput({
      status: "ready",
      text: payload.eventText,
      sourceLabel: coerceSummarySourceLabel(target.source),
      calendarUrl,
      event: payload.event,
    });
    notify.success("完了しました");
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
        notify.error("この環境ではクリップボードにコピーできません");
        return;
      }
      await navigator.clipboard.writeText(text);
      notify.success("コピーしました");
    } catch {
      notify.error("コピーに失敗しました");
    }
  };

  const openCalendar = (): void => {
    if (output.status !== "ready") {
      return;
    }
    const calendarUrl = output.calendarUrl?.trim() ?? "";
    if (!calendarUrl) {
      notify.error("カレンダーリンクが見つかりません");
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
      notify.error(".ics の生成に失敗しました");
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
      notify.success("ダウンロードしました");
    } catch {
      notify.error(".ics のダウンロードに失敗しました");
    }
  };

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>カレンダー登録</PaneTitle>
        <Badge data-testid="calendar-source" variant="chipSoft">
          {output.status === "ready" ? output.sourceLabel : "-"}
        </Badge>
      </RowBetween>

      <Hint>
        選択範囲があれば優先し、なければページ本文からイベントを抽出します。
      </Hint>

      <Stack>
        <Field label="登録先">
          <ActionRow>
            <CheckboxInline
              checked={hasGoogle}
              id={googleId}
              onChange={() => {
                toggleTarget("google");
              }}
            >
              Googleカレンダー
            </CheckboxInline>
            <CheckboxInline
              checked={hasIcs}
              id={icsId}
              onChange={() => {
                toggleTarget("ics");
              }}
            >
              iCal (.ics)
            </CheckboxInline>
          </ActionRow>
        </Field>

        <ButtonRow>
          <Button
            data-testid="calendar-run"
            onClick={() => {
              runCalendar().catch(() => {
                // no-op
              });
            }}
            size="small"
            type="button"
            variant="primary"
          >
            抽出する
          </Button>
          <Button
            data-testid="calendar-copy"
            disabled={!canCopyOutput}
            onClick={() => {
              copyOutput().catch(() => {
                // no-op
              });
            }}
            size="small"
            type="button"
            variant="ghost"
          >
            コピー
          </Button>
          {hasGoogle ? (
            <Button
              data-testid="calendar-open-google"
              disabled={!canOpenCalendar}
              onClick={() => {
                openCalendar();
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              Googleカレンダー
            </Button>
          ) : null}
          {hasIcs ? (
            <Button
              data-testid="calendar-download-ics"
              disabled={!canDownloadIcs}
              onClick={() => {
                downloadIcs();
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              .ics
            </Button>
          ) : null}
        </ButtonRow>
      </Stack>

      <OutputPanel>
        <RowBetween>
          <MetaTitle>{outputTitle}</MetaTitle>
        </RowBetween>
        <Textarea
          data-testid="calendar-output"
          readOnly
          size="small"
          value={outputValue}
          variant="summary"
        />
      </OutputPanel>
    </PaneCard>
  );
}
