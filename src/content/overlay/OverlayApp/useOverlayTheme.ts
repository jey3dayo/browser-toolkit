import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "@/ui/theme";
import {
  loadStoredTheme,
  subscribeStoredTheme,
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

    const unsubscribe = subscribeStoredTheme((nextTheme) => {
      setTheme(nextTheme);
      applyTheme(nextTheme, portalContainer);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [host, portalContainer]);

  return [theme, setTheme];
}
