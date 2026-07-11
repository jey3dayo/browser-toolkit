import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { ButtonRow } from "@/components/shared/Layout";

export type SettingsPaneCardSection =
  | "provider"
  | "token"
  | "model"
  | "prompt"
  | "theme";

export type SettingsPaneCardProps = {
  children: React.ReactNode;
  section: SettingsPaneCardSection;
};

const settingsPaneCardClassName = cva("card settings-card settings-pane-card");
const settingsPaneOverviewClassName = cva("stack-sm settings-pane-overview");

export function SettingsPaneCard({
  children,
  section,
}: SettingsPaneCardProps): React.JSX.Element {
  return (
    <section
      className={settingsPaneCardClassName()}
      data-section={section}
      data-testid="settings-card"
    >
      {children}
    </section>
  );
}

export function SettingsPaneOverview({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      className={settingsPaneOverviewClassName({ className })}
      data-testid="settings-overview"
      {...props}
    />
  );
}

const settingsTokenActionRowVariants = cva("", {
  variants: {
    tone: {
      danger: "settings-token-danger-actions",
      primary: "settings-token-primary-actions",
    },
  },
});

export type SettingsTokenActionRowProps = React.ComponentProps<
  typeof ButtonRow
> &
  VariantProps<typeof settingsTokenActionRowVariants>;

export function SettingsTokenActionRow({
  className,
  tone,
  ...props
}: SettingsTokenActionRowProps): React.JSX.Element {
  return (
    <ButtonRow
      className={settingsTokenActionRowVariants({ className, tone })}
      {...props}
    />
  );
}

export const settingsThemeOptionGroupVariants = cva("stack-sm", {
  variants: {
    variant: {
      auto: "settings-theme-auto-option",
      primary: "settings-theme-primary-options",
    },
  },
});
