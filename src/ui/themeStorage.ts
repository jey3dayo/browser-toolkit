import { Result } from "@praha/byethrow";
import { storageLocalGet } from "@/storage/helpers";
import { isTheme, type Theme } from "@/ui/theme";

export function normalizeTheme(value: unknown): Theme {
  return isTheme(value) ? value : "auto";
}

export function themeFromHost(host: HTMLElement | null): Theme {
  if (!host) {
    return "auto";
  }
  return normalizeTheme(host.getAttribute("data-theme"));
}

export async function loadStoredTheme(fallback: Theme): Promise<Theme> {
  if (typeof chrome === "undefined") {
    return fallback;
  }
  const storage = chrome.storage?.local;
  if (!storage) {
    return fallback;
  }

  const result = await storageLocalGet<{ theme?: unknown }>(["theme"]);
  if (Result.isFailure(result)) {
    return fallback;
  }
  const { theme } = result.value;
  return normalizeTheme(theme);
}

export function persistTheme(theme: Theme): Promise<void> {
  if (typeof chrome === "undefined") {
    return Promise.resolve();
  }
  const storage = chrome.storage?.local;
  if (!storage) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    storage.set({ theme }, () => {
      resolve();
    });
  });
}

/**
 * Subscribe to stored theme changes (chrome.storage.local "theme").
 * Returns an unsubscribe function; a no-op unsubscribe when storage
 * change events are unavailable.
 */
export function subscribeStoredTheme(
  onThemeChange: (theme: Theme) => void
): () => void {
  if (typeof chrome === "undefined") {
    return () => {
      // no-op
    };
  }
  const onChanged = chrome.storage?.onChanged;
  if (!onChanged?.addListener) {
    return () => {
      // no-op
    };
  }

  const handleChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ): void => {
    if (areaName !== "local" || !("theme" in changes)) {
      return;
    }
    onThemeChange(normalizeTheme(changes.theme?.newValue));
  };

  onChanged.addListener(handleChange);
  return () => {
    onChanged.removeListener?.(handleChange);
  };
}
