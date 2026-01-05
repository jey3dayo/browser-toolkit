import { Accordion } from "@base-ui/react/accordion";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { SummaryTarget } from "@/popup/runtime";

type Props = {
  sourceLabel: string;
  target: SummaryTarget;
};

const MAX_PREVIEW_CHARS = 4000;

export function ActionTargetAccordion(props: Props): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);

  const trimmed = props.target.text.trim();
  if (!trimmed) {
    return null;
  }

  const label =
    props.target.source === "selection" ? "選択したテキスト" : "ページ本文";
  const isTruncated = trimmed.length > MAX_PREVIEW_CHARS;
  const previewText = isTruncated
    ? `${trimmed.slice(0, MAX_PREVIEW_CHARS)}\n\n(以下省略)`
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
    <Accordion.Root className="mbu-accordion" defaultValue={["target"]}>
      <Accordion.Item className="mbu-accordion-item" value="target">
        <Accordion.Header className="mbu-accordion-header">
          <Accordion.Trigger className="mbu-accordion-trigger" type="button">
            <span className="mbu-accordion-title">{label}</span>
            <span aria-hidden="true" className="mbu-accordion-icon">
              ▾
            </span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel className="mbu-accordion-panel">
          <div className="mbu-accordion-meta">使用元: {props.sourceLabel}</div>
          {isTruncated ? (
            <div className="mbu-accordion-note">
              長文のため先頭4,000文字のみ表示
            </div>
          ) : null}
          <div className="mbu-accordion-text-wrapper">
            <textarea
              className="summary-output summary-output--sm mbu-accordion-text"
              readOnly
              value={previewText}
            />
            <button
              aria-label={copied ? "コピーしました" : "テキストをコピー"}
              className="mbu-accordion-copy-btn"
              disabled={!previewText.trim()}
              onClick={handleCopy}
              type="button"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}
