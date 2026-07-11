import { RadioFieldset } from "@/components/shared/RadioFieldset";
import { t } from "@/i18n";
import {
  SettingsPaneCard,
  settingsThemeOptionGroupVariants,
} from "@/popup/panes/settings/SettingsPaneLayout";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";

export type SettingsThemeSectionProps = {
  theme: Theme;
  setTheme: (value: Theme) => void;
  saveTheme: (value: Theme) => Promise<void>;
};

export function SettingsThemeSection({
  theme,
  setTheme,
  saveTheme,
}: SettingsThemeSectionProps): React.JSX.Element {
  return (
    <SettingsPaneCard section="theme">
      <RadioFieldset
        groups={[
          {
            className: settingsThemeOptionGroupVariants({
              variant: "primary",
            }),
            options: [
              { label: t("theme.dark"), value: "dark" },
              { label: t("theme.light"), value: "light" },
            ],
            testId: "theme-primary-options",
          },
          {
            className: settingsThemeOptionGroupVariants({
              variant: "auto",
            }),
            options: [{ label: t("theme.auto"), value: "auto" }],
            testId: "theme-auto-option",
          },
        ]}
        legend={t("settings.theme")}
        name="theme"
        onValueChange={(value) => {
          if (!isTheme(value)) {
            return;
          }
          setTheme(value);
          applyTheme(value, document);
          saveTheme(value).catch(() => {
            // no-op
          });
        }}
        value={theme}
      />
    </SettingsPaneCard>
  );
}
