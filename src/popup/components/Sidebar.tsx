import { cva } from "class-variance-authority";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { DrawerDialog } from "@/components/shared/Dialog";
import { TabsList, TabsTab } from "@/components/shared/Tabs";
import { i18n } from "@/i18n";
import { navigationItems } from "@/popup/navigation-items";
import type { PaneId } from "@/popup/panes";

const menuItemVariants = cva("menu-item", {
  variants: {
    active: {
      true: "active",
      false: null,
    },
  },
});

type SidebarProps = {
  currentPane: PaneId;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onNavigate: (paneId: PaneId) => void;
};

export function Sidebar({
  currentPane,
  menuOpen,
  onMenuOpenChange,
  onNavigate,
}: SidebarProps): React.JSX.Element {
  const { t } = useTranslation(undefined, { i18n });
  const menuLabel = t("sidebar.menu");
  const closeLabel = t("common.close");
  const primaryNavigationItems = navigationItems.filter(
    (item) => item.id !== "pane-settings"
  );
  const settingsNavigationItem = navigationItems.find(
    (item) => item.id === "pane-settings"
  );

  return (
    <aside aria-label={menuLabel} className="sidebar">
      <DrawerDialog
        backdropClassName="menu-scrim mbu-drawer-backdrop"
        onOpenChange={onMenuOpenChange}
        open={menuOpen}
        popupAriaLabel={menuLabel}
        popupClassName="menu-drawer"
        trigger={<Icon aria-hidden="true" name="menu" />}
        triggerAriaLabel={menuLabel}
        triggerClassName="sidebar-brand"
      >
        <div className="menu-drawer-header">
          <Button
            aria-label={closeLabel}
            className="menu-close"
            onClick={() => onMenuOpenChange(false)}
            type="button"
          >
            <Icon aria-hidden="true" name="close" />
          </Button>
        </div>
        <nav className="menu-drawer-nav">
          {primaryNavigationItems.map((item) => {
            const label = t(item.labelKey);

            return (
              <Button
                aria-current={currentPane === item.id ? "page" : undefined}
                className={menuItemVariants({
                  active: currentPane === item.id,
                })}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <span aria-hidden="true" className="menu-icon">
                  <Icon aria-hidden="true" name={item.icon} />
                </span>
                {label}
              </Button>
            );
          })}
        </nav>
        {settingsNavigationItem ? (
          <nav className="menu-drawer-footer">
            <Button
              aria-current={
                currentPane === settingsNavigationItem.id ? "page" : undefined
              }
              className={menuItemVariants({
                active: currentPane === settingsNavigationItem.id,
              })}
              onClick={() => onNavigate(settingsNavigationItem.id)}
              type="button"
            >
              <span aria-hidden="true" className="menu-icon">
                <Icon aria-hidden="true" name={settingsNavigationItem.icon} />
              </span>
              {t(settingsNavigationItem.labelKey)}
            </Button>
          </nav>
        ) : null}
      </DrawerDialog>
      <TabsList>
        {navigationItems.map((item) => {
          const label = t(item.labelKey);
          const ariaLabel = t(item.ariaLabelKey);

          return (
            <TabsTab
              aria-label={ariaLabel}
              data-tooltip={label}
              data-value={item.id}
              key={item.id}
              value={item.id}
              variant="nav"
            >
              <span aria-hidden="true" className="nav-icon">
                <Icon aria-hidden="true" name={item.icon} />
              </span>
              <span className="nav-label">{label}</span>
            </TabsTab>
          );
        })}
      </TabsList>
    </aside>
  );
}
