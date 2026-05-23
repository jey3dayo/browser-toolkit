import { Result } from "@praha/byethrow";
import QRCode from "qrcode";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { i18n, type TranslationKey } from "@/i18n";
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

const LINK_FORMAT_LABEL_KEYS: Record<LinkFormat, TranslationKey> = {
  bbcode: "linkFormat.bbcode",
  html: "linkFormat.html",
  markdown: "linkFormat.markdown",
  org: "linkFormat.org",
  text: "linkFormat.text",
  url: "linkFormat.url",
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
  const { t } = useTranslation(undefined, { i18n });
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
          notify.error(t("createLink.errors.qrGeneration"));
        }
      );
    },
    [notify, showQr, t, url]
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
          notify.error(t("createLink.errors.formatSave"));
        },
      });
    },
    [format, notify, runtime, t]
  );

  const copyOutput = async (): Promise<void> => {
    const text = output.trim();
    if (!text) {
      notify.error(
        url.trim()
          ? t("createLink.errors.emptyContent")
          : t("createLink.errors.emptyUrl")
      );
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        notify.error(t("createLink.errors.clipboardUnavailable"));
        return;
      }
      await navigator.clipboard.writeText(text);
      notify.success(t("createLink.success.copied"));
    } catch {
      notify.error(t("createLink.errors.copyFailed"));
    }
  };

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>{t("createLink.title")}</PaneTitle>
        <ButtonRow>
          <Button
            data-testid="create-link-qr"
            disabled={!url.trim()}
            onClick={() => {
              setShowQr((prev) => !prev);
            }}
            size="small"
            title={t("createLink.qrCode")}
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
            {t("createLink.copy")}
          </Button>
        </ButtonRow>
      </RowBetween>

      <Hint>{t("createLink.description")}</Hint>

      <Stack>
        <Field htmlFor={titleInputId} label={t("createLink.fields.title")}>
          <Input
            data-testid="create-link-title"
            id={titleInputId}
            onValueChange={setTitle}
            value={title}
            variant="token"
          />
        </Field>

        <Field htmlFor={urlInputId} label={t("createLink.fields.url")}>
          <Input
            data-testid="create-link-url"
            id={urlInputId}
            onValueChange={setUrl}
            value={url}
            variant="token"
          />
        </Field>

        <Field
          htmlFor={formatTriggerId}
          label={t("createLink.fields.format")}
          labelId={formatLabelId}
        >
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
              label: t(LINK_FORMAT_LABEL_KEYS[option.value]),
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
          <MetaTitle>{t("createLink.panels.qrCode")}</MetaTitle>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <canvas ref={drawQrCanvas} />
          </div>
        </OutputPanel>
      ) : null}

      <OutputPanel>
        <RowBetween>
          <MetaTitle>{t("createLink.panels.preview")}</MetaTitle>
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
