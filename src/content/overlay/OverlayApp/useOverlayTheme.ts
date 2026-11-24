import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "@/ui/theme";
import {
  loadStoredTheme,
  subscribeStoredTheme,
  themeFromHost,
} from "@/ui/themeStorage";

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
      .catch(() => {});

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
