import { type TranslationKey, t } from "@/i18n";
import type { Theme } from "@/ui/theme";

const THEME_SEQUENCE: Theme[] = ["auto", "light", "dark"];
const THEME_LABEL_KEYS: Record<Theme, TranslationKey> = {
  auto: "theme.auto",
  light: "theme.light",
  dark: "theme.dark",
};

export function themeLabel(theme: Theme): string {
  return t(THEME_LABEL_KEYS[theme]);
}

export function nextTheme(theme: Theme): Theme {
  const index = THEME_SEQUENCE.indexOf(theme);
  const nextIndex = index >= 0 ? (index + 1) % THEME_SEQUENCE.length : 0;
  return THEME_SEQUENCE[nextIndex] ?? "auto";
}

export function themeButtonLabel(theme: Theme): string {
  const next = nextTheme(theme);
  return t("theme.buttonLabel", {
    current: themeLabel(theme),
    next: themeLabel(next),
  });
}
