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
  const result = await storageLocalGet<{ overlayTheme?: unknown }>([
    "overlayTheme",
  ]);
  if (Result.isFailure(result)) {
    return fallback;
  }
  const { overlayTheme } = result.value;
  return normalizeTheme(overlayTheme);
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
