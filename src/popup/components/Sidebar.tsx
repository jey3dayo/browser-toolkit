import { cva } from "class-variance-authority";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { DrawerDialog } from "@/components/shared/Dialog";
import { TabsList, TabsTab } from "@/components/shared/Tabs";
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
  return (
    <aside aria-label="メニュー" className="sidebar">
      <DrawerDialog
        backdropClassName="menu-scrim mbu-drawer-backdrop"
        onOpenChange={onMenuOpenChange}
        open={menuOpen}
        popupAriaLabel="メニュー"
        popupClassName="menu-drawer"
        trigger={<Icon aria-hidden="true" name="menu" />}
        triggerAriaLabel="メニュー"
        triggerClassName="sidebar-brand"
      >
        <div className="menu-drawer-header">
          <h2 className="menu-drawer-title">メニュー</h2>
          <Button
            aria-label="閉じる"
            className="menu-close"
            onClick={() => onMenuOpenChange(false)}
            type="button"
          >
            <Icon aria-hidden="true" name="close" />
          </Button>
        </div>
        <nav className="menu-drawer-nav">
          {navigationItems.map((item) => (
            <Button
              aria-current={currentPane === item.id ? "page" : undefined}
              className={menuItemVariants({ active: currentPane === item.id })}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <span aria-hidden="true" className="menu-icon">
                <Icon aria-hidden="true" name={item.icon} />
              </span>
              {item.label}
            </Button>
          ))}
        </nav>
      </DrawerDialog>
      <TabsList>
        {navigationItems.map((item) => (
          <TabsTab
            aria-label={item.ariaLabel}
            data-tooltip={item.label}
            data-value={item.id}
            key={item.id}
            value={item.id}
            variant="nav"
          >
            <span aria-hidden="true" className="nav-icon">
              <Icon aria-hidden="true" name={item.icon} />
            </span>
            <span className="nav-label">{item.label}</span>
          </TabsTab>
        ))}
      </TabsList>
    </aside>
  );
}
