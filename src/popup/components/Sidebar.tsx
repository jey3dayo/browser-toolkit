import { Dialog, Tabs } from "@base-ui/react";
import { Button } from "@base-ui/react/button";
import { Icon } from "@/components/icon";
import { navigationItems } from "@/popup/navigation-items";
import type { PaneId } from "@/popup/panes";

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
      <Dialog.Root onOpenChange={onMenuOpenChange} open={menuOpen}>
        <Dialog.Trigger aria-label="メニュー" className="sidebar-brand">
          <Icon aria-hidden="true" name="menu" />
        </Dialog.Trigger>
        <Tabs.List>
          {navigationItems.map((item) => (
            <Tabs.Tab
              aria-label={item.ariaLabel}
              className="nav-item"
              data-tooltip={item.label}
              data-value={item.id}
              key={item.id}
              value={item.id}
            >
              <span aria-hidden="true" className="nav-icon">
                <Icon aria-hidden="true" name={item.icon} />
              </span>
              <span className="nav-label">{item.label}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Dialog.Portal>
          <Dialog.Backdrop className="menu-scrim mbu-drawer-backdrop" />
          <Dialog.Popup aria-label="メニュー" className="menu-drawer">
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
                  className={
                    currentPane === item.id ? "menu-item active" : "menu-item"
                  }
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
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </aside>
  );
}
