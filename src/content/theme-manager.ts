// テーマ管理
import { Result } from "@praha/byethrow";
import type { GlobalContentState } from "@/content/types";
import { storageLocalGet } from "@/storage/helpers";
import { applyTheme, type Theme } from "@/ui/theme";
import { normalizeTheme } from "@/ui/themeStorage";

export type ThemeManager = {
  getCurrentTheme: () => Theme;
  refreshThemeFromStorage: () => Promise<void>;
  handleThemeChange: (newValue: unknown) => void;
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
    const result = await storageLocalGet<{ theme?: unknown }>(["theme"]);
    if (Result.isSuccess(result)) {
      currentTheme = normalizeTheme(result.value.theme);
    } else {
      currentTheme = "auto";
    }
    applyThemeToMounts();
  }

  function handleThemeChange(newValue: unknown): void {
    currentTheme = normalizeTheme(newValue);
    applyThemeToMounts();
  }

  return {
    getCurrentTheme: () => currentTheme,
    refreshThemeFromStorage,
    handleThemeChange,
  };
}
