import { cva } from "class-variance-authority";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { DrawerDialog } from "@/components/shared/Dialog";
import { TabsList, TabsTab } from "@/components/shared/Tabs";
import { i18n } from "@/i18n";
import { navigationItems } from "@/popup/navigation-items";
import type { PaneId } from "@/popup/panes";

const menuItemVariants = cva("menu-item", {
  variants: {
    active: {
      false: null,
      true: "active",
    },
  },
});

type SidebarProps = {
  currentPane: PaneId;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onNavigate: (paneId: PaneId) => void;
};

type SidebarMenuItemProps = {
  active: boolean;
  icon: IconName;
  id: PaneId;
  label: string;
  onNavigate: (paneId: PaneId) => void;
};

function SidebarMenuItem({
  active,
  icon,
  id,
  label,
  onNavigate,
}: SidebarMenuItemProps): React.JSX.Element {
  const handleClick = useCallback(() => {
    onNavigate(id);
  }, [id, onNavigate]);

  return (
    <Button
      aria-current={active ? "page" : undefined}
      className={menuItemVariants({ active })}
      onClick={handleClick}
      type="button"
    >
      <span aria-hidden="true" className="menu-icon">
        <Icon aria-hidden="true" name={icon} />
      </span>
      {label}
    </Button>
  );
}

export function Sidebar({
  currentPane,
  menuOpen,
  onMenuOpenChange,
  onNavigate,
}: SidebarProps): React.JSX.Element {
  const { t } = useTranslation(undefined, { i18n });
  const menuLabel = t("sidebar.menu");
  const closeLabel = t("common.close");

  const handleCloseClick = useCallback(() => {
    onMenuOpenChange(false);
  }, [onMenuOpenChange]);

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
          <h2 className="menu-drawer-title">{menuLabel}</h2>
          <Button
            aria-label={closeLabel}
            className="menu-close"
            onClick={handleCloseClick}
            type="button"
          >
            <Icon aria-hidden="true" name="close" />
          </Button>
        </div>
        <nav className="menu-drawer-nav">
          {navigationItems.map((item) => {
            const label = t(item.labelKey);

            return (
              <SidebarMenuItem
                active={currentPane === item.id}
                icon={item.icon}
                id={item.id}
                key={item.id}
                label={label}
                onNavigate={onNavigate}
              />
            );
          })}
        </nav>
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
