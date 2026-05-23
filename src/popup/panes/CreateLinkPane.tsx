import { Result } from "@praha/byethrow";
import QRCode from "qrcode";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { Field } from "@/components/shared/Field";
import { Input } from "@/components/shared/Input";
import {
  ButtonRow,
  OutputPanel,
  PaneCard,
  RowBetween,
  Stack,
} from "@/components/shared/Layout";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import { Hint, MetaTitle, PaneTitle } from "@/components/shared/Typography";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";
import {
  coerceLinkFormat,
  formatLink,
  LINK_FORMAT_OPTIONS,
  type LinkFormat,
} from "@/utils/link_format";

export type CreateLinkPaneProps = PopupPaneBaseProps & {
  initialLink?: { title: string; url: string };
  initialFormat?: LinkFormat;
};

export function CreateLinkPane(props: CreateLinkPaneProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<LinkFormat>("markdown");
  const [showQr, setShowQr] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const titleInputId = useId();
  const urlInputId = useId();
  const formatLabelId = useId();
  const formatTriggerId = useId();

  const output = useMemo(
    () => formatLink({ title, url }, format),
    [format, title, url]
  );
  const canCopy = Boolean(output.trim());

  const loadFromActiveTab = useCallback(async (): Promise<void> => {
    try {
      const activeTab = await props.runtime.getActiveTab();
      if (Result.isFailure(activeTab)) {
        await debugLog(
          "CreateLinkPane.loadFromActiveTab",
          "getActiveTab failed",
          { error: activeTab.error },
          "error"
        );
        return;
      }

      if (!activeTab.value) {
        return;
      }
      setTitle(activeTab.value.title ?? "");
      setUrl(activeTab.value.url ?? "");
    } catch (error) {
      await debugLog(
        "CreateLinkPane.loadFromActiveTab",
        "unexpected error",
        { error: formatErrorLog("", {}, error) },
        "error"
      );
    }
  }, [props.runtime]);

  useEffect(() => {
    if (props.initialLink) {
      setTitle(props.initialLink.title);
      setUrl(props.initialLink.url);
    } else {
      loadFromActiveTab().catch(() => {
        // no-op
      });
    }
  }, [loadFromActiveTab, props.initialLink]);

  useEffect(() => {
    if (!props.initialFormat) {
      return;
    }
    setFormat(props.initialFormat);
  }, [props.initialFormat]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (props.initialFormat) {
        return;
      }
      const stored = await props.runtime.storageSyncGet(["linkFormat"]);
      if (Result.isFailure(stored)) {
        return;
      }
      if (cancelled) {
        return;
      }
      const next = coerceLinkFormat(stored.value.linkFormat);
      if (!next) {
        return;
      }
      setFormat(next);
    })().catch((error) => {
      debugLog(
        "CreateLinkPane.useEffect[props.initialFormat, props.runtime]",
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
  }, [props.initialFormat, props.runtime]);

  useEffect(() => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      return;
    }
    if (!(showQr && url.trim())) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    QRCode.toCanvas(canvas, url.trim(), { width: 200, margin: 2 }).catch(() => {
      props.notify.error("QRコードの生成に失敗しました");
    });
  }, [showQr, url, props.notify]);

  const handleFormatChange = useCallback(
    async (value: string): Promise<void> => {
      const next = coerceLinkFormat(value);
      if (!next) {
        return;
      }
      const prev = format;
      await persistWithRollback({
        applyNext: () => {
          setFormat(next);
        },
        rollback: () => {
          setFormat(prev);
        },
        persist: () => props.runtime.storageSyncSet({ linkFormat: next }),
        onFailure: () => {
          props.notify.error("形式の保存に失敗しました");
        },
      });
    },
    [format, props.notify, props.runtime]
  );

  const copyOutput = async (): Promise<void> => {
    const text = output.trim();
    if (!text) {
      props.notify.error(
        url.trim() ? "コピーする内容がありません" : "URLが空です"
      );
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        props.notify.error("この環境ではクリップボードにコピーできません");
        return;
      }
      await navigator.clipboard.writeText(text);
      props.notify.success("コピーしました");
    } catch {
      props.notify.error("コピーに失敗しました");
    }
  };

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>リンク作成</PaneTitle>
        <ButtonRow>
          <Button
            data-testid="create-link-qr"
            disabled={!url.trim()}
            onClick={() => {
              setShowQr((prev) => !prev);
            }}
            size="small"
            title="QRコード"
            type="button"
            variant="ghost"
          >
            <Icon aria-hidden="true" name="qr-code" size={16} />
          </Button>
          <Button
            data-testid="create-link-copy"
            disabled={!canCopy}
            onClick={() => {
              copyOutput().catch(() => {
                // no-op
              });
            }}
            size="small"
            type="button"
            variant="primary"
          >
            コピー
          </Button>
        </ButtonRow>
      </RowBetween>

      <Hint>
        現在のタブのURLを各形式でコピーします（タイトル/URLは編集できます）。
      </Hint>

      <Stack>
        <Field htmlFor={titleInputId} label="タイトル">
          <Input
            data-testid="create-link-title"
            id={titleInputId}
            onValueChange={setTitle}
            value={title}
            variant="token"
          />
        </Field>

        <Field htmlFor={urlInputId} label="URL">
          <Input
            data-testid="create-link-url"
            id={urlInputId}
            onValueChange={setUrl}
            value={url}
            variant="token"
          />
        </Field>

        <Field htmlFor={formatTriggerId} label="形式" labelId={formatLabelId}>
          <Select
            ariaLabelledBy={formatLabelId}
            onValueChange={(value) => {
              if (value === null) {
                return;
              }
              handleFormatChange(value).catch(() => {
                // no-op
              });
            }}
            options={LINK_FORMAT_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            triggerId={formatTriggerId}
            triggerTestId="create-link-format"
            value={format}
            variant="token"
          />
        </Field>
      </Stack>

      {showQr ? (
        <OutputPanel>
          <MetaTitle>QRコード</MetaTitle>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <canvas ref={qrCanvasRef} />
          </div>
        </OutputPanel>
      ) : null}

      <OutputPanel>
        <RowBetween>
          <MetaTitle>プレビュー</MetaTitle>
        </RowBetween>
        <Textarea
          data-testid="create-link-output"
          readOnly
          size="small"
          value={output}
          variant="summary"
        />
      </OutputPanel>
    </PaneCard>
  );
}
