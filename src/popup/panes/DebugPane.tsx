import { Button } from "@base-ui/react/button";
import { Fieldset } from "@base-ui/react/fieldset";
import { Separator } from "@base-ui/react/separator";
import { Switch } from "@base-ui/react/switch";
import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type {
  ClearDebugLogsRequest,
  ClearDebugLogsResponse,
  DownloadDebugLogsRequest,
  DownloadDebugLogsResponse,
} from "@/popup/runtime";
import type { LocalStorageData } from "@/storage/types";

export type DebugPaneProps = PopupPaneBaseProps;

export function DebugPane(props: DebugPaneProps): React.JSX.Element {
  const [debugMode, setDebugMode] = useState(false);
  const [logStats, setLogStats] = useState<{
    entryCount: number;
    sizeKB: string;
  } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logContent, setLogContent] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await props.runtime.storageLocalGet(["debugMode"]);
      if (Result.isFailure(loaded) || cancelled) {
        return;
      }
      const raw: Partial<LocalStorageData> = loaded.value;
      setDebugMode(raw.debugMode ?? false);
    })().catch(() => {
      // no-op
    });
    return () => {
      cancelled = true;
    };
  }, [props.runtime]);

  const loadLogStats = async (): Promise<void> => {
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
  };

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

  useEffect(() => {
    if (debugMode) {
      loadLogStats().catch(() => {
        // no-op
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugMode]);

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

  const downloadLogs = async (): Promise<void> => {
    const responseUnknown = await props.runtime.sendMessageToBackground<
      DownloadDebugLogsRequest,
      unknown
    >({
      action: "downloadDebugLogs",
    });

    if (Result.isFailure(responseUnknown)) {
      props.notify.error(responseUnknown.error);
      return;
    }

    const response = responseUnknown.value as DownloadDebugLogsResponse;
    if (response.ok) {
      props.notify.success("ダウンロードしました");
      return;
    }

    props.notify.error(response.error);
  };

  const clearLogs = async (): Promise<void> => {
    const responseUnknown = await props.runtime.sendMessageToBackground<
      ClearDebugLogsRequest,
      unknown
    >({
      action: "clearDebugLogs",
    });

    if (Result.isFailure(responseUnknown)) {
      props.notify.error(responseUnknown.error);
      return;
    }

    const response = responseUnknown.value as ClearDebugLogsResponse;
    if (response.ok) {
      setLogStats(null);
      setShowLogs(false);
      setLogContent("");
      props.notify.success("クリアしました");
      return;
    }

    props.notify.error(response.error);
  };

  return (
    <div className="card card-stack">
      <div className="stack-sm">
        <h2 className="pane-title">デバッグ</h2>
        <p className="hint">開発者向けのデバッグ機能です</p>
      </div>

      {/* デバッグモード設定 */}
      <div className="stack">
        <Fieldset.Root className="mbu-fieldset stack">
          <Fieldset.Legend className="mbu-fieldset-legend">
            デバッグモード
          </Fieldset.Legend>
          <div className="field">
            <label className="field-row" htmlFor="debug-mode-switch">
              <span className="field-name">デバッグモードを有効にする</span>
              <Switch.Root
                checked={debugMode}
                className="mbu-switch"
                data-testid="debug-mode-switch"
                id="debug-mode-switch"
                onCheckedChange={(checked) => {
                  toggleDebugMode(checked).catch(() => {
                    // no-op
                  });
                }}
              >
                <Switch.Thumb className="mbu-switch-thumb" />
              </Switch.Root>
            </label>
          </div>
          <p className="hint">
            ONにすると、デバッグログをストレージに保存しファイルとしてダウンロードできます。
            OFFの場合は、通常のconsole.logのように動作します。
          </p>
        </Fieldset.Root>

        {debugMode && logStats && (
          <div className="hint">
            現在のログエントリ数: {logStats.entryCount} / 1000 (サイズ:{" "}
            {logStats.sizeKB} KB)
          </div>
        )}
      </div>

      {debugMode && (
        <>
          <Separator className="mbu-separator" />

          {/* ログ操作 */}
          <div className="stack">
            <Fieldset.Root className="mbu-fieldset stack">
              <Fieldset.Legend className="mbu-fieldset-legend">
                ログ操作
              </Fieldset.Legend>

              <div className="button-row">
                <Button
                  className="btn btn-ghost btn-small"
                  data-testid="show-debug-logs"
                  onClick={() => {
                    loadAndShowLogs().catch(() => {
                      props.notify.error("ログの読み込みに失敗しました");
                    });
                  }}
                  type="button"
                >
                  ログを表示
                </Button>
                <Button
                  className="btn btn-ghost btn-small"
                  data-testid="download-debug-logs"
                  onClick={() => {
                    downloadLogs().catch(() => {
                      // no-op
                    });
                  }}
                  type="button"
                >
                  ダウンロード
                </Button>
                <Button
                  className="btn-delete"
                  data-testid="clear-debug-logs"
                  onClick={() => {
                    clearLogs().catch(() => {
                      // no-op
                    });
                  }}
                  type="button"
                >
                  クリア
                </Button>
              </div>
            </Fieldset.Root>

            {showLogs && (
              <div className="stack">
                <div className="row-between">
                  <strong>ログ内容</strong>
                  <Button
                    className="btn-delete"
                    data-testid="hide-debug-logs"
                    onClick={() => {
                      setShowLogs(false);
                    }}
                    type="button"
                  >
                    閉じる
                  </Button>
                </div>
                <pre
                  style={{
                    maxHeight: "400px",
                    overflow: "auto",
                    padding: "12px",
                    backgroundColor: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {logContent || "(ログが空です)"}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
