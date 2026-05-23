import { useEffect, useState } from "react";
import { overlayClassNames } from "@/content/overlay/overlayClassNames";

type Props = {
  summary: string;
  text: string;
  defaultOpen?: boolean;
  storageKey?: string;
};

export function AuxTextDisclosure(props: Props): React.JSX.Element | null {
  const trimmed = props.text.trim();
  const fallbackOpen = props.defaultOpen ?? false;
  const [open, setOpen] = useState(fallbackOpen);

  useEffect(() => {
    let disposed = false;
    const storageKey = props.storageKey;
    if (!storageKey) {
      setOpen(fallbackOpen);
      return () => {
        disposed = true;
      };
    }
    if (typeof chrome === "undefined") {
      setOpen(fallbackOpen);
      return () => {
        disposed = true;
      };
    }
    const storage = chrome.storage?.local;
    if (!storage) {
      setOpen(fallbackOpen);
      return () => {
        disposed = true;
      };
    }

    storage.get([storageKey], (items) => {
      if (disposed) {
        return;
      }
      const err = chrome.runtime?.lastError;
      if (err) {
        setOpen(fallbackOpen);
        return;
      }
      const value = (items as Record<string, unknown>)[storageKey];
      setOpen(typeof value === "boolean" ? value : fallbackOpen);
    });

    return () => {
      disposed = true;
    };
  }, [fallbackOpen, props.storageKey]);

  const handleToggle = (
    event: React.SyntheticEvent<HTMLDetailsElement>
  ): void => {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);

    const storageKey = props.storageKey;
    if (!storageKey) {
      return;
    }
    if (typeof chrome === "undefined") {
      return;
    }
    const storage = chrome.storage?.local;
    if (!storage) {
      return;
    }
    storage.set({ [storageKey]: nextOpen }, () => {
      // no-op
    });
  };

  if (!trimmed) {
    return null;
  }

  return (
    <details
      className={overlayClassNames.aux}
      onToggle={handleToggle}
      open={open}
    >
      <summary className={overlayClassNames.auxSummary}>
        {props.summary}
      </summary>
      <blockquote className={overlayClassNames.quote}>{trimmed}</blockquote>
    </details>
  );
}
