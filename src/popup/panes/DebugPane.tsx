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
import { Separator } from "@/components/shared/Separator";
import { SwitchField } from "@/components/shared/SwitchField";
import { TextOutput } from "@/components/shared/TextOutput";
import { Hint, PaneTitle } from "@/components/shared/Typography";
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
      props.notify.success("保存しました");

      // ログ統計を更新
      if (checked) {
        await loadLogStats();
      } else {
        setLogStats(null);
        setShowLogs(false);
      }
      return;
    }
    props.notify.error("保存に失敗しました");
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
      props.notify.success("ダウンロードしました");
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
    props.notify.success("クリアしました");
  };

  return (
    <PaneCard>
      <Stack spacing="small">
        <PaneTitle>デバッグ</PaneTitle>
        <Hint>開発者向けのデバッグ機能です</Hint>
      </Stack>

      {/* デバッグモード設定 */}
      <Stack>
        <Fieldset legend="デバッグモード" spacing="stack">
          <SwitchField
            checked={debugMode}
            data-testid="debug-mode-switch"
            id="debug-mode-switch"
            label="デバッグモードを有効にする"
            onCheckedChange={(checked) => {
              toggleDebugMode(checked).catch(() => {
                // no-op
              });
            }}
          />
          <Hint>
            ONにすると、デバッグログをストレージに保存しファイルとしてダウンロードできます。
            OFFの場合は、通常のconsole.logのように動作します。
          </Hint>
        </Fieldset>

        {debugMode && logStats && (
          <Hint as="div">
            現在のログエントリ数: {logStats.entryCount} / 1000 (サイズ:{" "}
            {logStats.sizeKB} KB)
          </Hint>
        )}
      </Stack>

      {debugMode && (
        <>
          <Separator />

          {/* ログ操作 */}
          <Stack>
            <Fieldset legend="ログ操作" spacing="stack">
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
                      props.notify.error("ログの読み込みに失敗しました");
                    });
                  }}
                  size="small"
                  type="button"
                  variant="ghost"
                >
                  ログを表示
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
                  ダウンロード
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
                  クリア
                </Button>
              </ButtonRow>
            </Fieldset>

            {showLogs && (
              <Stack>
                <RowBetween>
                  <strong>ログ内容</strong>
                  <Button
                    data-testid="hide-debug-logs"
                    onClick={() => {
                      setShowLogs(false);
                    }}
                    type="button"
                    variant="danger"
                  >
                    閉じる
                  </Button>
                </RowBetween>
                <TextOutput variant="debugLog">
                  {logContent || "(ログが空です)"}
                </TextOutput>
              </Stack>
            )}
          </Stack>
        </>
      )}
    </PaneCard>
  );
}
