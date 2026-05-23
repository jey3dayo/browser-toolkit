import { useEffect, useState } from "react";
import { overlayClassNames } from "@/content/overlay/overlayClassNames";

type Props = {
  summary: string;
  text: string;
  defaultOpen?: boolean;
  storageKey?: string;
};

function loadStoredOpen(
  storageKey: string | undefined,
  fallbackOpen: boolean
): Promise<boolean> {
  if (!storageKey || typeof chrome === "undefined") {
    return Promise.resolve(fallbackOpen);
  }
  const storage = chrome.storage?.local;
  if (!storage) {
    return Promise.resolve(fallbackOpen);
  }

  return new Promise((resolve) => {
    storage.get([storageKey], (items) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        resolve(fallbackOpen);
        return;
      }
      const value = (items as Record<string, unknown>)[storageKey];
      resolve(typeof value === "boolean" ? value : fallbackOpen);
    });
  });
}

export function AuxTextDisclosure(props: Props): React.JSX.Element | null {
  const trimmed = props.text.trim();
  const fallbackOpen = props.defaultOpen ?? false;
  const [open, setOpen] = useState(fallbackOpen);

  useEffect(() => {
    let disposed = false;
    loadStoredOpen(props.storageKey, fallbackOpen)
      .then((nextOpen) => {
        if (disposed) {
          return;
        }
        setOpen(nextOpen);
      })
      .catch(() => {
        if (disposed) {
          return;
        }
        setOpen(fallbackOpen);
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
