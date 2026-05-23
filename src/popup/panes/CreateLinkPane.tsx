import { Result } from "@praha/byethrow";
import QRCode from "qrcode";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import type { PopupRuntime } from "@/popup/runtime";
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

type CreateLinkInitialState = {
  format?: LinkFormat;
  title?: string;
  url?: string;
};

async function resolveInitialLinkState(
  runtime: PopupRuntime,
  initialLink: CreateLinkPaneProps["initialLink"]
): Promise<CreateLinkInitialState> {
  if (initialLink) {
    return {
      title: initialLink.title,
      url: initialLink.url,
    };
  }

  const activeTab = await runtime.getActiveTab();
  if (Result.isFailure(activeTab)) {
    await debugLog(
      "CreateLinkPane.resolveInitialLinkState",
      "getActiveTab failed",
      { error: activeTab.error },
      "error"
    );
    return {};
  }
  if (!activeTab.value) {
    return {};
  }
  return {
    title: activeTab.value.title ?? "",
    url: activeTab.value.url ?? "",
  };
}

async function resolveInitialFormatState(
  runtime: PopupRuntime,
  initialFormat: CreateLinkPaneProps["initialFormat"]
): Promise<CreateLinkInitialState> {
  if (initialFormat) {
    return { format: initialFormat };
  }

  const stored = await runtime.storageSyncGet(["linkFormat"]);
  if (Result.isFailure(stored)) {
    return {};
  }
  const storedFormat = coerceLinkFormat(stored.value.linkFormat);
  return storedFormat ? { format: storedFormat } : {};
}

export function CreateLinkPane(props: CreateLinkPaneProps): React.JSX.Element {
  const { initialFormat, initialLink, notify, runtime } = props;
  const [title, setTitle] = useState(initialLink?.title ?? "");
  const [url, setUrl] = useState(initialLink?.url ?? "");
  const [format, setFormat] = useState<LinkFormat>(initialFormat ?? "markdown");
  const [showQr, setShowQr] = useState(false);

  const titleInputId = useId();
  const urlInputId = useId();
  const formatLabelId = useId();
  const formatTriggerId = useId();

  const output = useMemo(
    () => formatLink({ title, url }, format),
    [format, title, url]
  );
  const canCopy = Boolean(output.trim());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [linkState, formatState] = await Promise.all([
        resolveInitialLinkState(runtime, initialLink),
        resolveInitialFormatState(runtime, initialFormat),
      ]);

      if (cancelled) {
        return;
      }
      const nextState = { ...linkState, ...formatState };
      if (nextState.title !== undefined) {
        setTitle(nextState.title);
      }
      if (nextState.url !== undefined) {
        setUrl(nextState.url);
      }
      if (nextState.format !== undefined) {
        setFormat(nextState.format);
      }
    })().catch((error) => {
      debugLog(
        "CreateLinkPane.useEffect[initial]",
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
  }, [initialFormat, initialLink, runtime]);

  const drawQrCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) {
        return;
      }
      const trimmedUrl = url.trim();
      if (!(showQr && trimmedUrl)) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      QRCode.toCanvas(canvas, trimmedUrl, { width: 200, margin: 2 }).catch(
        () => {
          notify.error("QRコードの生成に失敗しました");
        }
      );
    },
    [notify, showQr, url]
  );

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
        persist: () => runtime.storageSyncSet({ linkFormat: next }),
        onFailure: () => {
          notify.error("形式の保存に失敗しました");
        },
      });
    },
    [format, notify, runtime]
  );

  const copyOutput = async (): Promise<void> => {
    const text = output.trim();
    if (!text) {
      notify.error(url.trim() ? "コピーする内容がありません" : "URLが空です");
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
            <canvas ref={drawQrCanvas} />
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
