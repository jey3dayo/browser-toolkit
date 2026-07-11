import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "@/ui/theme";
import {
  loadStoredTheme,
  normalizeTheme,
  themeFromHost,
} from "@/ui/themeStorage";

/**
 * Manage overlay theme state: initial value from host dataset, async load
 * from storage, and live sync with chrome.storage.onChanged.
 */
export function useOverlayTheme(
  host: HTMLDivElement,
  portalContainer: ShadowRoot
): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => themeFromHost(host));

  useEffect(() => {
    let disposed = false;
    const fallback = themeFromHost(host);

    loadStoredTheme(fallback)
      .then((storedTheme) => {
        if (disposed) {
          return;
        }
        setTheme(storedTheme);
        applyTheme(storedTheme, portalContainer);
      })
      .catch(() => {
        // no-op
      });

    if (typeof chrome === "undefined") {
      return () => {
        disposed = true;
      };
    }

    const onChanged = chrome.storage?.onChanged;
    if (!onChanged?.addListener) {
      return () => {
        disposed = true;
      };
    }

    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      if (areaName !== "local") {
        return;
      }
      if (!("theme" in changes)) {
        return;
      }
      const change = changes.theme as chrome.storage.StorageChange | undefined;
      const nextValue = normalizeTheme(change?.newValue);
      setTheme(nextValue);
      applyTheme(nextValue, portalContainer);
    };

    onChanged.addListener(handleChange);

    return () => {
      disposed = true;
      onChanged.removeListener?.(handleChange);
    };
  }, [host, portalContainer]);

  return [theme, setTheme];
}
