import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { i18n } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { ActionHistoryEntry } from "@/storage/types";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPane(props: PopupPaneBaseProps): React.JSX.Element {
  const { t } = useTranslation(undefined, { i18n });
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
      props.notify.success(t("history.success.cleared"));
    } catch {
      props.notify.error(t("history.errors.clearFailed"));
    }
  };

  const copyEntry = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      props.notify.success(t("history.success.copied"));
    } catch {
      props.notify.error(t("history.errors.copyFailed"));
    }
  };

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>{t("history.title")}</PaneTitle>
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
            {t("history.clearAll")}
          </Button>
        ) : null}
      </RowBetween>
      <Hint>{t("history.description")}</Hint>

      {history.length === 0 ? (
        <EmptyMessage>{t("history.empty")}</EmptyMessage>
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
                  {t("common.copy")}
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
