import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Fieldset } from "@/components/shared/Fieldset";
import {
  ButtonRow,
  PaneCard,
  RowBetween,
  Stack,
} from "@/components/shared/Layout";
import { SwitchField } from "@/components/shared/SwitchField";
import { TextOutput } from "@/components/shared/TextOutput";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { sendBackgroundResult } from "@/popup/utils/background_result";
import type { LocalStorageData } from "@/storage/types";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type DebugPaneProps = PopupPaneBaseProps;

export function DebugPane(props: DebugPaneProps): React.JSX.Element {
  const [debugMode, setDebugMode] = useState(false);
  const [logStats, setLogStats] = useState<{
    entryCount: number;
    sizeKB: string;
  } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logContent, setLogContent] = useState("");

  const loadLogStats = useCallback(async (): Promise<void> => {
    const result = await props.runtime.sendMessageToBackground<
      { action: "getDebugLogStats" },
      unknown
    >({
      action: "getDebugLogStats",
    });

    if (Result.isSuccess(result)) {
      const data = result.value as {
        ok: boolean;
        entryCount?: number;
        sizeKB?: string;
      };
      if (data.ok && data.entryCount !== undefined && data.sizeKB) {
        setLogStats({ entryCount: data.entryCount, sizeKB: data.sizeKB });
      }
    }
  }, [props.runtime]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await props.runtime.storageLocalGet(["debugMode"]);
      if (Result.isFailure(loaded) || cancelled) {
        return;
      }
      const raw: Partial<LocalStorageData> = loaded.value;
      const nextDebugMode = raw.debugMode ?? false;
      setDebugMode(nextDebugMode);
      if (nextDebugMode) {
        await loadLogStats();
      }
    })().catch((error) => {
      debugLog(
        "DebugPane.useEffect[props.runtime]",
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
  }, [loadLogStats, props.runtime]);

  const loadAndShowLogs = async (): Promise<void> => {
    const result = await props.runtime.sendMessageToBackground<
      { action: "getDebugLogs" },
      unknown
    >({
      action: "getDebugLogs",
    });

    if (Result.isSuccess(result)) {
      const data = result.value as {
        ok: boolean;
        logs?: Array<{
          timestamp: string;
          level: string;
          context: string;
          message: string;
          data?: unknown;
        }>;
      };
      if (data.ok && data.logs) {
        const formatted = data.logs
          .map(
            (log) =>
              `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.context}] ${log.message}${
                log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : ""
              }`
          )
          .join("\n\n");
        setLogContent(formatted);
        setShowLogs(true);
      }
    }
  };

  const toggleDebugMode = async (checked: boolean): Promise<void> => {
    const saved = await props.runtime.storageLocalSet({ debugMode: checked });
    if (Result.isSuccess(saved)) {
      setDebugMode(checked);
      props.notify.success(t("debug.success.saved"));

      // ログ統計を更新
      if (checked) {
        await loadLogStats();
      } else {
        setLogStats(null);
        setShowLogs(false);
      }
      return;
    }
    props.notify.error(t("debug.errors.saveFailed"));
  };

  const runDebugAction = async (
    action: "downloadDebugLogs" | "clearDebugLogs"
  ): Promise<boolean> => {
    const result = await sendBackgroundResult({
      runtime: props.runtime,
      message: { action },
      onError: props.notify.error,
      // downloadDebugLogs はユーザーのファイル保存ダイアログを待つため
      // タイムアウトを無効化
      timeoutMs: action === "downloadDebugLogs" ? null : undefined,
    });
    return result !== null;
  };

  const downloadLogs = async (): Promise<void> => {
    const ok = await runDebugAction("downloadDebugLogs");
    if (ok) {
      props.notify.success(t("debug.success.downloaded"));
    }
  };

  const clearLogs = async (): Promise<void> => {
    const ok = await runDebugAction("clearDebugLogs");
    if (!ok) {
      return;
    }
    setLogStats(null);
    setShowLogs(false);
    setLogContent("");
    props.notify.success(t("debug.success.cleared"));
  };

  return (
    <PaneCard className="settings-surface debug-settings-pane">
      <section className="settings-pane-overview">
        <Stack spacing="small">
          <PaneTitle>{t("debug.title")}</PaneTitle>
          <Hint>{t("debug.description")}</Hint>
        </Stack>
      </section>

      {/* デバッグモード設定 */}
      <section className="card settings-card settings-pane-card">
        <Fieldset legend={t("debug.mode")} spacing="stack">
          <SwitchField
            checked={debugMode}
            data-testid="debug-mode-switch"
            id="debug-mode-switch"
            label={t("debug.modeToggle")}
            onCheckedChange={(checked) => {
              toggleDebugMode(checked).catch(() => {
                // no-op
              });
            }}
          />
          <Hint>
            {t("debug.enabledDescription")} {t("debug.disabledDescription")}
          </Hint>
        </Fieldset>

        {debugMode && logStats && (
          <Hint as="div" className="settings-status-note">
            {t("debug.stats", {
              entryCount: logStats.entryCount,
              sizeKB: logStats.sizeKB,
            })}
          </Hint>
        )}
      </section>

      {debugMode && (
        <>
          {/* ログ操作 */}
          <section className="card settings-card settings-pane-card">
            <Fieldset legend={t("debug.logActions")} spacing="stack">
              <ButtonRow>
                <Button
                  data-testid="show-debug-logs"
                  onClick={() => {
                    loadAndShowLogs().catch((error) => {
                      debugLog(
                        "DebugPane.loadAndShowLogs",
                        "failed",
                        { error: formatErrorLog("", {}, error) },
                        "error"
                      ).catch(() => {
                        // no-op
                      });
                      props.notify.error(t("debug.errors.loadFailed"));
                    });
                  }}
                  size="small"
                  type="button"
                  variant="ghost"
                >
                  {t("debug.showLogs")}
                </Button>
                <Button
                  data-testid="download-debug-logs"
                  onClick={() => {
                    downloadLogs().catch(() => {
                      // no-op
                    });
                  }}
                  size="small"
                  type="button"
                  variant="ghost"
                >
                  {t("debug.download")}
                </Button>
                <Button
                  data-testid="clear-debug-logs"
                  onClick={() => {
                    clearLogs().catch(() => {
                      // no-op
                    });
                  }}
                  type="button"
                  variant="danger"
                >
                  {t("debug.clear")}
                </Button>
              </ButtonRow>
            </Fieldset>

            {showLogs && (
              <Stack className="settings-log-panel">
                <RowBetween>
                  <strong>{t("debug.logContent")}</strong>
                  <Button
                    data-testid="hide-debug-logs"
                    onClick={() => {
                      setShowLogs(false);
                    }}
                    type="button"
                    variant="danger"
                  >
                    {t("common.close")}
                  </Button>
                </RowBetween>
                <TextOutput variant="debugLog">
                  {logContent || t("debug.emptyLogs")}
                </TextOutput>
              </Stack>
            )}
          </section>
        </>
      )}
    </PaneCard>
  );
}
