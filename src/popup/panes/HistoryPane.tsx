import { Button } from "@base-ui/react/button";
import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { ActionHistoryEntry } from "@/storage/types";

export function HistoryPane(props: PopupPaneBaseProps): React.JSX.Element {
  const [history, setHistory] = useState<ActionHistoryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await props.runtime.storageLocalGet(["actionHistory"]);
      if (cancelled) {
        return;
      }
      if (Result.isSuccess(result)) {
        setHistory(result.value.actionHistory ?? []);
      }
    })().catch(() => {
      // no-op
    });
    return () => {
      cancelled = true;
    };
  }, [props.runtime]);

  const clearHistory = async (): Promise<void> => {
    await props.runtime.storageLocalSet({ actionHistory: [] });
    setHistory([]);
    props.notify.success("履歴を削除しました");
  };

  const copyEntry = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      props.notify.success("コピーしました");
    } catch {
      props.notify.error("コピーに失敗しました");
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">アクション履歴</h2>
        {history.length > 0 ? (
          <Button
            className="btn btn-ghost btn-small"
            onClick={() => {
              clearHistory().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            全削除
          </Button>
        ) : null}
      </div>
      <p className="hint">直近20件のアクション実行結果を保存します。</p>

      {history.length === 0 ? (
        <p className="empty-message">履歴がありません</p>
      ) : (
        <div className="stack">
          {history.map((entry) => (
            <div className="editor-panel" key={entry.id}>
              <div className="row-between">
                <div>
                  <span className="chip chip-soft">{entry.actionTitle}</span>
                  <span className="hint" style={{ marginLeft: "8px" }}>
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <Button
                  className="btn btn-ghost btn-small"
                  onClick={() => {
                    copyEntry(entry.text).catch(() => {
                      // no-op
                    });
                  }}
                  type="button"
                >
                  コピー
                </Button>
              </div>
              <pre
                className="summary-output summary-output--sm"
                style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}
              >
                {entry.text.length > 200
                  ? `${entry.text.slice(0, 200)}…`
                  : entry.text}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
