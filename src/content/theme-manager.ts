import type { GlobalContentState } from "@/content/types";
import { applyTheme, type Theme } from "@/ui/theme";
import { loadStoredTheme, subscribeStoredTheme } from "@/ui/themeStorage";

export type ThemeManager = {
  getCurrentTheme: () => Theme;
  refreshThemeFromStorage: () => Promise<void>;
  setupStorageListener: () => void;
};

export function createThemeManager(
  globalState: GlobalContentState
): ThemeManager {
  let currentTheme: Theme = "auto";

  function applyThemeToMounts(): void {
    if (globalState.toastMount?.host.isConnected) {
      applyTheme(currentTheme, globalState.toastMount.shadow);
    }
    if (globalState.overlayMount?.host.isConnected) {
      applyTheme(currentTheme, globalState.overlayMount.shadow);
    }
  }

  async function refreshThemeFromStorage(): Promise<void> {
    currentTheme = await loadStoredTheme("auto");
    applyThemeToMounts();
  }

  function setupStorageListener(): void {
    subscribeStoredTheme((theme) => {
      currentTheme = theme;
      applyThemeToMounts();
    });
  }

  return {
    getCurrentTheme: () => currentTheme,
    refreshThemeFromStorage,
    setupStorageListener,
  };
}
