import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  EditorPanel,
  PaneCard,
  RowBetween,
  Stack,
} from "@/components/shared/Layout";
import { TextOutput } from "@/components/shared/TextOutput";
import {
  EmptyMessage,
  Hint,
  HintText,
  PaneTitle,
} from "@/components/shared/Typography";
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
    try {
      await props.runtime.storageLocalSet({ actionHistory: [] });
      setHistory([]);
      props.notify.success("履歴を削除しました");
    } catch {
      props.notify.error("履歴の削除に失敗しました");
    }
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
    <PaneCard>
      <RowBetween>
        <PaneTitle>アクション履歴</PaneTitle>
        {history.length > 0 ? (
          <Button
            onClick={() => {
              clearHistory().catch(() => {
                // no-op
              });
            }}
            size="small"
            type="button"
            variant="ghost"
          >
            全削除
          </Button>
        ) : null}
      </RowBetween>
      <Hint>直近20件のアクション実行結果を保存します。</Hint>

      {history.length === 0 ? (
        <EmptyMessage>履歴がありません</EmptyMessage>
      ) : (
        <Stack>
          {history.map((entry) => (
            <EditorPanel key={entry.id}>
              <RowBetween>
                <div>
                  <Badge variant="chipSoft">{entry.actionTitle}</Badge>
                  <HintText style={{ marginLeft: "8px" }}>
                    {formatDate(entry.createdAt)}
                  </HintText>
                </div>
                <Button
                  onClick={() => {
                    copyEntry(entry.text).catch(() => {
                      // no-op
                    });
                  }}
                  size="small"
                  type="button"
                  variant="ghost"
                >
                  コピー
                </Button>
              </RowBetween>
              <TextOutput
                size="small"
                style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}
                variant="summary"
              >
                {entry.text.length > 200
                  ? `${entry.text.slice(0, 200)}…`
                  : entry.text}
              </TextOutput>
            </EditorPanel>
          ))}
        </Stack>
      )}
    </PaneCard>
  );
}
