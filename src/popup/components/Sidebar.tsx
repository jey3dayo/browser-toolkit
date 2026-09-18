import { useTranslation } from "react-i18next";
import { APP_NAME } from "@/app_meta";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { TabsList, TabsTab } from "@/components/shared/Tabs";
import { i18n } from "@/i18n";
import { getNavigationItems } from "@/popup/navigation-items";
import type { PaneSurface } from "@/popup/panes";

export type SidebarProps = {
  surface: PaneSurface;
  onOpenOptions: () => void;
};

export function Sidebar({
  surface,
  onOpenOptions,
}: SidebarProps): React.JSX.Element {
  const { t } = useTranslation(undefined, { i18n });
  const items = getNavigationItems(surface);

  return (
    <aside aria-label={t("sidebar.menu")} className="sidebar">
      <div className="sidebar-brand">
        <img alt={APP_NAME} height={28} src="images/icon48.png" width={28} />
      </div>
      <TabsList className="nav-list">
        {items.map((item) => (
          <TabsTab
            aria-label={t(item.ariaLabelKey)}
            data-value={item.id}
            key={item.id}
            value={item.id}
            variant="nav"
          >
            <span aria-hidden="true" className="nav-icon">
              <Icon aria-hidden="true" name={item.icon} />
            </span>
            <span className="nav-label">{t(item.labelKey)}</span>
          </TabsTab>
        ))}
      </TabsList>
      {surface === "popup" ? (
        <>
          <div aria-hidden="true" className="nav-group-separator" />
          <Button
            aria-label={t("navigation.settings")}
            data-value="open-options"
            onClick={onOpenOptions}
            variant="nav"
          >
            <span aria-hidden="true" className="nav-icon">
              <Icon aria-hidden="true" name="settings" />
            </span>
            <span className="nav-label">{t("navigation.settings")}</span>
          </Button>
        </>
      ) : null}
    </aside>
  );
}
