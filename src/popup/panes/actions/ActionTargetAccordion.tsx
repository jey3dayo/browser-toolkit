import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Accordion,
  AccordionMeta,
  AccordionNote,
  AccordionText,
  AccordionTextWrapper,
} from "@/components/shared/Accordion";
import { Button } from "@/components/shared/Button";
import { t } from "@/i18n";
import type { SummaryTarget } from "@/popup/runtime";

type Props = {
  sourceLabel: string;
  target: SummaryTarget;
};

type ActionTargetPreviewProps = {
  copied: boolean;
  isTruncated: boolean;
  onCopy: () => void;
  previewText: string;
  sourceLabel: string;
};

const MAX_PREVIEW_CHARS = 4000;

function ActionTargetPreview(
  props: ActionTargetPreviewProps
): React.JSX.Element {
  return (
    <>
      <AccordionMeta>
        {t("actions.target.source", { source: props.sourceLabel })}
      </AccordionMeta>
      {props.isTruncated ? (
        <AccordionNote>{t("actions.target.truncated")}</AccordionNote>
      ) : null}
      <AccordionTextWrapper>
        <AccordionText
          readOnly
          size="small"
          value={props.previewText}
          variant="summary"
        />
        <Button
          aria-label={
            props.copied
              ? t("actions.target.copiedAriaLabel")
              : t("actions.target.copyTextAriaLabel")
          }
          disabled={!props.previewText.trim()}
          onClick={props.onCopy}
          type="button"
          variant="accordionCopy"
        >
          <Icon
            aria-hidden="true"
            name={props.copied ? "check" : "copy"}
            size={14}
          />
        </Button>
      </AccordionTextWrapper>
    </>
  );
}

export function ActionTargetAccordion(props: Props): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);

  const trimmed = props.target.text.trim();
  if (!trimmed) {
    return null;
  }

  const label =
    props.target.source === "selection"
      ? t("actions.target.selectionTitle")
      : t("actions.target.pageTitle");
  const isTruncated = trimmed.length > MAX_PREVIEW_CHARS;
  const previewText = isTruncated
    ? `${trimmed.slice(0, MAX_PREVIEW_CHARS)}\n\n${t("actions.target.omitted")}`
    : trimmed;

  const handleCopy = async (): Promise<void> => {
    const text = previewText.trim();
    if (!text) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        console.error("Clipboard API not available");
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <Accordion itemValue="target" title={label}>
      <ActionTargetPreview
        copied={copied}
        isTruncated={isTruncated}
        onCopy={handleCopy}
        previewText={previewText}
        sourceLabel={props.sourceLabel}
      />
    </Accordion>
  );
}
